package main

import (
	"database/sql"
	"fmt"
	"log"
	
	"caredata/backend/internal/config"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.LoadConfig()
	db, err := sql.Open(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var id, name, schemaJSON, previewJSON string
	var totalRecords, columnsCount int
	
	err = db.QueryRow("SELECT id, name, total_records, columns_count, schema_json, preview_json FROM datasets WHERE id = 'ds-demo-101'").Scan(&id, &name, &totalRecords, &columnsCount, &schemaJSON, &previewJSON)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	
	fmt.Printf("Dataset: %s (%s)\n", name, id)
	fmt.Printf("Total Records: %d, Columns: %d\n", totalRecords, columnsCount)
	fmt.Printf("Schema length: %d\n", len(schemaJSON))
	fmt.Printf("Preview length: %d\n", len(previewJSON))
}
