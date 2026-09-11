package ingest

import (
	"testing"
)

func TestParseCSV(t *testing.T) {
	csvData := []byte(`patient_id,age,systolic_bp,is_diabetic,admit_date,notes
1001,45,120.5,true,2026-05-10,Normal checkup
1002,62,145.0,false,2026-05-11,Hypertension follow-up
1003,28,115.0,false,2026-05-12,Routine physical
`)

	res, err := ParseDatasetContent("csv", csvData)
	if err != nil {
		t.Fatalf("ParseDatasetContent failed: %v", err)
	}

	if res.TotalRecords != 3 {
		t.Errorf("Expected 3 records, got %d", res.TotalRecords)
	}

	if res.ColumnsCount != 6 {
		t.Errorf("Expected 6 columns, got %d", res.ColumnsCount)
	}

	if len(res.Preview) != 3 {
		t.Errorf("Expected 3 preview rows, got %d", len(res.Preview))
	}

	if res.QualityScore < 90.0 {
		t.Errorf("Expected high quality score, got %f", res.QualityScore)
	}
}

func TestSampleGenerators(t *testing.T) {
	encData, encFilename := GenerateClinicalEncountersCSV(50)
	if len(encData) == 0 || encFilename == "" {
		t.Errorf("Failed to generate clinical encounters CSV")
	}

	encRes, err := ParseDatasetContent("csv", encData)
	if err != nil {
		t.Fatalf("Failed to parse generated encounters: %v", err)
	}
	if encRes.TotalRecords != 50 {
		t.Errorf("Expected 50 encounters, got %d", encRes.TotalRecords)
	}

	demoData, _ := GeneratePatientDemographicsCSV(20)
	demoRes, err := ParseDatasetContent("csv", demoData)
	if err != nil {
		t.Fatalf("Failed to parse demographics: %v", err)
	}
	if demoRes.TotalRecords != 20 {
		t.Errorf("Expected 20 demographics, got %d", demoRes.TotalRecords)
	}

	labData, _ := GenerateLabVitalsJSON(30)
	labRes, err := ParseDatasetContent("json", labData)
	if err != nil {
		t.Fatalf("Failed to parse lab vitals JSON: %v", err)
	}
	if labRes.TotalRecords != 30 {
		t.Errorf("Expected 30 lab vitals, got %d", labRes.TotalRecords)
	}
}
