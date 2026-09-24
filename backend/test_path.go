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

	var storagePath string
	err = db.QueryRow("SELECT storage_path FROM datasets WHERE id = 'ds-demo-101'").Scan(&storagePath)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Storage path: %s\n", storagePath)
}
