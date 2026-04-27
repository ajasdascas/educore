package redis

import (
	"context"
	"log"

	redisClient "github.com/redis/go-redis/v9"
)

func New(ctx context.Context, redisURL string) (*redisClient.Client, error) {
	opt, err := redisClient.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	client := redisClient.NewClient(opt)

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	log.Println("Redis connection established")
	return client, nil
}
