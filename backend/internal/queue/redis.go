package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/go-redis/redis/v8"
)

type RedisQueue struct {
	client *redis.Client
}

func NewRedisQueue(addr, password string, db int) *RedisQueue {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("⚠️ Redis connection warning: %v", err)
	} else {
		log.Printf("✓ Connected to Redis at %s", addr)
	}

	return &RedisQueue{
		client: rdb,
	}
}

func (q *RedisQueue) Enqueue(queueName string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	err = q.client.LPush(context.Background(), queueName, data).Err()
	if err != nil {
		return fmt.Errorf("failed to enqueue to %s: %w", queueName, err)
	}
	return nil
}
