package mllp

import (
	"testing"
)

func TestParseHL7_CriticalICU(t *testing.T) {
	raw := "MSH|^~\\&|ICU_MONITOR_04|METRO_HEALTH|CAREDATA|CENTRAL|20260908112000||ORU^R01|MSG-99201|P|2.5\r" +
		"PID|1||PAT-84920^^^MRN||DOE^JOHN||19720415|M|||123 MAIN ST^^NEW YORK^NY\r" +
		"PV1|1|I|ICU^BED-03^01||||DOC-102^SMITH^EMILY\r" +
		"OBX|1|NM|2708-6^Oxygen Saturation^LN||83|%|95-100|LL|||F\r" +
		"OBX|2|NM|8480-6^Systolic Blood Pressure^LN||68|mmHg|90-120|LL|||F\r" +
		"OBX|3|NM|2524-7^Serum Lactate^LN||4.8|mmol/L|0.5-2.0|HH|||F\r"

	msg, err := ParseHL7(raw)
	if err != nil {
		t.Fatalf("Failed to parse HL7: %v", err)
	}

	if msg.Patient.MRN != "PAT-84920" {
		t.Errorf("Expected MRN PAT-84920, got %s", msg.Patient.MRN)
	}
	if msg.Patient.LastName != "DOE" || msg.Patient.FirstName != "JOHN" {
		t.Errorf("Expected patient DOE JOHN, got %s %s", msg.Patient.LastName, msg.Patient.FirstName)
	}
	if msg.Visit.AssignedUnit != "ICU" || msg.Visit.AssignedRoom != "BED-03" {
		t.Errorf("Expected ICU BED-03, got %s %s", msg.Visit.AssignedUnit, msg.Visit.AssignedRoom)
	}
	if len(msg.Observations) != 3 {
		t.Errorf("Expected 3 observations, got %d", len(msg.Observations))
	}
	if msg.Severity != "CRITICAL" {
		t.Errorf("Expected CRITICAL severity, got %s", msg.Severity)
	}
	if msg.RiskScore < 75 {
		t.Errorf("Expected RiskScore >= 75 for severe vitals, got %d", msg.RiskScore)
	}

	ack := GenerateACK(msg, "AA", "Accepted")
	if ack == "" {
		t.Errorf("Expected non-empty ACK string")
	}
}
