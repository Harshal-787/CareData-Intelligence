package ingest

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand"
	"regexp"
	"strconv"
	"strings"
	"time"

	"caredata/backend/internal/domain"
)

type ParseResult struct {
	TotalRecords int64                    `json:"totalRecords"`
	ColumnsCount int                      `json:"columnsCount"`
	Schema       []domain.DatasetColumn   `json:"schema"`
	Preview      []map[string]interface{} `json:"preview"`
	QualityScore float64                  `json:"qualityScore"`
}

var datePatterns = []string{
	"2006-01-02",
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05Z07:00",
	"01/02/2006",
	"02/01/2006",
	"2006/01/02",
}

// ParseDatasetContent inspects raw byte content, detects columns, infers data types, generates preview, and calculates quality score.
func ParseDatasetContent(fileType string, data []byte) (*ParseResult, error) {
	switch strings.ToLower(fileType) {
	case "csv":
		return parseCSV(data)
	case "json":
		return parseJSON(data)
	case "ndjson", "jsonl":
		return parseNDJSON(data)
	default:
		// Default to CSV
		return parseCSV(data)
	}
}

func parseCSV(data []byte) (*ParseResult, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("dataset content is empty")
	}

	reader := csv.NewReader(bytes.NewReader(data))
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	// Detect delimiter (e.g. comma, semicolon, tab)
	firstLine := string(bytes.Split(data, []byte("\n"))[0])
	if strings.Count(firstLine, "\t") > strings.Count(firstLine, ",") {
		reader.Comma = '\t'
	} else if strings.Count(firstLine, ";") > strings.Count(firstLine, ",") {
		reader.Comma = ';'
	}

	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV headers: %w", err)
	}

	for i, h := range headers {
		headers[i] = strings.TrimSpace(h)
		if headers[i] == "" {
			headers[i] = fmt.Sprintf("column_%d", i+1)
		}
	}

	var allRows [][]string
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Skip malformed row or continue
			continue
		}
		if len(record) == len(headers) {
			allRows = append(allRows, record)
		}
	}

	totalRecords := int64(len(allRows))
	if totalRecords == 0 {
		return &ParseResult{
			TotalRecords: 0,
			ColumnsCount: len(headers),
			Schema:       make([]domain.DatasetColumn, 0),
			Preview:      make([]map[string]interface{}, 0),
			QualityScore: 100.0,
		}, nil
	}

	// Infer types and collect samples per column
	schema := make([]domain.DatasetColumn, len(headers))
	colNullCounts := make([]int64, len(headers))

	// Sample up to 500 rows for type inference
	sampleLimit := len(allRows)
	if sampleLimit > 500 {
		sampleLimit = 500
	}

	for colIdx, header := range headers {
		typeCounts := map[string]int{
			"INTEGER":   0,
			"FLOAT":     0,
			"BOOLEAN":   0,
			"TIMESTAMP": 0,
			"STRING":    0,
		}
		var sampleValues []string
		hasNull := false

		for r := 0; r < len(allRows); r++ {
			val := strings.TrimSpace(allRows[r][colIdx])
			if val == "" || strings.EqualFold(val, "null") || strings.EqualFold(val, "n/a") || strings.EqualFold(val, "none") {
				colNullCounts[colIdx]++
				hasNull = true
				continue
			}

			if r < sampleLimit {
				inferred := inferSingleValueType(val)
				typeCounts[inferred]++
				if len(sampleValues) < 5 {
					sampleValues = append(sampleValues, val)
				}
			}
		}

		bestType := selectBestType(typeCounts)
		schema[colIdx] = domain.DatasetColumn{
			Name:         header,
			DataType:     bestType,
			Nullable:     hasNull,
			SampleValues: sampleValues,
		}
	}

	// Generate preview up to 20 rows
	previewLimit := len(allRows)
	if previewLimit > 20 {
		previewLimit = 20
	}

	preview := make([]map[string]interface{}, previewLimit)
	for r := 0; r < previewLimit; r++ {
		rowMap := make(map[string]interface{})
		for c, header := range headers {
			rawVal := allRows[r][c]
			rowMap[header] = castValue(rawVal, schema[c].DataType)
		}
		preview[r] = rowMap
	}

	// Compute quality score based on non-null ratio
	var totalCells = float64(totalRecords * int64(len(headers)))
	var totalNulls int64
	for _, n := range colNullCounts {
		totalNulls += n
	}

	qualityScore := 100.0
	if totalCells > 0 {
		completeness := (totalCells - float64(totalNulls)) / totalCells * 100.0
		qualityScore = math.Round(completeness*10) / 10
	}

	return &ParseResult{
		TotalRecords: totalRecords,
		ColumnsCount: len(headers),
		Schema:       schema,
		Preview:      preview,
		QualityScore: qualityScore,
	}, nil
}

func parseJSON(data []byte) (*ParseResult, error) {
	var records []map[string]interface{}

	if err := json.Unmarshal(data, &records); err != nil {
		// Try unmarshaling as single object
		var singleRecord map[string]interface{}
		if err2 := json.Unmarshal(data, &singleRecord); err2 == nil {
			records = []map[string]interface{}{singleRecord}
		} else {
			return nil, fmt.Errorf("invalid JSON array of objects: %w", err)
		}
	}

	return processObjectRecords(records)
}

func parseNDJSON(data []byte) (*ParseResult, error) {
	lines := bytes.Split(data, []byte("\n"))
	var records []map[string]interface{}

	for _, line := range lines {
		trimmed := bytes.TrimSpace(line)
		if len(trimmed) == 0 {
			continue
		}
		var record map[string]interface{}
		if err := json.Unmarshal(trimmed, &record); err == nil {
			records = append(records, record)
		}
	}

	if len(records) == 0 {
		return nil, fmt.Errorf("no valid JSON objects found in newline-delimited stream")
	}

	return processObjectRecords(records)
}

func processObjectRecords(records []map[string]interface{}) (*ParseResult, error) {
	totalRecords := int64(len(records))
	if totalRecords == 0 {
		return &ParseResult{
			TotalRecords: 0,
			ColumnsCount: 0,
			Schema:       make([]domain.DatasetColumn, 0),
			Preview:      make([]map[string]interface{}, 0),
			QualityScore: 100.0,
		}, nil
	}

	// Extract unique headers preserving order
	headerMap := make(map[string]bool)
	var headers []string

	for _, r := range records {
		for k := range r {
			if !headerMap[k] {
				headerMap[k] = true
				headers = append(headers, k)
			}
		}
	}

	schema := make([]domain.DatasetColumn, len(headers))
	colNullCounts := make([]int64, len(headers))

	sampleLimit := len(records)
	if sampleLimit > 500 {
		sampleLimit = 500
	}

	for colIdx, header := range headers {
		typeCounts := map[string]int{
			"INTEGER":   0,
			"FLOAT":     0,
			"BOOLEAN":   0,
			"TIMESTAMP": 0,
			"STRING":    0,
		}
		var sampleValues []string
		hasNull := false

		for r := 0; r < len(records); r++ {
			val, exists := records[r][header]
			if !exists || val == nil {
				colNullCounts[colIdx]++
				hasNull = true
				continue
			}

			strVal := fmt.Sprintf("%v", val)
			if strVal == "" || strings.EqualFold(strVal, "null") {
				colNullCounts[colIdx]++
				hasNull = true
				continue
			}

			if r < sampleLimit {
				switch val.(type) {
				case bool:
					typeCounts["BOOLEAN"]++
				case int, int64, int32, int16, int8:
					typeCounts["INTEGER"]++
				case float64, float32:
					if math.Mod(val.(float64), 1) == 0 {
						typeCounts["INTEGER"]++
					} else {
						typeCounts["FLOAT"]++
					}
				default:
					inferred := inferSingleValueType(strVal)
					typeCounts[inferred]++
				}

				if len(sampleValues) < 5 {
					sampleValues = append(sampleValues, strVal)
				}
			}
		}

		bestType := selectBestType(typeCounts)
		schema[colIdx] = domain.DatasetColumn{
			Name:         header,
			DataType:     bestType,
			Nullable:     hasNull,
			SampleValues: sampleValues,
		}
	}

	// Generate preview up to 20 rows
	previewLimit := len(records)
	if previewLimit > 20 {
		previewLimit = 20
	}
	preview := records[:previewLimit]

	// Compute quality score
	var totalCells = float64(totalRecords * int64(len(headers)))
	var totalNulls int64
	for _, n := range colNullCounts {
		totalNulls += n
	}

	qualityScore := 100.0
	if totalCells > 0 {
		completeness := (totalCells - float64(totalNulls)) / totalCells * 100.0
		qualityScore = math.Round(completeness*10) / 10
	}

	return &ParseResult{
		TotalRecords: totalRecords,
		ColumnsCount: len(headers),
		Schema:       schema,
		Preview:      preview,
		QualityScore: qualityScore,
	}, nil
}

func inferSingleValueType(val string) string {
	val = strings.TrimSpace(val)
	if strings.EqualFold(val, "true") || strings.EqualFold(val, "false") {
		return "BOOLEAN"
	}
	if _, err := strconv.ParseInt(val, 10, 64); err == nil {
		return "INTEGER"
	}
	if _, err := strconv.ParseFloat(val, 64); err == nil {
		return "FLOAT"
	}
	for _, layout := range datePatterns {
		if _, err := time.Parse(layout, val); err == nil {
			return "TIMESTAMP"
		}
	}
	return "STRING"
}

func selectBestType(counts map[string]int) string {
	maxCount := 0
	best := "STRING"

	// Priority: TIMESTAMP > BOOLEAN > INTEGER > FLOAT > STRING
	typesOrder := []string{"INTEGER", "FLOAT", "TIMESTAMP", "BOOLEAN", "STRING"}
	for _, t := range typesOrder {
		if counts[t] > maxCount {
			maxCount = counts[t]
			best = t
		}
	}

	if maxCount == 0 {
		return "STRING"
	}
	return best
}

func castValue(raw string, dataType string) interface{} {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || strings.EqualFold(trimmed, "null") {
		return nil
	}

	switch dataType {
	case "INTEGER":
		if i, err := strconv.ParseInt(trimmed, 10, 64); err == nil {
			return i
		}
	case "FLOAT":
		if f, err := strconv.ParseFloat(trimmed, 64); err == nil {
			return f
		}
	case "BOOLEAN":
		if b, err := strconv.ParseBool(trimmed); err == nil {
			return b
		}
	}
	return trimmed
}

// -------------------------------------------------------------
// Sample Healthcare Dataset Generators
// -------------------------------------------------------------

var firstNames = []string{"James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"}
var lastNames = []string{"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"}
var diagnoses = []string{
	"E11.9 - Type 2 diabetes mellitus without complications",
	"I10 - Essential (primary) hypertension",
	"J44.9 - Chronic obstructive pulmonary disease, unspecified",
	"I25.10 - Atherosclerotic heart disease of native coronary artery",
	"K21.9 - Gastro-esophageal reflux disease without esophagitis",
	"M54.5 - Low back pain",
	"F41.1 - Generalized anxiety disorder",
	"N18.3 - Chronic kidney disease, stage 3 (moderate)",
	"I50.9 - Heart failure, unspecified",
	"J18.9 - Pneumonia, unspecified organism",
}
var departments = []string{"Cardiology", "Pulmonology", "Emergency", "Internal Medicine", "Neurology", "Orthopedics", "Oncology", "Gastroenterology"}

// GenerateClinicalEncountersCSV generates realistic clinical inpatient/outpatient encounters
func GenerateClinicalEncountersCSV(count int) ([]byte, string) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	headers := []string{
		"encounter_id", "patient_id", "patient_name", "gender", "age",
		"admission_date", "discharge_date", "department", "diagnosis_code",
		"length_of_stay_days", "systolic_bp", "diastolic_bp", "heart_rate",
		"total_cost_usd", "readmitted_30d",
	}
	_ = writer.Write(headers)

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	baseDate := time.Now().AddDate(0, -6, 0)

	for i := 1; i <= count; i++ {
		pName := fmt.Sprintf("%s %s", firstNames[r.Intn(len(firstNames))], lastNames[r.Intn(len(lastNames))])
		gender := "Female"
		if r.Float32() > 0.5 {
			gender = "Male"
		}
		age := 20 + r.Intn(70)
		daysOffset := r.Intn(180)
		admit := baseDate.AddDate(0, 0, daysOffset)
		los := 1 + r.Intn(14)
		discharge := admit.AddDate(0, 0, los)
		dept := departments[r.Intn(len(departments))]
		diag := diagnoses[r.Intn(len(diagnoses))]

		sysBP := 110 + r.Intn(50)
		diaBP := 70 + r.Intn(30)
		hr := 60 + r.Intn(45)
		cost := los*1200 + r.Intn(3500)
		readmit := "false"
		if los > 5 && r.Float32() > 0.65 {
			readmit = "true"
		}

		row := []string{
			fmt.Sprintf("ENC-%06d", 100000+i),
			fmt.Sprintf("PAT-%05d", 5000+r.Intn(count/2+1)),
			pName,
			gender,
			strconv.Itoa(age),
			admit.Format("2006-01-02"),
			discharge.Format("2006-01-02"),
			dept,
			diag,
			strconv.Itoa(los),
			strconv.Itoa(sysBP),
			strconv.Itoa(diaBP),
			strconv.Itoa(hr),
			strconv.Itoa(cost),
			readmit,
		}
		_ = writer.Write(row)
	}

	writer.Flush()
	return buf.Bytes(), "caredata_clinical_encounters_sample.csv"
}

// GeneratePatientDemographicsCSV creates synthetic demographics with intentional duplicate pairs for Phase 4 testing
func GeneratePatientDemographicsCSV(count int) ([]byte, string) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	headers := []string{
		"patient_mrn", "first_name", "last_name", "date_of_birth", "gender",
		"phone_number", "email", "address", "city", "state", "zip_code", "ssn_last4",
	}
	_ = writer.Write(headers)

	r := rand.New(rand.NewSource(42)) // Fixed seed for reproducible duplicates
	baseDate := time.Date(1955, 1, 1, 0, 0, 0, 0, time.UTC)

	cities := []string{"Boston", "Cambridge", "Worcester", "Springfield", "Lowell"}

	for i := 1; i <= count; i++ {
		fName := firstNames[r.Intn(len(firstNames))]
		lName := lastNames[r.Intn(len(lastNames))]
		gender := "F"
		if r.Float32() > 0.5 {
			gender = "M"
		}
		dob := baseDate.AddDate(r.Intn(50), r.Intn(12), r.Intn(28))
		phone := fmt.Sprintf("(617) 555-%04d", 1000+r.Intn(8999))
		email := fmt.Sprintf("%s.%s%d@healthmail.org", strings.ToLower(fName), strings.ToLower(lName), r.Intn(99))
		addr := fmt.Sprintf("%d Medical Center Blvd", 100+r.Intn(900))
		city := cities[r.Intn(len(cities))]
		zip := fmt.Sprintf("021%02d", 10+r.Intn(80))
		ssn := fmt.Sprintf("%04d", 1000+r.Intn(8999))

		// Introduce intentional fuzzy duplicates every 10 records
		if i%10 == 0 && i > 10 {
			fName = fName + " " // Slight space typo
			if r.Float32() > 0.5 {
				lName = strings.Replace(lName, "son", "sen", 1) // Soundex variant
			}
		}

		row := []string{
			fmt.Sprintf("MRN-%07d", 2000000+i),
			fName,
			lName,
			dob.Format("2006-01-02"),
			gender,
			phone,
			email,
			addr,
			city,
			"MA",
			zip,
			ssn,
		}
		_ = writer.Write(row)
	}

	writer.Flush()
	return buf.Bytes(), "caredata_patient_demographics_sample.csv"
}

// GenerateLabVitalsJSON creates structured lab and clinical vitals in JSON format
func GenerateLabVitalsJSON(count int) ([]byte, string) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	type LabRecord struct {
		LabID        string  `json:"lab_id"`
		PatientID    string  `json:"patient_id"`
		TestDate     string  `json:"test_date"`
		TestCategory string  `json:"test_category"`
		TestName     string  `json:"test_name"`
		ResultValue  float64 `json:"result_value"`
		Unit         string  `json:"unit"`
		ReferenceMin float64 `json:"reference_min"`
		ReferenceMax float64 `json:"reference_max"`
		IsAbnormal   bool    `json:"is_abnormal"`
	}

	tests := []struct {
		Category string
		Name     string
		Unit     string
		Min      float64
		Max      float64
		StdDev   float64
	}{
		{"Metabolic", "Glucose (Fasting)", "mg/dL", 70.0, 99.0, 15.0},
		{"Metabolic", "HbA1c", "%", 4.0, 5.6, 0.8},
		{"Lipid", "Total Cholesterol", "mg/dL", 125.0, 200.0, 30.0},
		{"Lipid", "HDL Cholesterol", "mg/dL", 40.0, 60.0, 10.0},
		{"Lipid", "LDL Cholesterol", "mg/dL", 50.0, 100.0, 25.0},
		{"Renal", "Serum Creatinine", "mg/dL", 0.6, 1.2, 0.3},
		{"Hematology", "White Blood Cells (WBC)", "10^3/uL", 4.5, 11.0, 2.0},
		{"Hematology", "Hemoglobin", "g/dL", 13.5, 17.5, 1.5},
	}

	var records []LabRecord
	baseDate := time.Now().AddDate(0, -3, 0)

	for i := 1; i <= count; i++ {
		t := tests[r.Intn(len(tests))]
		// Generate value with normal-like distribution and occasional outliers
		val := t.Min + (t.Max-t.Min)/2 + (r.NormFloat64() * t.StdDev)
		if val < 0.1 {
			val = t.Min * 0.5
		}
		val = math.Round(val*100) / 100

		isAbnormal := val < t.Min || val > t.Max

		testDate := baseDate.AddDate(0, 0, r.Intn(90)).Format("2006-01-02T15:04:05Z")

		records = append(records, LabRecord{
			LabID:        fmt.Sprintf("LAB-%07d", 4000000+i),
			PatientID:    fmt.Sprintf("PAT-%05d", 5000+r.Intn(100)),
			TestDate:     testDate,
			TestCategory: t.Category,
			TestName:     t.Name,
			ResultValue:  val,
			Unit:         t.Unit,
			ReferenceMin: t.Min,
			ReferenceMax: t.Max,
			IsAbnormal:   isAbnormal,
		})
	}

	jsonData, _ := json.MarshalIndent(records, "", "  ")
	return jsonData, "caredata_lab_vitals_sample.json"
}

func CleanIdentifier(name string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9_-]`)
	clean := re.ReplaceAllString(strings.TrimSpace(name), "_")
	return strings.ToLower(clean)
}
