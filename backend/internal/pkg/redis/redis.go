package redis

import (
	"context"
	"log"
	"time"

	redisClient "github.com/redis/go-redis/v9"
)

// Client wraps redis client, can be nil if Redis is unavailable in dev
type Client struct {
	rdb *redisClient.Client
}

func New(ctx context.Context, redisURL string) (*Client, error) {
	opt, err := redisClient.ParseURL(redisURL)
	if err != nil {
		log.Printf("Redis URL parse error: %v — running without Redis", err)
		return &Client{rdb: nil}, nil
	}

	opt.MaxRetries = 0
	opt.DialTimeout = 2 * time.Second

	client := redisClient.NewClient(opt)

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Redis connection failed: %v — running without Redis", err)
		return &Client{rdb: nil}, nil
	}

	log.Println("Redis connection established")
	return &Client{rdb: client}, nil
}

func (c *Client) IsAvailable() bool {
	return c != nil && c.rdb != nil
}

func (c *Client) GetClient() *redisClient.Client {
	if c == nil {
		return nil
	}
	return c.rdb
}

func (c *Client) Close() error {
	if c != nil && c.rdb != nil {
		return c.rdb.Close()
	}
	return nil
}

func (c *Client) Set(ctx context.Context, key string, value interface{}, expiration ...interface{}) error {
	if !c.IsAvailable() {
		return nil
	}
	if len(expiration) > 0 {
		if dur, ok := expiration[0].(interface{ String() string }); ok {
			_ = dur
		}
	}
	return c.rdb.Set(ctx, key, value, 0).Err()
}

func (c *Client) Get(ctx context.Context, key string) (string, error) {
	if !c.IsAvailable() {
		return "", nil
	}
	return c.rdb.Get(ctx, key).Result()
}

func (c *Client) Del(ctx context.Context, keys ...string) error {
	if !c.IsAvailable() {
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}
