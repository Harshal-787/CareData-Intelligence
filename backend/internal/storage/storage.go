package storage

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"caredata/backend/internal/config"
)

type Storage interface {
	Save(bucket, key string, data []byte, contentType string) (string, error)
	Get(bucket, key string) ([]byte, error)
	Delete(bucket, key string) error
	Exists(bucket, key string) (bool, error)
	GetStoragePath(bucket, key string) string
	InitBuckets(buckets ...string) error
}

type LocalStorage struct {
	baseDir string
}

func NewStorage(cfg *config.Config) Storage {
	// Initialize storage base directory
	baseDir := "./storage/lakehouse"
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		log.Printf("⚠️ Storage mkdir warning: %v", err)
	}

	store := &LocalStorage{
		baseDir: baseDir,
	}

	// Initialize standard lakehouse buckets
	_ = store.InitBuckets("raw-data", "processed-data", "export-reports")
	log.Printf("✓ Initialized Lakehouse Object Storage (Root: %s)", baseDir)
	return store
}

func (s *LocalStorage) InitBuckets(buckets ...string) error {
	for _, b := range buckets {
		dir := filepath.Join(s.baseDir, b)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to init bucket %s: %w", b, err)
		}
	}
	return nil
}

func (s *LocalStorage) Save(bucket, key string, data []byte, contentType string) (string, error) {
	// Clean key to avoid path traversal
	cleanKey := strings.TrimPrefix(filepath.Clean(key), "/")
	fullPath := filepath.Join(s.baseDir, bucket, cleanKey)

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory for storage: %w", err)
	}

	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write object to storage: %w", err)
	}

	return fullPath, nil
}

func (s *LocalStorage) Get(bucket, key string) ([]byte, error) {
	cleanKey := strings.TrimPrefix(filepath.Clean(key), "/")
	fullPath := filepath.Join(s.baseDir, bucket, cleanKey)

	data, err := os.ReadFile(fullPath)
	if err == nil {
		return data, nil
	}

	// Direct path fallback (e.g. if key is already an absolute or relative path like ./storage/lakehouse/...)
	if directData, directErr := os.ReadFile(key); directErr == nil {
		return directData, nil
	}

	// Base directory direct join fallback
	if bucket != "" {
		baseJoinPath := filepath.Join(s.baseDir, cleanKey)
		if directData, directErr := os.ReadFile(baseJoinPath); directErr == nil {
			return directData, nil
		}
	}

	return nil, fmt.Errorf("failed to read object %s from storage (bucket: %s): %w", key, bucket, err)
}

func (s *LocalStorage) Delete(bucket, key string) error {
	cleanKey := strings.TrimPrefix(filepath.Clean(key), "/")
	fullPath := filepath.Join(s.baseDir, bucket, cleanKey)

	if _, err := os.Stat(fullPath); err == nil {
		return os.Remove(fullPath)
	}

	if _, err := os.Stat(key); err == nil {
		return os.Remove(key)
	}

	return nil
}

func (s *LocalStorage) Exists(bucket, key string) (bool, error) {
	cleanKey := strings.TrimPrefix(filepath.Clean(key), "/")
	fullPath := filepath.Join(s.baseDir, bucket, cleanKey)

	if _, err := os.Stat(fullPath); err == nil {
		return true, nil
	}

	if _, err := os.Stat(key); err == nil {
		return true, nil
	}

	return false, nil
}

func (s *LocalStorage) GetStoragePath(bucket, key string) string {
	cleanKey := strings.TrimPrefix(filepath.Clean(key), "/")
	return filepath.Join(s.baseDir, bucket, cleanKey)
}

func DetectMimeType(filename string, data []byte) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return "text/csv"
	case ".json":
		return "application/json"
	case ".ndjson", ".jsonl":
		return "application/x-ndjson"
	case ".parquet":
		return "application/vnd.apache.parquet"
	case ".hl7":
		return "application/x-hl7"
	}

	if len(data) > 512 {
		return http.DetectContentType(data[:512])
	} else if len(data) > 0 {
		return http.DetectContentType(data)
	}
	return "application/octet-stream"
}

func DetectFileType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return "csv"
	case ".json":
		return "json"
	case ".ndjson", ".jsonl":
		return "ndjson"
	case ".parquet":
		return "parquet"
	case ".hl7":
		return "hl7"
	default:
		return "csv"
	}
}

func FormatStorageKey(orgID, datasetID, filename string) string {
	ts := time.Now().UTC().Format("20060102_150405")
	safeName := strings.ReplaceAll(filename, " ", "_")
	return fmt.Sprintf("%s/%s/%s_%s", orgID, datasetID, ts, safeName)
}
