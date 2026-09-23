package main

import (
	"fmt"
	"log"

	"caredata/backend/internal/config"
	"caredata/backend/internal/database"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/service"
	"caredata/backend/internal/storage"
)

func main() {
	cfg := config.LoadConfig()
	
	db, _ := database.Connect(cfg.DBDriver, cfg.DBSource)
	defer db.Close()
	
	repo := repository.NewRepository(db)
	store := storage.NewStorage(cfg)
	qs := service.NewQualityService(repo, store, cfg)
	
	report, err := qs.RunQualityAudit("ds-demo-101", "org-demo-100")
	if err != nil {
		log.Fatalf("RunQualityAudit failed: %v", err)
	}
	
	fmt.Printf("Successfully generated Quality Audit!\n")
	fmt.Printf("Report ID: %s\n", report.ID)
	fmt.Printf("Overall Score: %.2f\n", report.OverallScore)
	
	if len(report.ColumnProfiles) > 0 {
		fmt.Printf("Generated profiles for %d columns!\n", len(report.ColumnProfiles))
		fmt.Printf("Sample Col: %s (Type: %s)\n", report.ColumnProfiles[0].ColumnName, report.ColumnProfiles[0].DataType)
	} else {
		fmt.Printf("NO COLUMN PROFILES GENERATED!\n")
	}
}
