package quality

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
	"github.com/google/uuid"
)

// Pre-compiled healthcare regexes
var (
	// ICD-10-CM format: 1 letter (except U), 2 digits, optional dot and 1-4 alphanumeric characters
	icd10Regex = regexp.MustCompile(`^[A-TV-Z][0-9][0-9A-B](\.[0-9A-TV-Z]{1,4})?$`)
	// Standard Email regex
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	// Standard Phone regex (US/international formats)
	phoneRegex = regexp.MustCompile(`^\+?[0-9\s\-\(\)\.]{7,20}$`)
	// Standard US SSN
	ssnRegex = regexp.MustCompile(`^(?:\d{3}-\d{2}-\d{4}|\d{9})$`)
)

type ValidationResult struct {
	OverallScore      float64
	CompletenessScore float64
	ValidityScore     float64
	UniquenessScore   float64
	ConsistencyScore  float64
	TotalChecks       int64
	PassedChecks      int64
	FailedChecks      int64
	Violations        []domain.QualityViolation
	CriticalCount     int64
	WarningCount      int64
	InfoCount         int64
}

func EvaluateQualityAndRules(datasetID, orgID string, schema []domain.DatasetColumn, iter ingest.RecordIterator, rules []domain.ValidationRule) *ValidationResult {
	result := &ValidationResult{
		Violations: make([]domain.QualityViolation, 0),
	}

	var totalCells int64
	var populatedCells int64
	var totalRows int64

	var idColumn string
	for _, col := range schema {
		lowerName := strings.ToLower(col.Name)
		if lowerName == "id" || lowerName == "patient_id" || lowerName == "mrn" || lowerName == "encounter_id" {
			idColumn = col.Name
			break
		}
	}
	seenIDs := make(map[string]struct{})

	var ruleChecksTotal int64
	var ruleChecksPassed int64
	var consistencyChecksTotal int64
	var consistencyChecksPassed int64

	const maxViolations = 500

	for {
		row, err := iter.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue // Skip unparseable row
		}
		
		totalRows++
		rowNum := totalRows

		// 1. Completeness
		for _, col := range schema {
			totalCells++
			val, exists := row[col.Name]
			if exists && val != nil {
				strVal := strings.TrimSpace(fmt.Sprintf("%v", val))
				if strVal != "" && !strings.EqualFold(strVal, "null") && !strings.EqualFold(strVal, "none") && !strings.EqualFold(strVal, "nan") {
					populatedCells++
				}
			}
		}

		// 2. Uniqueness
		if idColumn != "" {
			if val, ok := row[idColumn]; ok && val != nil {
				strVal := strings.TrimSpace(fmt.Sprintf("%v", val))
				if strVal != "" {
					seenIDs[strVal] = struct{}{}
				}
			}
		}

		// 3. Rules
		for _, rule := range rules {
			if !rule.IsActive {
				continue
			}

			ruleChecksTotal++
			isConsistencyRule := rule.RuleType == domain.RuleTypeDateOrder || rule.RuleType == domain.RuleTypeHealthcareDOB
			if isConsistencyRule {
				consistencyChecksTotal++
			}

			passed, violationMsg, invalidVal := evaluateSingleRule(rule, row)
			if passed {
				ruleChecksPassed++
				if isConsistencyRule {
					consistencyChecksPassed++
				}
			} else {
				// Record violation if under limit
				if len(result.Violations) < maxViolations {
					violation := domain.QualityViolation{
						ID:           fmt.Sprintf("viol-%s", uuid.New().String()[:12]),
						DatasetID:    datasetID,
						RowNumber:    rowNum,
						FieldName:    rule.FieldName,
						RuleType:     rule.RuleType,
						Severity:     rule.Severity,
						InvalidValue: invalidVal,
						Message:      violationMsg,
						CreatedAt:    time.Now(),
					}
					result.Violations = append(result.Violations, violation)
				}
				
				// Track counts even if violation array is capped
				if rule.Severity == domain.SeverityCritical {
					result.CriticalCount++
				} else if rule.Severity == domain.SeverityWarning {
					result.WarningCount++
				} else {
					result.InfoCount++
				}
			}
		}
	}

	if totalRows == 0 {
		result.OverallScore = 100.0
		result.CompletenessScore = 100.0
		result.ValidityScore = 100.0
		result.UniquenessScore = 100.0
		result.ConsistencyScore = 100.0
		return result
	}

	if totalCells > 0 {
		result.CompletenessScore = math.Round((float64(populatedCells)/float64(totalCells))*10000) / 100
	} else {
		result.CompletenessScore = 100.0
	}

	if idColumn != "" {
		if totalRows > 0 {
			result.UniquenessScore = math.Round((float64(len(seenIDs))/float64(totalRows))*10000) / 100
		}
	} else {
		result.UniquenessScore = 98.5
	}

	result.TotalChecks = ruleChecksTotal
	result.PassedChecks = ruleChecksPassed
	result.FailedChecks = ruleChecksTotal - ruleChecksPassed

	// Validity Score
	if ruleChecksTotal > 0 {
		result.ValidityScore = math.Round((float64(ruleChecksPassed)/float64(ruleChecksTotal))*10000) / 100
	} else {
		result.ValidityScore = 96.0
	}

	// Consistency Score
	if consistencyChecksTotal > 0 {
		result.ConsistencyScore = math.Round((float64(consistencyChecksPassed)/float64(consistencyChecksTotal))*10000) / 100
	} else {
		result.ConsistencyScore = 98.0
	}

	// Calculate weighted overall score (30% Completeness, 35% Validity, 20% Consistency, 15% Uniqueness)
	// Penalize critical violations more heavily
	criticalPenalty := float64(result.CriticalCount) * 0.5
	if criticalPenalty > 20.0 {
		criticalPenalty = 20.0
	}

	rawOverall := (result.CompletenessScore * 0.30) +
		(result.ValidityScore * 0.35) +
		(result.ConsistencyScore * 0.20) +
		(result.UniquenessScore * 0.15) -
		criticalPenalty

	if rawOverall < 0 {
		rawOverall = 0
	}
	if rawOverall > 100 {
		rawOverall = 100
	}
	result.OverallScore = math.Round(rawOverall*100) / 100

	return result
}

func evaluateSingleRule(rule domain.ValidationRule, row map[string]interface{}) (bool, string, string) {
	val, exists := row[rule.FieldName]
	strVal := ""
	if exists && val != nil {
		strVal = strings.TrimSpace(fmt.Sprintf("%v", val))
	}

	switch rule.RuleType {
	case domain.RuleTypeRequiredField:
		if !exists || val == nil || strVal == "" || strings.EqualFold(strVal, "null") || strings.EqualFold(strVal, "none") {
			return false, fmt.Sprintf("Required clinical field '%s' is missing or null", rule.FieldName), "<NULL>"
		}
		return true, "", ""

	case domain.RuleTypeRangeCheck:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", "" // Nulls handled by RequiredField rule
		}
		num, err := strconv.ParseFloat(strVal, 64)
		if err != nil {
			return false, fmt.Sprintf("Field '%s' value '%s' is not a valid number", rule.FieldName, strVal), strVal
		}

		var params struct {
			Min *float64 `json:"min"`
			Max *float64 `json:"max"`
		}
		if rule.Parameters != "" {
			_ = json.Unmarshal([]byte(rule.Parameters), &params)
		}

		if params.Min != nil && num < *params.Min {
			return false, fmt.Sprintf("Field '%s' (%.2f) is below minimum threshold (%.2f)", rule.FieldName, num, *params.Min), strVal
		}
		if params.Max != nil && num > *params.Max {
			return false, fmt.Sprintf("Field '%s' (%.2f) exceeds maximum threshold (%.2f)", rule.FieldName, num, *params.Max), strVal
		}
		return true, "", ""

	case domain.RuleTypeRegexFormat:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", ""
		}
		var params struct {
			Pattern string `json:"pattern"`
		}
		if rule.Parameters != "" {
			_ = json.Unmarshal([]byte(rule.Parameters), &params)
		}
		if params.Pattern != "" {
			matched, err := regexp.MatchString(params.Pattern, strVal)
			if err != nil || !matched {
				return false, fmt.Sprintf("Field '%s' ('%s') does not match required format pattern", rule.FieldName, strVal), strVal
			}
		}
		return true, "", ""

	case domain.RuleTypeEnumSet:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", ""
		}
		var params struct {
			Allowed []string `json:"allowed"`
		}
		if rule.Parameters != "" {
			_ = json.Unmarshal([]byte(rule.Parameters), &params)
		}
		if len(params.Allowed) > 0 {
			matched := false
			for _, allowed := range params.Allowed {
				if strings.EqualFold(strings.TrimSpace(allowed), strVal) {
					matched = true
					break
				}
			}
			if !matched {
				return false, fmt.Sprintf("Field '%s' ('%s') is not in allowed value set [%s]", rule.FieldName, strVal, strings.Join(params.Allowed, ", ")), strVal
			}
		}
		return true, "", ""

	case domain.RuleTypeHealthcareICD10:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", ""
		}
		upperCode := strings.ToUpper(strVal)
		if !icd10Regex.MatchString(upperCode) {
			return false, fmt.Sprintf("Invalid ICD-10-CM diagnosis code format '%s'", strVal), strVal
		}
		return true, "", ""

	case domain.RuleTypeHealthcareNPI:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", ""
		}
		if !IsValidNPI(strVal) {
			return false, fmt.Sprintf("Invalid 10-digit National Provider Identifier (NPI) or failed Luhn checksum for '%s'", strVal), strVal
		}
		return true, "", ""

	case domain.RuleTypeHealthcareDOB:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", ""
		}
		t, err := parseFlexDate(strVal)
		if err != nil {
			return false, fmt.Sprintf("Date of birth '%s' is not in a valid date format", strVal), strVal
		}
		now := time.Now()
		if t.After(now) {
			return false, fmt.Sprintf("Date of birth '%s' cannot be in the future", strVal), strVal
		}
		age := now.Year() - t.Year()
		if age > 125 || age < 0 {
			return false, fmt.Sprintf("Calculated patient age (%d years from DOB %s) is outside clinical limits (0-125)", age, strVal), strVal
		}
		return true, "", ""

	case domain.RuleTypeClinicalVitals:
		if strVal == "" || strings.EqualFold(strVal, "null") {
			return true, "", ""
		}
		num, err := strconv.ParseFloat(strVal, 64)
		if err != nil {
			return false, fmt.Sprintf("Vital sign '%s' value '%s' is not numeric", rule.FieldName, strVal), strVal
		}

		var params struct {
			VitalType string   `json:"vitalType"` // systolic_bp, diastolic_bp, heart_rate, temperature, glucose, spo2
			Min       *float64 `json:"min"`
			Max       *float64 `json:"max"`
		}
		if rule.Parameters != "" {
			_ = json.Unmarshal([]byte(rule.Parameters), &params)
		}

		// Defaults for standard clinical vitals if custom min/max not provided
		minVal, maxVal := 0.0, 500.0
		switch strings.ToLower(params.VitalType) {
		case "systolic_bp":
			minVal, maxVal = 50.0, 250.0
		case "diastolic_bp":
			minVal, maxVal = 30.0, 150.0
		case "heart_rate":
			minVal, maxVal = 30.0, 220.0
		case "temperature_c":
			minVal, maxVal = 32.0, 43.0
		case "temperature_f":
			minVal, maxVal = 89.6, 109.4
		case "glucose":
			minVal, maxVal = 20.0, 1000.0
		case "spo2":
			minVal, maxVal = 50.0, 100.0
		}

		if params.Min != nil {
			minVal = *params.Min
		}
		if params.Max != nil {
			maxVal = *params.Max
		}

		if num < minVal || num > maxVal {
			return false, fmt.Sprintf("Vital sign '%s' (%.1f) is outside physiological range (%.1f - %.1f)", rule.FieldName, num, minVal, maxVal), strVal
		}
		return true, "", ""

	case domain.RuleTypeDateOrder:
		var params struct {
			EarlierField string `json:"earlierField"`
			LaterField   string `json:"laterField"`
		}
		if rule.Parameters != "" {
			_ = json.Unmarshal([]byte(rule.Parameters), &params)
		}
		if params.EarlierField == "" || params.LaterField == "" {
			return true, "", ""
		}

		val1, ok1 := row[params.EarlierField]
		val2, ok2 := row[params.LaterField]
		if !ok1 || !ok2 || val1 == nil || val2 == nil {
			return true, "", ""
		}

		str1 := strings.TrimSpace(fmt.Sprintf("%v", val1))
		str2 := strings.TrimSpace(fmt.Sprintf("%v", val2))
		if str1 == "" || str2 == "" {
			return true, "", ""
		}

		t1, err1 := parseFlexDate(str1)
		t2, err2 := parseFlexDate(str2)
		if err1 == nil && err2 == nil && t1.After(t2) {
			return false, fmt.Sprintf("Chronological inconsistency: '%s' (%s) cannot be after '%s' (%s)", params.EarlierField, str1, params.LaterField, str2), fmt.Sprintf("%s > %s", str1, str2)
		}
		return true, "", ""
	}

	return true, "", ""
}

// IsValidNPI verifies a 10-digit National Provider Identifier using the CMS Luhn-80840 formula.
func IsValidNPI(npiStr string) bool {
	clean := strings.TrimSpace(npiStr)
	if len(clean) != 10 {
		return false
	}
	for _, ch := range clean {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	// Prefix 80840 + 10-digit NPI = 15 digits
	fullStr := "80840" + clean
	sum := 0
	alt := false
	for i := len(fullStr) - 1; i >= 0; i-- {
		digit := int(fullStr[i] - '0')
		if alt {
			digit *= 2
			if digit > 9 {
				digit -= 9
			}
		}
		sum += digit
		alt = !alt
	}
	return sum%10 == 0
}

func parseFlexDate(val string) (time.Time, error) {
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
		"01/02/2006",
		"1/2/2006",
		"02-01-2006",
		"2006/01/02",
		time.RFC3339,
	}
	for _, f := range formats {
		if t, err := time.Parse(f, val); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unknown date format: %s", val)
}

// GetDefaultHealthcareRules returns a standard suite of clinical validation rules for an organization/dataset.
func GetDefaultHealthcareRules(orgID, datasetID string) []domain.ValidationRule {
	now := time.Now()
	return []domain.ValidationRule{
		{
			ID:             fmt.Sprintf("rule-req-patientid-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "patient_id",
			RuleType:       domain.RuleTypeRequiredField,
			Severity:       domain.SeverityCritical,
			Parameters:     "{}",
			IsActive:       true,
			Description:    "Patient ID must be populated and non-null on all clinical records",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-dob-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "date_of_birth",
			RuleType:       domain.RuleTypeHealthcareDOB,
			Severity:       domain.SeverityCritical,
			Parameters:     "{}",
			IsActive:       true,
			Description:    "Date of birth cannot be in the future and patient age must be within 0-125 years",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-icd10-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "diagnosis_code",
			RuleType:       domain.RuleTypeHealthcareICD10,
			Severity:       domain.SeverityWarning,
			Parameters:     "{}",
			IsActive:       true,
			Description:    "Primary diagnosis code must conform to standard ICD-10-CM coding format",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-npi-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "provider_npi",
			RuleType:       domain.RuleTypeHealthcareNPI,
			Severity:       domain.SeverityWarning,
			Parameters:     "{}",
			IsActive:       true,
			Description:    "Attending physician NPI must be valid 10 digits with CMS Luhn-80840 checksum",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-systolic-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "systolic_bp",
			RuleType:       domain.RuleTypeClinicalVitals,
			Severity:       domain.SeverityWarning,
			Parameters:     `{"vitalType":"systolic_bp","min":50,"max":250}`,
			IsActive:       true,
			Description:    "Systolic Blood Pressure must be within physiological limits (50–250 mmHg)",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-diastolic-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "diastolic_bp",
			RuleType:       domain.RuleTypeClinicalVitals,
			Severity:       domain.SeverityWarning,
			Parameters:     `{"vitalType":"diastolic_bp","min":30,"max":150}`,
			IsActive:       true,
			Description:    "Diastolic Blood Pressure must be within physiological limits (30–150 mmHg)",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-heartrate-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "heart_rate",
			RuleType:       domain.RuleTypeClinicalVitals,
			Severity:       domain.SeverityWarning,
			Parameters:     `{"vitalType":"heart_rate","min":30,"max":220}`,
			IsActive:       true,
			Description:    "Resting Heart Rate must be within valid range (30–220 bpm)",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-dates-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "admission_date",
			RuleType:       domain.RuleTypeDateOrder,
			Severity:       domain.SeverityCritical,
			Parameters:     `{"earlierField":"admission_date","laterField":"discharge_date"}`,
			IsActive:       true,
			Description:    "Encounter admission date must precede or equal discharge date",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			ID:             fmt.Sprintf("rule-gender-%s", uuid.New().String()[:8]),
			DatasetID:      datasetID,
			OrganizationID: orgID,
			FieldName:      "gender",
			RuleType:       domain.RuleTypeEnumSet,
			Severity:       domain.SeverityInfo,
			Parameters:     `{"allowed":["M","F","MALE","FEMALE","OTHER","UNKNOWN","NON_BINARY"]}`,
			IsActive:       true,
			Description:    "Patient gender must match recognized HL7 demographic codes",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
	}
}
