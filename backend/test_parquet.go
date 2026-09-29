//go:build ignore
package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/reader"
)

func main() {
	filePath := "storage/lakehouse/raw-data/demodata.parquet"
	fileReader, err := local.NewLocalFileReader(filePath)
	if err != nil {
		log.Fatal(err)
	}
	defer fileReader.Close()

	pr, err := reader.NewParquetReader(fileReader, nil, 4)
	if err != nil {
		log.Fatal(err)
	}
	defer pr.ReadStop()

	res, err := pr.ReadByNumber(1)
	if err != nil {
		log.Fatal(err)
	}
	
	if len(res) == 0 {
		log.Fatal("no records read")
	}

	fmt.Printf("Raw res[0] type: %T
", res[0])
	fmt.Printf("Raw res[0]: %+v
", res[0])

	jsonBs, err := json.Marshal(res[0])
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("JSON length: %d
", len(jsonBs))
	fmt.Printf("JSON content: %s
", string(jsonBs))
}
