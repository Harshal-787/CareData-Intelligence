package service

import (
	"fmt"
	"math/rand"
	"time"

	"caredata/backend/internal/config"
	"caredata/backend/internal/mllp"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/streaming"
	"github.com/google/uuid"
)

// StreamService orchestrates real-time MLLP TCP streams and WebSockets.
type StreamService struct {
	repo       *repository.Repository
	hub        *streaming.Hub
	mllpServer *mllp.Server
	cfg        *config.Config
}

// NewStreamService creates a new StreamService.
func NewStreamService(repo *repository.Repository, hub *streaming.Hub, mllpServer *mllp.Server, cfg *config.Config) *StreamService {
	svc := &StreamService{
		repo:       repo,
		hub:        hub,
		mllpServer: mllpServer,
		cfg:        cfg,
	}
	return svc
}

// IngestRawHL7 parses a raw HL7 string and dispatches it through the streaming hub.
func (s *StreamService) IngestRawHL7(raw string, source string) (*mllp.HL7Message, error) {
	msg, err := mllp.ParseHL7(raw)
	if err != nil {
		return nil, fmt.Errorf("HL7 parse error: %w", err)
	}

	if source == "" {
		source = "HTTP_API"
	}

	eventType := "HL7_EVENT"
	if msg.Severity == "CRITICAL" {
		eventType = "CRITICAL_ALERT"
	}

	evt := streaming.StreamEvent{
		ID:              uuid.New().String(),
		Type:            eventType,
		Source:          source,
		Timestamp:       time.Now().UTC(),
		Payload:         msg,
		RawText:         raw,
		Severity:        msg.Severity,
		ClinicalSummary: msg.ClinicalSummary,
	}

	s.hub.Broadcast(evt)
	return msg, nil
}

// GetStats returns combined metrics from both the MLLP TCP server and WebSocket Hub.
func (s *StreamService) GetStats() map[string]interface{} {
	hubStats := s.hub.Stats()
	var mllpTotal uint64
	var mllpConns int32
	var mllpRunning bool
	var mllpPort int

	if s.mllpServer != nil {
		mllpTotal, mllpConns, mllpRunning, mllpPort = s.mllpServer.Stats()
	}

	return map[string]interface{}{
		"totalEvents":        hubStats.TotalEvents,
		"criticalAlerts":     hubStats.CriticalAlerts,
		"connectedClients":   hubStats.ConnectedClients,
		"eventsPerSec":       hubStats.EventsPerSec,
		"uptimeSeconds":      hubStats.UptimeSeconds,
		"mllpServerRunning":  mllpRunning,
		"mllpPort":           mllpPort,
		"mllpTotalPackets":   mllpTotal,
		"mllpActiveSockets":  mllpConns,
		"fhirActiveChannels": 2,
		"status":             "HEALTHY_LIVE",
	}
}

// GetHistory returns recent stream event logs.
func (s *StreamService) GetHistory(limit int) []streaming.StreamEvent {
	return s.hub.GetHistory(limit)
}

// SimulateScenario generates a realistic clinical event and injects it into the live stream.
func (s *StreamService) SimulateScenario(scenario string) (*mllp.HL7Message, error) {
	now := time.Now().Format("20060102150405")
	controlID := fmt.Sprintf("SIM-%d", rand.Intn(90000)+10000)

	var rawHL7 string

	switch scenario {
	case "icu_deterioration":
		// Critical ICU vitals: SpO2 = 83%, SBP = 68, Lactate = 4.8
		rawHL7 = fmt.Sprintf(
			"MSH|^~\\&|ICU_MONITOR_04|METRO_HEALTH|CAREDATA|CENTRAL|%s||ORU^R01|%s|P|2.5\r"+
				"PID|1||PAT-84920^^^MRN||DOE^JOHN||19720415|M|||123 MAIN ST^^NEW YORK^NY\r"+
				"PV1|1|I|ICU^BED-03^01||||DOC-102^SMITH^EMILY\r"+
				"OBX|1|NM|2708-6^Oxygen Saturation^LN||83|%%|95-100|LL|||F\r"+
				"OBX|2|NM|8480-6^Systolic Blood Pressure^LN||68|mmHg|90-120|LL|||F\r"+
				"OBX|3|NM|8867-4^Heart Rate^LN||134|bpm|60-100|HH|||F\r"+
				"OBX|4|NM|2524-7^Serum Lactate^LN||4.8|mmol/L|0.5-2.0|HH|||F\r",
			now, controlID)

	case "ed_admission":
		// Emergency Room Admission ADT^A01
		rawHL7 = fmt.Sprintf(
			"MSH|^~\\&|EPIC_ED_ADMIT|TRAUMA_CENTER|CAREDATA|CENTRAL|%s||ADT^A01|%s|P|2.5\r"+
				"PID|1||PAT-33819^^^MRN||MARTINEZ^CARLOS||19850920|M|||742 EVERGREEN TER^^SPRINGFIELD^IL\r"+
				"PV1|1|E|EMERGENCY^ROOM-12^BAY-B||||DOC-404^HOUSE^GREGORY\r"+
				"OBX|1|NM|8310-5^Body Temperature^LN||38.9|C|36.5-37.5|H|||F\r"+
				"OBX|2|NM|8480-6^Systolic Blood Pressure^LN||142|mmHg|90-120|H|||F\r",
			now, controlID)

	case "cardiac_arrhythmia":
		// Cardiac telemetry event with severe tachycardia
		rawHL7 = fmt.Sprintf(
			"MSH|^~\\&|CARDIAC_TELEMETRY|HEART_INSTITUTE|CAREDATA|CENTRAL|%s||ORU^R01|%s|P|2.5\r"+
				"PID|1||PAT-59201^^^MRN||JOHNSON^ELEANOR||19610210|F|||450 PARK AVE^^BOSTON^MA\r"+
				"PV1|1|I|CARDIOLOGY^ROOM-302^BED-A||||DOC-209^GREY^MEREDITH\r"+
				"OBX|1|NM|8867-4^Heart Rate (Ventricular)^LN||158|bpm|60-100|HH|||F\r"+
				"OBX|2|NM|8480-6^Systolic Blood Pressure^LN||178|mmHg|90-120|H|||F\r"+
				"OBX|3|NM|2708-6^Oxygen Saturation^LN||91|%%|95-100|L|||F\r",
			now, controlID)

	case "routine_lab":
		// Normal chemistry panel
		fallthrough
	default:
		rawHL7 = fmt.Sprintf(
			"MSH|^~\\&|ROCHE_COBAS_8000|CENTRAL_LAB|CAREDATA|CENTRAL|%s||ORU^R01|%s|P|2.5\r"+
				"PID|1||PAT-11029^^^MRN||TAYLOR^SARAH||19940612|F|||88 BROADWAY^^SEATTLE^WA\r"+
				"PV1|1|O|OUTPATIENT^CLINIC-B^RM-1||||DOC-305^WILSON^JAMES\r"+
				"OBX|1|NM|2345-7^Glucose (Fasting)^LN||94|mg/dL|70-99|N|||F\r"+
				"OBX|2|NM|2160-0^Creatinine^LN||0.9|mg/dL|0.6-1.2|N|||F\r"+
				"OBX|3|NM|2708-6^Oxygen Saturation^LN||98|%%|95-100|N|||F\r",
			now, controlID)
	}

	return s.IngestRawHL7(rawHL7, "SIMULATOR")
}

// TriggerBurst generates multiple rapid events in sequence.
func (s *StreamService) TriggerBurst(count int) int {
	if count <= 0 {
		count = 5
	}
	if count > 25 {
		count = 25
	}

	scenarios := []string{"icu_deterioration", "ed_admission", "cardiac_arrhythmia", "routine_lab"}
	successCount := 0

	for i := 0; i < count; i++ {
		sc := scenarios[rand.Intn(len(scenarios))]
		_, err := s.SimulateScenario(sc)
		if err == nil {
			successCount++
		}
		time.Sleep(50 * time.Millisecond)
	}
	return successCount
}
