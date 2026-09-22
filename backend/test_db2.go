package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
)

func main() {
	// Connect to postgres running on localhost:5440
	// The credentials can be taken from the make run output
	// Wait, we got authentication failed on postgres/postgres.
	// But let's check .env in CareData-Intelligence
	db, err := sql.Open("postgres", "host=localhost user=postgres password=postgres dbname=caredata port=5440 sslmode=disable")
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
