package dedupe

import (
	"testing"
)

func TestSoundex(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Smith", "S530"},
		{"Smyth", "S530"},
		{"Robert", "R163"},
		{"Rupert", "R163"},
		{"Johnson", "J525"},
	}

	for _, tt := range tests {
		res := Soundex(tt.input)
		if res != tt.expected {
			t.Errorf("Soundex(%q) = %q, want %q", tt.input, res, tt.expected)
		}
	}
}

func TestJaroWinklerSimilarity(t *testing.T) {
	s1 := "Alexander"
	s2 := "Alexandar"
	score := JaroWinklerSimilarity(s1, s2)
	if score < 0.95 {
		t.Errorf("Expected high similarity for %s vs %s, got %f", s1, s2, score)
	}

	diffScore := JaroWinklerSimilarity("Michael", "Sarah")
	if diffScore > 0.5 {
		t.Errorf("Expected low similarity for Michael vs Sarah, got %f", diffScore)
	}
}

func TestCompareRecords(t *testing.T) {
	recA := PatientRecord{
		ID:        "P001",
		FirstName: "Jonathan",
		LastName:  "Smith",
		DOB:       "1985-06-15",
		Phone:     "(555) 234-5678",
		Address:   "123 Maple Street, Apt 4B",
		MRN:       "MRN-884920",
		Gender:    "M",
	}

	recB := PatientRecord{
		ID:        "P002",
		FirstName: "John",
		LastName:  "Smyth",
		DOB:       "1985-06-15",
		Phone:     "555-234-5678",
		Address:   "123 Maple St Apt 4B",
		MRN:       "MRN-884920",
		Gender:    "M",
	}

	weights := DefaultDemographicWeights()
	confidence, fieldScores := CompareRecords(recA, recB, weights)

	if confidence < 0.85 {
		t.Errorf("Expected high duplicate match confidence (>=0.85), got %f", confidence)
	}

	if len(fieldScores) == 0 {
		t.Errorf("Expected field scores breakdown, got empty list")
	}
}
