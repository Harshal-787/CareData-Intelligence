package quality

import (
	"io"
	"testing"

	"caredata/backend/internal/domain"
)

func TestNPIValidation(t *testing.T) {
	// Standard valid test NPI with valid Luhn-80840 checksum
	// e.g. 1245319599 is a known test NPI
	tests := []struct {
		npi   string
		valid bool
	}{
		{"1245319599", true},
		{"1234567890", false},
		{"12345", false},
		{"abcdefghij", false},
	}

	for _, tt := range tests {
		got := IsValidNPI(tt.npi)
		if got != tt.valid {
			t.Errorf("IsValidNPI(%q) = %v, want %v", tt.npi, got, tt.valid)
		}
	}
}

func TestICD10Regex(t *testing.T) {
	tests := []struct {
		code  string
		valid bool
	}{
		{"E11.9", true},
		{"I10", true},
		{"J44.1", true},
		{"Z99.89", true},
		{"123.4", false},
		{"INVALID", false},
	}

	for _, tt := range tests {
		got := icd10Regex.MatchString(tt.code)
		if got != tt.valid {
			t.Errorf("icd10Regex.MatchString(%q) = %v, want %v", tt.code, got, tt.valid)
		}
	}
}

type mockIterator struct {
	rows []map[string]interface{}
	idx  int
}

func (m *mockIterator) Next() (map[string]interface{}, error) {
	if m.idx >= len(m.rows) {
		return nil, io.EOF
	}
	res := m.rows[m.idx]
	m.idx++
	return res, nil
}
func (m *mockIterator) Close() error { return nil }

func TestProfileDataset(t *testing.T) {
	schema := []domain.DatasetColumn{
		{Name: "patient_id", DataType: "STRING"},
		{Name: "age", DataType: "INTEGER"},
		{Name: "systolic_bp", DataType: "FLOAT"},
	}

	rows := []map[string]interface{}{
		{"patient_id": "P001", "age": 45, "systolic_bp": 120.0},
		{"patient_id": "P002", "age": 60, "systolic_bp": 140.0},
		{"patient_id": "P003", "age": 30, "systolic_bp": 110.0},
		{"patient_id": "P004", "age": nil, "systolic_bp": 135.0},
	}

	profiles := ProfileDataset(schema, &mockIterator{rows: rows})
	if len(profiles) != 3 {
		t.Fatalf("expected 3 column profiles, got %d", len(profiles))
	}

	// Test Age profile (1 null out of 4 rows = 25% nulls)
	ageProf := profiles[1]
	if ageProf.ColumnName != "age" {
		t.Errorf("expected column 'age', got %s", ageProf.ColumnName)
	}
	if ageProf.NullCount != 1 {
		t.Errorf("expected 1 null for age, got %d", ageProf.NullCount)
	}
	if ageProf.NullPercentage != 25.0 {
		t.Errorf("expected 25.0%% nulls for age, got %.2f", ageProf.NullPercentage)
	}
	if ageProf.Min != 30.0 || ageProf.Max != 60.0 {
		t.Errorf("expected min 30, max 60, got min %v, max %v", ageProf.Min, ageProf.Max)
	}
}

func TestEvaluateQualityAndRules(t *testing.T) {
	schema := []domain.DatasetColumn{
		{Name: "patient_id", DataType: "STRING"},
		{Name: "systolic_bp", DataType: "FLOAT"},
	}

	rows := []map[string]interface{}{
		{"patient_id": "P001", "systolic_bp": 120.0},
		{"patient_id": "P002", "systolic_bp": 320.0}, // Exceeds 250 max
		{"patient_id": "", "systolic_bp": 115.0},     // Empty required patient_id
	}

	rules := []domain.ValidationRule{
		{
			ID:         "r1",
			FieldName:  "patient_id",
			RuleType:   domain.RuleTypeRequiredField,
			Severity:   domain.SeverityCritical,
			IsActive:   true,
		},
		{
			ID:         "r2",
			FieldName:  "systolic_bp",
			RuleType:   domain.RuleTypeClinicalVitals,
			Severity:   domain.SeverityWarning,
			Parameters: `{"vitalType":"systolic_bp","min":50,"max":250}`,
			IsActive:   true,
		},
	}

	res := EvaluateQualityAndRules("ds-1", "org-1", schema, &mockIterator{rows: rows}, rules)
	if len(res.Violations) != 2 {
		t.Fatalf("expected 2 violations, got %d", len(res.Violations))
	}
	if res.CriticalCount != 1 {
		t.Errorf("expected 1 critical violation, got %d", res.CriticalCount)
	}
	if res.WarningCount != 1 {
		t.Errorf("expected 1 warning violation, got %d", res.WarningCount)
	}
	if res.OverallScore >= 100 {
		t.Errorf("expected overall score to be penalized below 100, got %.2f", res.OverallScore)
	}
}
