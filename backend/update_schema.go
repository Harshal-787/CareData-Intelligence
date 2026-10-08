package main

import (
	"log"

	"caredata/backend/internal/config"
	"caredata/backend/internal/database"
	"caredata/backend/internal/repository"
)

func main() {
	cfg := config.LoadConfig()
	db, err := database.Connect(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}
	defer db.Close()

	repo := repository.NewRepository(db)
	
	cfgObj, err := repo.GetSnowflakeConfig("org-default-001")
	if err != nil {
		log.Fatalf("Failed to fetch snowflake config: %v", err)
	}

	cfgObj.Schema = "PUBLIC"

	err = repo.SaveSnowflakeConfig(cfgObj)
	if err != nil {
		log.Fatalf("Failed to save snowflake config: %v", err)
	}

	log.Println("Successfully forcefully updated Snowflake config schema to PUBLIC")
}
