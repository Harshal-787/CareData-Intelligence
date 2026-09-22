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

	var schemaJSON string
	err = db.QueryRow("SELECT schema_json FROM datasets WHERE id = 'ds-demo-101'").Scan(&schemaJSON)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	
	fmt.Printf("SchemaJSON length: %d\n", len(schemaJSON))
	fmt.Printf("SchemaJSON content: %s\n", schemaJSON)
}
