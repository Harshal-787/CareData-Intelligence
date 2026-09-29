package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "host=localhost user=postgres password=postgres dbname=caredata port=5432 sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var p string
	err = db.QueryRow("SELECT profiling_json FROM quality_reports WHERE dataset_id = 'ds-demo-101' ORDER BY created_at DESC LIMIT 1").Scan(&p)
	if err != nil {
		log.Fatal(err)
	}
	
	if len(p) > 200 {
		fmt.Println(p[:200] + "...")
	} else {
		fmt.Println(p)
	}
}
