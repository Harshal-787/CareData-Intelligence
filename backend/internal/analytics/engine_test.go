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

	// 3. Test template queries with empty records (fallback generation)
	tmpl1 := `SELECT department, COUNT(*) AS total_encounters, ROUND(AVG(length_of_stay), 1) AS avg_los_days, ROUND(AVG(billing_amount), 2) AS avg_cost FROM clinical_encounters GROUP BY department ORDER BY total_encounters DESC;`
	respTmpl1 := engine.ExecuteSafeQuery(tmpl1, nil, 10)
	if respTmpl1.Error != "" {
		t.Fatalf("Template 1 failed: %v", respTmpl1.Error)
	}
	if len(respTmpl1.Rows) == 0 {
		t.Errorf("Template 1 returned 0 rows")
	}
	if len(respTmpl1.Columns) != 4 {
		t.Errorf("Template 1 expected 4 columns, got %d", len(respTmpl1.Columns))
	}

	tmpl2 := `SELECT icd10_code, diagnosis_description, COUNT(*) AS patient_count, ROUND(AVG(billing_amount), 2) AS avg_cost, ROUND(AVG(length_of_stay), 1) AS avg_los FROM clinical_encounters WHERE billing_amount IS NOT NULL GROUP BY icd10_code, diagnosis_description ORDER BY avg_cost DESC LIMIT 10;`
	respTmpl2 := engine.ExecuteSafeQuery(tmpl2, nil, 10)
	if respTmpl2.Error != "" {
		t.Fatalf("Template 2 failed: %v", respTmpl2.Error)
	}
	if len(respTmpl2.Rows) == 0 {
		t.Errorf("Template 2 returned 0 rows")
	}

	tmpl3 := `SELECT icd10_code, COUNT(*) as total_patients, SUM(CASE WHEN readmitted = 'true' THEN 1 ELSE 0 END) as readmission_count, ROUND(AVG(CASE WHEN readmitted = 'true' THEN 100.0 ELSE 0.0 END), 1) as readmission_rate_pct FROM clinical_encounters GROUP BY icd10_code HAVING total_patients >= 5 ORDER BY readmission_rate_pct DESC;`
	respTmpl3 := engine.ExecuteSafeQuery(tmpl3, nil, 10)
	if respTmpl3.Error != "" {
		t.Fatalf("Template 3 failed: %v", respTmpl3.Error)
	}
	if len(respTmpl3.Rows) == 0 {
		t.Errorf("Template 3 returned 0 rows")
	}

	tmpl4 := `SELECT admission_type, gender, COUNT(*) AS encounter_count, ROUND(AVG(length_of_stay), 1) AS avg_los FROM clinical_encounters GROUP BY admission_type, gender ORDER BY encounter_count DESC;`
	respTmpl4 := engine.ExecuteSafeQuery(tmpl4, nil, 10)
	if respTmpl4.Error != "" {
		t.Fatalf("Template 4 failed: %v", respTmpl4.Error)
	}
	if len(respTmpl4.Rows) == 0 {
		t.Errorf("Template 4 returned 0 rows")
	}
}

