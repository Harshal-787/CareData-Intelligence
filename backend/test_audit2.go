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
	fmt.Println("DSN:", cfg.DBSource)
	
	db, err := sql.Open(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var id, profilingJSON string
	err = db.QueryRow("SELECT id, profiling_json FROM quality_reports WHERE dataset_id = 'ds-demo-101' ORDER BY created_at DESC LIMIT 1").Scan(&id, &profilingJSON)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	
	fmt.Printf("Report ID: %s\n", id)
	fmt.Printf("ProfilingJSON length: %d\n", len(profilingJSON))
	if len(profilingJSON) > 100 {
		fmt.Printf("ProfilingJSON snippet: %s...\n", profilingJSON[:100])
	} else {
		fmt.Printf("ProfilingJSON content: %s\n", profilingJSON)
	}
}
