package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
	"caredata/backend/internal/storage"

	_ "github.com/lib/pq"
)

func main() {
	cfg := config.LoadConfig()
	db, err := sql.Open(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var datasetID, storagePath, fileType string
	err = db.QueryRow("SELECT id, storage_path, file_type FROM datasets WHERE id = 'ds-demo-101'").Scan(&datasetID, &storagePath, &fileType)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}

	store := storage.NewStorage(cfg)

	stream, err := store.GetStream("raw-data", storagePath)
	if err != nil {
		log.Fatalf("GetStream failed: %v", err)
	}
	defer stream.Close()

	fullPath := ""
	if fileType == "parquet" {
		fullPath = store.GetStoragePath("raw-data", storagePath)
	}

	iter, err := ingest.NewRecordIterator(fileType, stream, fullPath)
	if err != nil {
		log.Fatalf("NewRecordIterator failed: %v", err)
	}
	defer iter.Close()

	parseRes, err := ingest.ParseDatasetStream(fileType, iter)
	if err != nil {
		log.Fatalf("ParseDatasetStream failed: %v", err)
	}

	schemaBytes, _ := json.Marshal(parseRes.Schema)
	previewBytes, _ := json.Marshal(parseRes.Preview)

	_, err = db.Exec(`
		UPDATE datasets
		SET total_records = $1, columns_count = $2, schema_json = $3, preview_json = $4, status = $5
		WHERE id = $6`,
		parseRes.TotalRecords, parseRes.ColumnsCount, string(schemaBytes), string(previewBytes), domain.DatasetStatusReady, datasetID)

	if err != nil {
		log.Fatalf("Update failed: %v", err)
	}

	fmt.Printf("Successfully updated ds-demo-101! Columns: %d, Records: %d\n", parseRes.ColumnsCount, parseRes.TotalRecords)
}
