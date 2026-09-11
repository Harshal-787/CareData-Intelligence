package analytics

import (
	"testing"

	"caredata/backend/internal/domain"
)

func TestAnalyticsEngine_ComputeOverviewAggregations(t *testing.T) {
	engine := NewAnalyticsEngine()

	mockRecords := []map[string]interface{}{
		{
			"patient_id":      "P-1001",
			"provider_id":     "DOC-501",
			"department":      "Cardiology",
			"length_of_stay":  4.5,
			"billing_amount":  8500.0,
			"readmitted":      false,
			"admission_type":  "Inpatient",
			"icd10_code":      "I10",
			"diagnosis_desc":  "Essential Hypertension",
			"age":             62,
			"gender":          "M",
			"insurance_payer": "Medicare",
			"admission_date":  "2024-03-10",
		},
		{
			"patient_id":      "P-1002",
			"provider_id":     "DOC-502",
			"department":      "Emergency / Trauma",
			"length_of_stay":  1.2,
			"billing_amount":  2400.0,
			"readmitted":      true,
			"admission_type":  "Emergency",
			"icd10_code":      "J44.1",
			"diagnosis_desc":  "COPD Acute Exacerbation",
			"age":             45,
			"gender":          "F",
			"insurance_payer": "Commercial",
			"admission_date":  "2024-03-12",
		},
	}

	filter := domain.AnalyticsFilterParams{}
	res := engine.ComputeOverviewAggregations(nil, mockRecords, filter)

	if res.KPIs.TotalEncounters != 2 {
		t.Errorf("expected 2 encounters, got %d", res.KPIs.TotalEncounters)
	}

	if res.KPIs.ActivePatients != 2 {
		t.Errorf("expected 2 active patients, got %d", res.KPIs.ActivePatients)
	}

	if len(res.Departments) == 0 {
		t.Errorf("expected departments in result, got 0")
	}

	if len(res.TopDiagnoses) == 0 {
		t.Errorf("expected diagnoses in result, got 0")
	}
}

func TestAnalyticsEngine_ExecuteSafeQuery(t *testing.T) {
	engine := NewAnalyticsEngine()

	mockRecords := []map[string]interface{}{
		{"department": "Cardiology", "patient_id": "P-1", "cost": 5000},
		{"department": "Neurology", "patient_id": "P-2", "cost": 7200},
	}

	// 1. Safe query
	resp := engine.ExecuteSafeQuery("SELECT department, patient_id, cost FROM clinical_records", mockRecords, 10)
	if resp.Error != "" {
		t.Fatalf("unexpected query error: %v", resp.Error)
	}
	if len(resp.Rows) != 2 {
		t.Errorf("expected 2 rows returned, got %d", len(resp.Rows))
	}

	// 2. Block unsafe query
	badResp := engine.ExecuteSafeQuery("DROP TABLE patients", mockRecords, 10)
	if badResp.Error == "" {
		t.Errorf("expected error on DROP statement, but got none")
	}
}
