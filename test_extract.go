package main

import (
	"fmt"
	"log"
	"caredata/backend/internal/analytics"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load("backend/.env")
	sf := analytics.NewSnowflakeClient()
	res, err := sf.ExecuteTenantQuery("org-default-001", "SELECT * FROM clinical_encounters")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Columns: %v\n", res.Columns)
	fmt.Printf("Rows: %d\n", len(res.Rows))
}
