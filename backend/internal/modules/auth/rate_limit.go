package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	rediswrapper "educore/internal/pkg/redis"

	"github.com/gofiber/fiber/v2"
)

const maxInMemoryRateLimitBuckets = 100000

type authRateLimitConfig struct {
	Window             time.Duration
	LoginIPLimit       int
	LoginSubjectLimit  int
	ForgotIPLimit      int
	ForgotSubjectLimit int
	ResetIPLimit       int
	ResetSubjectLimit  int
}

type authRateLimitBucket struct {
	count   int
	resetAt time.Time
}

type authRateLimiter struct {
	redis   *rediswrapper.Client
	mu      sync.Mutex
	buckets map[string]authRateLimitBucket
	now     func() time.Time
}

type authRateLimitRule struct {
	name         string
	ipLimit      int
	subjectLimit int
	window       time.Duration
	subject      func(*fiber.Ctx) string
}

func loadAuthRateLimitConfig() authRateLimitConfig {
	return authRateLimitConfig{
		Window:             envDuration("AUTH_RATE_LIMIT_WINDOW", 15*time.Minute),
		LoginIPLimit:       envPositiveInt("AUTH_LOGIN_IP_LIMIT", 60),
		LoginSubjectLimit:  envPositiveInt("AUTH_LOGIN_SUBJECT_LIMIT", 10),
		ForgotIPLimit:      envPositiveInt("AUTH_FORGOT_IP_LIMIT", 60),
		ForgotSubjectLimit: envPositiveInt("AUTH_FORGOT_SUBJECT_LIMIT", 5),
		ResetIPLimit:       envPositiveInt("AUTH_RESET_IP_LIMIT", 60),
		ResetSubjectLimit:  envPositiveInt("AUTH_RESET_SUBJECT_LIMIT", 10),
	}
}

func envPositiveInt(name string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(name)))
	if err != nil || value <= 0 || value > 100000 {
		return fallback
	}
	return value
}

func envDuration(name string, fallback time.Duration) time.Duration {
	value, err := time.ParseDuration(strings.TrimSpace(os.Getenv(name)))
	if err != nil || value < time.Second || value > 24*time.Hour {
		return fallback
	}
	return value
}

func newAuthRateLimiter(redisClient *rediswrapper.Client) *authRateLimiter {
	return &authRateLimiter{
		redis: redisClient, buckets: make(map[string]authRateLimitBucket), now: time.Now,
	}
}

func (limiter *authRateLimiter) middleware(rule authRateLimitRule) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if limiter == nil {
			return c.Next()
		}
		ipKey := limiter.key(rule.name, "ip", c.IP())
		if allowed := limiter.allow(c.UserContext(), ipKey, rule.ipLimit, rule.window); !allowed {
			return rateLimitExceeded(c, rule.window)
		}
		if rule.subject != nil {
			if subject := strings.TrimSpace(rule.subject(c)); subject != "" {
				subjectKey := limiter.key(rule.name, "subject", subject)
				if allowed := limiter.allow(c.UserContext(), subjectKey, rule.subjectLimit, rule.window); !allowed {
					return rateLimitExceeded(c, rule.window)
				}
			}
		}
		return c.Next()
	}
}

func (limiter *authRateLimiter) key(route, dimension, value string) string {
	digest := sha256.Sum256([]byte(strings.TrimSpace(strings.ToLower(value))))
	return "educore:rate-limit:auth:" + route + ":" + dimension + ":" + hex.EncodeToString(digest[:])
}

func (limiter *authRateLimiter) allow(ctx context.Context, key string, limit int, window time.Duration) bool {
	if limit <= 0 || window <= 0 {
		return false
	}
	if limiter.redis != nil && limiter.redis.IsAvailable() {
		const incrementWithExpiry = `
			local current = redis.call('INCR', KEYS[1])
			if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
			return current`
		count, err := limiter.redis.GetClient().Eval(ctx, incrementWithExpiry, []string{key}, limit, window.Milliseconds()).Int64()
		if err == nil {
			return count <= int64(limit)
		}
	}
	return limiter.allowMemory(key, limit, window)
}

func (limiter *authRateLimiter) allowMemory(key string, limit int, window time.Duration) bool {
	now := limiter.now()
	limiter.mu.Lock()
	defer limiter.mu.Unlock()

	bucket, exists := limiter.buckets[key]
	if !exists || !now.Before(bucket.resetAt) {
		if !exists && len(limiter.buckets) >= maxInMemoryRateLimitBuckets {
			limiter.removeExpiredBuckets(now)
			if len(limiter.buckets) >= maxInMemoryRateLimitBuckets {
				return false
			}
		}
		limiter.buckets[key] = authRateLimitBucket{count: 1, resetAt: now.Add(window)}
		return true
	}
	bucket.count++
	limiter.buckets[key] = bucket
	return bucket.count <= limit
}

func (limiter *authRateLimiter) removeExpiredBuckets(now time.Time) {
	for key, bucket := range limiter.buckets {
		if !now.Before(bucket.resetAt) {
			delete(limiter.buckets, key)
		}
	}
}

func rateLimitExceeded(c *fiber.Ctx, window time.Duration) error {
	retrySeconds := int(window.Round(time.Second).Seconds())
	if retrySeconds < 1 {
		retrySeconds = 1
	}
	c.Set(fiber.HeaderRetryAfter, strconv.Itoa(retrySeconds))
	return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
		"success": false,
		"code":    "RATE_LIMITED",
		"error":   "Demasiados intentos. Espera antes de volver a intentarlo.",
	})
}

func loginRateLimitSubject(c *fiber.Ctx) string {
	var request struct {
		Email      string `json:"email"`
		TenantSlug string `json:"tenant_slug"`
	}
	if json.Unmarshal(c.Body(), &request) != nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(request.Email)) + "|" + strings.ToLower(strings.TrimSpace(request.TenantSlug))
}

func forgotRateLimitSubject(c *fiber.Ctx) string {
	return loginRateLimitSubject(c)
}

func resetRateLimitSubject(c *fiber.Ctx) string {
	var request struct {
		Token      string `json:"token"`
		TenantSlug string `json:"tenant_slug"`
	}
	if json.Unmarshal(c.Body(), &request) != nil {
		return ""
	}
	return strings.TrimSpace(request.Token) + "|" + strings.ToLower(strings.TrimSpace(request.TenantSlug))
}
