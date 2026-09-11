package mllp

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// HL7Message represents a parsed HL7 v2 clinical message.
type HL7Message struct {
	RawMessage      string               `json:"rawMessage"`
	MessageType     string               `json:"messageType"`     // e.g. "ORU^R01", "ADT^A01", "ADT^A08"
	EventCode       string               `json:"eventCode"`       // e.g. "R01", "A01"
	MessageControlID string              `json:"messageControlId"`// MSH-10
	SendingApp      string               `json:"sendingApp"`      // MSH-3
	SendingFacility string               `json:"sendingFacility"` // MSH-4
	Timestamp       time.Time            `json:"timestamp"`
	Patient         PatientInfo          `json:"patient"`
	Visit           VisitInfo            `json:"visit"`
	Observations    []ObservationResult  `json:"observations"`
	AnomalyFlags    []string             `json:"anomalyFlags"`
	RiskScore       int                  `json:"riskScore"`       // 0-100
	Severity        string               `json:"severity"`        // NORMAL, WARNING, CRITICAL
	ClinicalSummary string               `json:"clinicalSummary"`
}

type PatientInfo struct {
	ID        string `json:"id"`
	MRN       string `json:"mrn"`
	LastName  string `json:"lastName"`
	FirstName string `json:"firstName"`
	DOB       string `json:"dob"`
	Gender    string `json:"gender"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
}

type VisitInfo struct {
	VisitNumber    string `json:"visitNumber"`
	PatientClass   string `json:"patientClass"` // I (Inpatient), E (Emergency), O (Outpatient)
	AssignedUnit   string `json:"assignedUnit"` // e.g. "ICU", "ED", "CARDIAC"
	AssignedRoom   string `json:"assignedRoom"` // e.g. "ROOM-4"
	AssignedBed    string `json:"assignedBed"`  // e.g. "BED-03"
	AttendingDoctor string `json:"attendingDoctor"`
}

type ObservationResult struct {
	SetID          string  `json:"setId"`
	ValueType      string  `json:"valueType"` // NM, ST, TX, CE
	Identifier     string  `json:"identifier"` // e.g. "2708-6" (LOINC)
	Description    string  `json:"description"` // e.g. "Oxygen Saturation"
	Value          string  `json:"value"`
	NumericValue   float64 `json:"numericValue,omitempty"`
	Units          string  `json:"units"`          // e.g. "%", "mmHg", "bpm"
	ReferenceRange string  `json:"referenceRange"` // e.g. "95-100"
	AbnormalFlag   string  `json:"abnormalFlag"`   // H, L, LL, HH, CRITICAL, NORMAL
	Status         string  `json:"status"`         // F (Final), C (Corrected)
}

// ParseHL7 parses a raw HL7 v2 string into a structured HL7Message.
func ParseHL7(raw string) (*HL7Message, error) {
	clean := strings.TrimSpace(raw)
	// Normalize line breaks
	lines := strings.FieldsFunc(clean, func(r rune) bool {
		return r == '\r' || r == '\n'
	})

	if len(lines) == 0 {
		return nil, fmt.Errorf("empty HL7 message")
	}

	msg := &HL7Message{
		RawMessage:   clean,
		Timestamp:    time.Now().UTC(),
		Observations: make([]ObservationResult, 0),
		AnomalyFlags: make([]string, 0),
		Severity:     "NORMAL",
	}

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) < 3 {
			continue
		}
		segType := line[:3]
		fields := strings.Split(line, "|")

		switch segType {
		case "MSH":
			// MSH|^~\&|SendingApp|SendingFacility|ReceivingApp|ReceivingFacility|Timestamp||MsgType|ControlID|ProcessingID|Version
			if len(fields) > 2 {
				msg.SendingApp = fields[2]
			}
			if len(fields) > 3 {
				msg.SendingFacility = fields[3]
			}
			if len(fields) > 8 {
				msg.MessageType = fields[8]
				parts := strings.Split(fields[8], "^")
				if len(parts) > 1 {
					msg.EventCode = parts[1]
				} else {
					msg.EventCode = fields[8]
				}
			}
			if len(fields) > 9 {
				msg.MessageControlID = fields[9]
			} else {
				msg.MessageControlID = fmt.Sprintf("MSG-%d", time.Now().UnixNano())
			}

		case "PID":
			// PID|SetID|ID|MRN|AltID|Name|MotherMaiden|DOB|Gender||Race|Address||Phone
			if len(fields) > 2 && fields[2] != "" {
				msg.Patient.ID = fields[2]
			}
			if len(fields) > 3 && fields[3] != "" {
				mrnParts := strings.Split(fields[3], "^")
				msg.Patient.MRN = mrnParts[0]
			}
			if msg.Patient.ID == "" && msg.Patient.MRN != "" {
				msg.Patient.ID = msg.Patient.MRN
			}
			if len(fields) > 5 && fields[5] != "" {
				nameParts := strings.Split(fields[5], "^")
				if len(nameParts) > 0 {
					msg.Patient.LastName = nameParts[0]
				}
				if len(nameParts) > 1 {
					msg.Patient.FirstName = nameParts[1]
				}
			}
			if len(fields) > 7 {
				msg.Patient.DOB = fields[7]
			}
			if len(fields) > 8 {
				msg.Patient.Gender = fields[8]
			}
			if len(fields) > 11 {
				msg.Patient.Address = strings.ReplaceAll(fields[11], "^", " ")
			}
			if len(fields) > 13 {
				msg.Patient.Phone = fields[13]
			}

		case "PV1":
			// PV1|SetID|PatientClass|AssignedLocation|AdmissionType|PreadmitNumber|PriorLocation|AttendingDoctor
			if len(fields) > 2 {
				msg.Visit.PatientClass = fields[2]
			}
			if len(fields) > 3 && fields[3] != "" {
				locParts := strings.Split(fields[3], "^")
				if len(locParts) > 0 {
					msg.Visit.AssignedUnit = locParts[0]
				}
				if len(locParts) > 1 {
					msg.Visit.AssignedRoom = locParts[1]
				}
				if len(locParts) > 2 {
					msg.Visit.AssignedBed = locParts[2]
				}
			}
			if len(fields) > 7 && fields[7] != "" {
				docParts := strings.Split(fields[7], "^")
				if len(docParts) > 2 {
					msg.Visit.AttendingDoctor = fmt.Sprintf("Dr. %s %s", docParts[2], docParts[1])
				} else if len(docParts) > 1 {
					msg.Visit.AttendingDoctor = fmt.Sprintf("Dr. %s", docParts[1])
				} else {
					msg.Visit.AttendingDoctor = fields[7]
				}
			}

		case "OBX":
			// OBX|SetID|ValueType|ObservationID|ObservationSubID|Value|Units|RefRange|AbnormalFlags||Status
			obx := ObservationResult{
				Status: "F",
			}
			if len(fields) > 1 {
				obx.SetID = fields[1]
			}
			if len(fields) > 2 {
				obx.ValueType = fields[2]
			}
			if len(fields) > 3 {
				idParts := strings.Split(fields[3], "^")
				if len(idParts) > 0 {
					obx.Identifier = idParts[0]
				}
				if len(idParts) > 1 {
					obx.Description = idParts[1]
				} else {
					obx.Description = idParts[0]
				}
			}
			if len(fields) > 5 {
				obx.Value = fields[5]
				if num, err := strconv.ParseFloat(fields[5], 64); err == nil {
					obx.NumericValue = num
				}
			}
			if len(fields) > 6 {
				obx.Units = fields[6]
			}
			if len(fields) > 7 {
				obx.ReferenceRange = fields[7]
			}
			if len(fields) > 8 {
				obx.AbnormalFlag = fields[8]
			}
			if len(fields) > 11 {
				obx.Status = fields[11]
			}
			msg.Observations = append(msg.Observations, obx)
		}
	}

	// Run Clinical Vitals Anomaly Detection & Scoring
	EvaluateClinicalAnomalies(msg)

	return msg, nil
}

// EvaluateClinicalAnomalies calculates risk scoring and clinical flags
func EvaluateClinicalAnomalies(msg *HL7Message) {
	risk := 15 // Base baseline risk
	anomalies := make([]string, 0)

	for i := range msg.Observations {
		ob := &msg.Observations[i]
		desc := strings.ToLower(ob.Description)
		val := ob.NumericValue

		// 1. Oxygen Saturation (SpO2)
		if strings.Contains(desc, "oxygen") || strings.Contains(desc, "spo2") || strings.Contains(desc, "o2") {
			if val > 0 && val < 88 {
				ob.AbnormalFlag = "LL"
				anomalies = append(anomalies, fmt.Sprintf("Severe Hypoxemia: SpO2 at %.0f%% (Critical)", val))
				risk += 45
			} else if val > 0 && val < 92 {
				ob.AbnormalFlag = "L"
				anomalies = append(anomalies, fmt.Sprintf("Mild Hypoxia: SpO2 at %.0f%%", val))
				risk += 25
			}
		}

		// 2. Systolic Blood Pressure
		if strings.Contains(desc, "systolic") || strings.Contains(desc, "sbp") {
			if val > 0 && val < 80 {
				ob.AbnormalFlag = "LL"
				anomalies = append(anomalies, fmt.Sprintf("Severe Hypotensive Shock: Systolic BP %.0f mmHg", val))
				risk += 40
			} else if val > 180 {
				ob.AbnormalFlag = "HH"
				anomalies = append(anomalies, fmt.Sprintf("Hypertensive Crisis: Systolic BP %.0f mmHg", val))
				risk += 35
			}
		}

		// 3. Heart Rate (Pulse)
		if strings.Contains(desc, "heart rate") || strings.Contains(desc, "pulse") || strings.Contains(desc, "hr") {
			if val > 130 {
				ob.AbnormalFlag = "HH"
				anomalies = append(anomalies, fmt.Sprintf("Severe Tachycardia: HR %.0f bpm", val))
				risk += 30
			} else if val > 0 && val < 45 {
				ob.AbnormalFlag = "LL"
				anomalies = append(anomalies, fmt.Sprintf("Severe Bradycardia: HR %.0f bpm", val))
				risk += 30
			}
		}

		// 4. Serum Lactate (Sepsis marker)
		if strings.Contains(desc, "lactate") {
			if val >= 4.0 {
				ob.AbnormalFlag = "HH"
				anomalies = append(anomalies, fmt.Sprintf("Critical Lactic Acidosis (Sepsis indicator): %.1f mmol/L", val))
				risk += 50
			} else if val >= 2.0 {
				ob.AbnormalFlag = "H"
				anomalies = append(anomalies, fmt.Sprintf("Elevated Lactate: %.1f mmol/L", val))
				risk += 20
			}
		}

		// 5. Temperature
		if strings.Contains(desc, "temp") {
			if val >= 39.5 || val >= 103.0 {
				ob.AbnormalFlag = "H"
				anomalies = append(anomalies, fmt.Sprintf("High Grade Fever: %.1f°", val))
				risk += 25
			}
		}
	}

	if risk > 99 {
		risk = 99
	}
	msg.RiskScore = risk
	msg.AnomalyFlags = anomalies

	if risk >= 75 || len(anomalies) > 0 {
		msg.Severity = "CRITICAL"
		msg.ClinicalSummary = fmt.Sprintf("Critical Alert: %d clinical anomalies flagged. Patient risk index is %d%%.", len(anomalies), risk)
	} else if risk >= 40 {
		msg.Severity = "WARNING"
		msg.ClinicalSummary = fmt.Sprintf("Moderate Alert: Observation requires clinical monitoring. Risk index %d%%.", risk)
	} else {
		msg.Severity = "NORMAL"
		msg.ClinicalSummary = fmt.Sprintf("Routine Observation: Vitals within normal physiological limits. Risk index %d%%.", risk)
	}
}

// GenerateACK creates a standard HL7 v2 ACK message.
func GenerateACK(msg *HL7Message, ackCode string, text string) string {
	if ackCode == "" {
		ackCode = "AA" // Application Accept
	}
	if text == "" {
		text = "Message accepted successfully"
	}
	ctrlID := msg.MessageControlID
	if ctrlID == "" {
		ctrlID = fmt.Sprintf("ACK-%d", time.Now().UnixNano())
	}
	ts := time.Now().Format("20060102150405")

	ack := fmt.Sprintf("MSH|^~\\&|CAREDATA|ORG_CENTRAL|%s|%s|%s||ACK|%s|P|2.5\rMSA|%s|%s|%s\r",
		msg.SendingApp, msg.SendingFacility, ts, ctrlID, ackCode, msg.MessageControlID, text)
	return ack
}
