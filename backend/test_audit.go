package main

import (
	"encoding/json"
	"fmt"
	"log"

	"caredata/backend/internal/config"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/service"
	"caredata/backend/internal/storage"
)

func main() {
	cfg := config.LoadConfig()
	repo, err := repository.NewRepository(cfg.PostgresDSN)
	if err != nil {
		log.Fatal(err)
	}
	defer repo.Close()

	st := storage.NewLocalStorage("./storage/lakehouse")
	qualitySvc := service.NewQualityService(repo, st, cfg)

	report, err := qualitySvc.RunQualityAudit("ds-demo-101", "org-caredata-001")
	if err != nil {
		log.Fatalf("Audit failed: %v", err)
	}
	
	prof, _ := json.MarshalIndent(report.ColumnProfiles, "", "  ")
	fmt.Printf("Success! Profiles generated: %d\n", len(report.ColumnProfiles))
	if len(report.ColumnProfiles) > 0 {
		fmt.Printf("First profile: %s\n", string(prof[:500]))
	}
}
