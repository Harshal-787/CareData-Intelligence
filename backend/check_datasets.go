package main

import (
	"log"
	"encoding/json"

	"caredata/backend/internal/config"
	"caredata/backend/internal/database"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/domain"
)

func main() {
	cfg := config.LoadConfig()
	db, err := database.Connect(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}
	defer db.Close()

	repo := repository.NewRepository(db)
	
	datasets, err := repo.ListDatasets(domain.DatasetFilterParams{})
	if err != nil {
		log.Fatalf("Failed to fetch datasets: %v", err)
	}

	b, _ := json.MarshalIndent(datasets, "", "  ")
	log.Printf("Datasets in DB:\n%s", string(b))
}
