package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port          string
	Env           string
	DBDriver      string
	DBSource      string
	JWTSecret     string
	JWTRefresh    string
	RedisAddr     string
	MinIOEndpoint string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOUseSSL   bool
	OllamaURL     string
}

func LoadConfig() *Config {
	loadDotEnv(".env")
	loadDotEnv("../.env")

	port := getEnv("PORT", "8080")
	env := getEnv("ENV", "development")
	dbDriver := getEnv("DB_DRIVER", "postgres")

	var dbSource string
	if dbDriver == "postgres" {
		host := getEnv("DB_HOST", "localhost")
		dbPort := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		pass := getEnv("DB_PASSWORD", "Password01")
		name := getEnv("DB_NAME", "caredata_db")
		if name == "" {
			name = "caredata_db"
		}
		sslMode := getEnv("DB_SSLMODE", "disable")

		dbSource = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, dbPort, name, sslMode)
	} else {
		dbSource = getEnv("DB_SOURCE", "./caredata.db")
	}

	return &Config{
		Port:           port,
		Env:            env,
		DBDriver:       dbDriver,
		DBSource:       dbSource,
		JWTSecret:      getEnv("JWT_SECRET", "caredata_super_secret_jwt_key_2026_change_in_prod"),
		JWTRefresh:     getEnv("JWT_REFRESH_SECRET", "caredata_refresh_super_secret_key_2026"),
		RedisAddr:      getEnv("REDIS_ADDR", "localhost:6379"),
		MinIOEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey: getEnv("MINIO_ACCESS_KEY", "caredata_minio"),
		MinIOSecretKey: getEnv("MINIO_SECRET_KEY", "caredata_minio_secret123"),
		MinIOUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
		OllamaURL:      getEnv("OLLAMA_URL", "http://localhost:11434"),
	}
}

func loadDotEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), "\"'")
			if os.Getenv(key) == "" {
				_ = os.Setenv(key, val)
			}
		}
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
