package dedupe

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"unicode"

	"caredata/backend/internal/domain"
	"github.com/google/uuid"
)

// DefaultDemographicWeights provides balanced clinical matching weights
func DefaultDemographicWeights() domain.DemographicWeights {
	return domain.DemographicWeights{
		FirstNameWeight: 0.20,
		LastNameWeight:  0.25,
		DOBWeight:       0.25,
		PhoneWeight:     0.10,
		AddressWeight:   0.10,
		MRNWeight:       0.05,
		GenderWeight:    0.05,
		EmailWeight:     0.05,
	}
}

// Soundex encodes a word into its Soundex phonetic key (e.g., "Smith" -> "S530")
func Soundex(s string) string {
	s = strings.ToUpper(strings.TrimSpace(s))
	if len(s) == 0 {
		return ""
	}

	var runes []rune
	for _, r := range s {
		if unicode.IsLetter(r) {
			runes = append(runes, r)
		}
	}
	if len(runes) == 0 {
		return ""
	}

	codeMap := map[rune]rune{
		'B': '1', 'F': '1', 'P': '1', 'V': '1',
		'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
		'D': '3', 'T': '3',
		'L': '4',
		'M': '5', 'N': '5',
		'R': '6',
	}

	var res []rune
	res = append(res, runes[0])
	prevCode := codeMap[runes[0]]

	for i := 1; i < len(runes); i++ {
		currCode, exists := codeMap[runes[i]]
		if exists {
			if currCode != prevCode {
				res = append(res, currCode)
				prevCode = currCode
			}
		} else {
			// vowels and H, W, Y reset previous code
			prevCode = '0'
		}
		if len(res) == 4 {
			break
		}
	}

	for len(res) < 4 {
		res = append(res, '0')
	}

	return string(res)
}

// LevenshteinDistance calculates minimum edits between two strings
func LevenshteinDistance(s1, s2 string) int {
	r1, r2 := []rune(s1), []rune(s2)
	l1, l2 := len(r1), len(r2)
	if l1 == 0 {
		return l2
	}
	if l2 == 0 {
		return l1
	}

	d := make([][]int, l1+1)
	for i := range d {
		d[i] = make([]int, l2+1)
		d[i][0] = i
	}
	for j := 0; j <= l2; j++ {
		d[0][j] = j
	}

	for i := 1; i <= l1; i++ {
		for j := 1; j <= l2; j++ {
			cost := 0
			if r1[i-1] != r2[j-1] {
				cost = 1
			}
			d[i][j] = min3(
				d[i-1][j]+1,
				d[i][j-1]+1,
				d[i-1][j-1]+cost,
			)
		}
	}
	return d[l1][l2]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// LevenshteinSimilarity returns 0.0 to 1.0 similarity ratio
func LevenshteinSimilarity(s1, s2 string) float64 {
	s1, s2 = strings.TrimSpace(strings.ToLower(s1)), strings.TrimSpace(strings.ToLower(s2))
	if s1 == s2 {
		return 1.0
	}
	if len(s1) == 0 || len(s2) == 0 {
		return 0.0
	}
	dist := LevenshteinDistance(s1, s2)
	maxLen := math.Max(float64(len([]rune(s1))), float64(len([]rune(s2))))
	return math.Max(0.0, 1.0-(float64(dist)/maxLen))
}

// JaroSimilarity calculates Jaro score (0.0 to 1.0)
func JaroSimilarity(s1, s2 string) float64 {
	s1, s2 = strings.TrimSpace(strings.ToLower(s1)), strings.TrimSpace(strings.ToLower(s2))
	if s1 == s2 {
		return 1.0
	}
	l1, l2 := len(s1), len(s2)
	if l1 == 0 || l2 == 0 {
		return 0.0
	}

	matchDistance := (int(math.Max(float64(l1), float64(l2))) / 2) - 1
	if matchDistance < 0 {
		matchDistance = 0
	}

	s1Matches := make([]bool, l1)
	s2Matches := make([]bool, l2)

	matches := 0
	for i := 0; i < l1; i++ {
		start := int(math.Max(0, float64(i-matchDistance)))
		end := int(math.Min(float64(i+matchDistance+1), float64(l2)))

		for j := start; j < end; j++ {
			if s2Matches[j] || s1[i] != s2[j] {
				continue
			}
			s1Matches[i] = true
			s2Matches[j] = true
			matches++
			break
		}
	}

	if matches == 0 {
		return 0.0
	}

	transpositions := 0.0
	k := 0
	for i := 0; i < l1; i++ {
		if !s1Matches[i] {
			continue
		}
		for !s2Matches[k] {
			k++
		}
		if s1[i] != s2[k] {
			transpositions++
		}
		k++
	}

	return ((float64(matches) / float64(l1)) +
		(float64(matches) / float64(l2)) +
		((float64(matches) - transpositions/2.0) / float64(matches))) / 3.0
}

// JaroWinklerSimilarity calculates Jaro-Winkler score with common prefix boost
func JaroWinklerSimilarity(s1, s2 string) float64 {
	jaro := JaroSimilarity(s1, s2)
	if jaro < 0.7 {
		return jaro
	}

	s1, s2 = strings.TrimSpace(strings.ToLower(s1)), strings.TrimSpace(strings.ToLower(s2))
	prefixLen := 0
	maxPrefix := int(math.Min(4, math.Min(float64(len(s1)), float64(len(s2)))))

	for i := 0; i < maxPrefix; i++ {
		if s1[i] == s2[i] {
			prefixLen++
		} else {
			break
		}
	}

	scalingFactor := 0.1
	return jaro + (float64(prefixLen) * scalingFactor * (1.0 - jaro))
}

// TokenSortSimilarity handles reordered words (e.g. "123 Main St, Apt 4" vs "Apt 4, 123 Main St")
func TokenSortSimilarity(s1, s2 string) float64 {
	s1Clean := cleanTokens(s1)
	s2Clean := cleanTokens(s2)
	if s1Clean == s2Clean {
		return 1.0
	}
	return LevenshteinSimilarity(s1Clean, s2Clean)
}

func cleanTokens(s string) string {
	s = strings.ToLower(s)
	reg := regexp.MustCompile(`[^a-z0-9\s]`)
	s = reg.ReplaceAllString(s, " ")
	tokens := strings.Fields(s)
	// simple insertion sort
	for i := 1; i < len(tokens); i++ {
		for j := i; j > 0 && tokens[j] < tokens[j-1]; j-- {
			tokens[j], tokens[j-1] = tokens[j-1], tokens[j]
		}
	}
	return strings.Join(tokens, " ")
}

// SanitizeDigits removes non-digit characters
func SanitizeDigits(s string) string {
	var sb strings.Builder
	for _, r := range s {
		if unicode.IsDigit(r) {
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

// ExtractDemographics extracts demographic fields from a generic row map
type PatientRecord struct {
	Index       int
	ID          string
	FirstName   string
	LastName    string
	DOB         string
	Phone       string
	Address     string
	MRN         string
	Gender           string
	Email            string
	EmergencyContact string
	RawData          map[string]interface{}
}

func ExtractPatientRecord(index int, row map[string]interface{}) PatientRecord {
	rec := PatientRecord{
		Index:   index,
		RawData: row,
	}

	// Try finding ID / MRN / PatientID
	rec.ID = fmt.Sprintf("row-%d", index+1)

	for k, v := range row {
		if v == nil {
			continue
		}
		valStr := strings.TrimSpace(fmt.Sprintf("%v", v))
		lowerKey := strings.ToLower(strings.ReplaceAll(k, "_", ""))
		lowerKey = strings.ReplaceAll(lowerKey, "-", "")
		lowerKey = strings.ReplaceAll(lowerKey, " ", "")

		switch {
		case strings.Contains(lowerKey, "firstname") || lowerKey == "first" || lowerKey == "fname" || lowerKey == "givenname":
			rec.FirstName = valStr
		case strings.Contains(lowerKey, "lastname") || lowerKey == "last" || lowerKey == "lname" || lowerKey == "surname" || lowerKey == "familyname":
			rec.LastName = valStr
		case strings.Contains(lowerKey, "patientname") || strings.Contains(lowerKey, "fullname") || lowerKey == "name":
			if rec.FirstName == "" && rec.LastName == "" {
				parts := strings.Fields(valStr)
				if len(parts) == 1 {
					rec.LastName = parts[0]
				} else if len(parts) >= 2 {
					rec.FirstName = parts[0]
					rec.LastName = strings.Join(parts[1:], " ")
				}
			}
		case strings.Contains(lowerKey, "dob") || strings.Contains(lowerKey, "birthdate") || strings.Contains(lowerKey, "dateofbirth") || lowerKey == "birth":
			rec.DOB = valStr
		case strings.Contains(lowerKey, "phone") || strings.Contains(lowerKey, "mobile") || strings.Contains(lowerKey, "contact"):
			rec.Phone = valStr
		case strings.Contains(lowerKey, "address") || strings.Contains(lowerKey, "street") || lowerKey == "addr" || lowerKey == "city":
			if rec.Address == "" {
				rec.Address = valStr
			} else {
				rec.Address += " " + valStr
			}
		case lowerKey == "mrn" || strings.Contains(lowerKey, "patientid") || strings.Contains(lowerKey, "medicalrecord") || lowerKey == "ssn" || lowerKey == "nationalid":
			rec.MRN = valStr
			if rec.ID == fmt.Sprintf("row-%d", index+1) {
				rec.ID = valStr
			}
		case strings.Contains(lowerKey, "gender") || strings.Contains(lowerKey, "sex"):
			rec.Gender = valStr
		case strings.Contains(lowerKey, "email") || strings.Contains(lowerKey, "mail"):
			rec.Email = valStr
		case strings.Contains(lowerKey, "emergency") || strings.Contains(lowerKey, "nok") || strings.Contains(lowerKey, "kin"):
			rec.EmergencyContact = valStr
		}
	}

	return rec
}

// CompareRecords scores two patient records across demographic attributes
func CompareRecords(a, b PatientRecord, weights domain.DemographicWeights) (float64, []domain.FieldSimilarityScore) {
	var fieldScores []domain.FieldSimilarityScore
	var totalWeight float64 = 0.0
	var weightedSum float64 = 0.0

	// 1. First Name Score (Jaro-Winkler)
	if a.FirstName != "" && b.FirstName != "" {
		score := JaroWinklerSimilarity(a.FirstName, b.FirstName)
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "First Name",
			Score:     round2(score * 100),
			Match:     score >= 0.85,
			ValA:      a.FirstName,
			ValB:      b.FirstName,
		})
		w := math.Max(0.01, weights.FirstNameWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 2. Last Name Score (Jaro-Winkler + Soundex bonus)
	if a.LastName != "" && b.LastName != "" {
		jwScore := JaroWinklerSimilarity(a.LastName, b.LastName)
		sndxA := Soundex(a.LastName)
		sndxB := Soundex(b.LastName)
		score := jwScore
		if sndxA != "" && sndxA == sndxB {
			score = math.Min(1.0, score+0.05)
		}
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Last Name",
			Score:     round2(score * 100),
			Match:     score >= 0.85,
			ValA:      a.LastName,
			ValB:      b.LastName,
		})
		w := math.Max(0.01, weights.LastNameWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 3. Date of Birth Score
	if a.DOB != "" && b.DOB != "" {
		score := compareDOB(a.DOB, b.DOB)
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Date of Birth",
			Score:     round2(score * 100),
			Match:     score >= 0.90,
			ValA:      a.DOB,
			ValB:      b.DOB,
		})
		w := math.Max(0.01, weights.DOBWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 4. Phone Number Score (Digit match)
	if a.Phone != "" && b.Phone != "" {
		digitsA := SanitizeDigits(a.Phone)
		digitsB := SanitizeDigits(b.Phone)
		score := 0.0
		if digitsA != "" && digitsB != "" {
			if digitsA == digitsB {
				score = 1.0
			} else if len(digitsA) >= 7 && len(digitsB) >= 7 && (strings.HasSuffix(digitsA, digitsB[len(digitsB)-7:]) || strings.HasSuffix(digitsB, digitsA[len(digitsA)-7:])) {
				score = 0.90
			} else {
				score = LevenshteinSimilarity(digitsA, digitsB)
			}
		}
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Phone Number",
			Score:     round2(score * 100),
			Match:     score >= 0.85,
			ValA:      a.Phone,
			ValB:      b.Phone,
		})
		w := math.Max(0.01, weights.PhoneWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 5. Address / Street Score (Token Sort Similarity)
	if a.Address != "" && b.Address != "" {
		score := TokenSortSimilarity(a.Address, b.Address)
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Address",
			Score:     round2(score * 100),
			Match:     score >= 0.80,
			ValA:      a.Address,
			ValB:      b.Address,
		})
		w := math.Max(0.01, weights.AddressWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 6. MRN / ID Score
	if a.MRN != "" && b.MRN != "" {
		cleanA := strings.ToUpper(strings.TrimSpace(a.MRN))
		cleanB := strings.ToUpper(strings.TrimSpace(b.MRN))
		score := 0.0
		if cleanA == cleanB {
			score = 1.0
		} else {
			score = LevenshteinSimilarity(cleanA, cleanB)
		}
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Medical Record # (MRN)",
			Score:     round2(score * 100),
			Match:     score >= 0.90,
			ValA:      a.MRN,
			ValB:      b.MRN,
		})
		w := math.Max(0.01, weights.MRNWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 7. Gender Match
	if a.Gender != "" && b.Gender != "" {
		gA := strings.ToUpper(strings.TrimSpace(a.Gender))[:1]
		gB := strings.ToUpper(strings.TrimSpace(b.Gender))[:1]
		score := 0.0
		if gA == gB {
			score = 1.0
		} else {
			score = 0.0
		}
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Gender",
			Score:     round2(score * 100),
			Match:     score == 1.0,
			ValA:      a.Gender,
			ValB:      b.Gender,
		})
		w := math.Max(0.01, weights.GenderWeight)
		totalWeight += w
		weightedSum += score * w
	}

	// 8. Email Match
	if a.Email != "" && b.Email != "" {
		eA := strings.ToLower(strings.TrimSpace(a.Email))
		eB := strings.ToLower(strings.TrimSpace(b.Email))
		score := LevenshteinSimilarity(eA, eB)
		fieldScores = append(fieldScores, domain.FieldSimilarityScore{
			FieldName: "Email",
			Score:     round2(score * 100),
			Match:     score >= 0.90,
			ValA:      a.Email,
			ValB:      b.Email,
		})
		w := math.Max(0.01, weights.EmailWeight)
		totalWeight += w
		weightedSum += score * w
	}

	if totalWeight == 0 {
		return 0.0, fieldScores
	}

	finalConfidence := weightedSum / totalWeight
	
	// Enterprise Graph / Relationship Edge Boost
	if a.EmergencyContact != "" && b.EmergencyContact != "" {
		cleanA := strings.ToLower(strings.TrimSpace(a.EmergencyContact))
		cleanB := strings.ToLower(strings.TrimSpace(b.EmergencyContact))
		if cleanA == cleanB {
			// Massive boost for shared exact emergency contact (simulating Graph Relationship)
			finalConfidence += 0.20
			fieldScores = append(fieldScores, domain.FieldSimilarityScore{
				FieldName: "Emergency Contact (Graph Edge)",
				Score:     100.0,
				Match:     true,
				ValA:      a.EmergencyContact,
				ValB:      b.EmergencyContact,
			})
		}
	}
	
	// Cap at 1.0
	if finalConfidence > 1.0 {
		finalConfidence = 1.0
	}

	return round4(finalConfidence), fieldScores
}

func compareDOB(dob1, dob2 string) float64 {
	d1 := SanitizeDigits(dob1)
	d2 := SanitizeDigits(dob2)
	if d1 == "" || d2 == "" {
		return LevenshteinSimilarity(dob1, dob2)
	}
	if d1 == d2 {
		return 1.0
	}
	// Check if same year and month or day transposition
	if len(d1) == len(d2) && len(d1) == 8 {
		// YYYYMMDD or MMDDYYYY
		dist := LevenshteinDistance(d1, d2)
		if dist <= 2 {
			return 0.85
		}
	}
	return LevenshteinSimilarity(dob1, dob2)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}

// GenerateCandidatePairs performs multi-attribute blocking and pairwise fuzzy demographic matching
func GenerateCandidatePairs(rows []map[string]interface{}, datasetID, orgID string, config domain.DeduplicationConfig) []domain.DuplicatePair {
	if len(rows) < 2 {
		return nil
	}

	// 1. Extract patient records
	records := make([]PatientRecord, len(rows))
	for i, r := range rows {
		records[i] = ExtractPatientRecord(i, r)
	}

	// 2. Build multi-attribute blocks
	type PairKey struct {
		i, j int
	}
	pairMap := make(map[PairKey]bool)

	// Blocking dictionaries
	soundexBlocks := make(map[string][]int)
	dobBlocks := make(map[string][]int)
	firstInitialBlocks := make(map[string][]int)
	phoneBlocks := make(map[string][]int)

	for idx, rec := range records {
		// Block 1: Soundex of Last Name
		if rec.LastName != "" {
			sndx := Soundex(rec.LastName)
			if sndx != "" {
				soundexBlocks[sndx] = append(soundexBlocks[sndx], idx)
			}
		}
		// Block 2: Date of Birth year or full DOB
		if rec.DOB != "" {
			d := SanitizeDigits(rec.DOB)
			if len(d) >= 4 {
				yearKey := d[:4]
				dobBlocks[yearKey] = append(dobBlocks[yearKey], idx)
			}
		}
		// Block 3: First Initial + Last Initial
		if len(rec.FirstName) > 0 && len(rec.LastName) > 0 {
			initKey := strings.ToUpper(string(rec.FirstName[0]) + string(rec.LastName[0]))
			firstInitialBlocks[initKey] = append(firstInitialBlocks[initKey], idx)
		}
		// Block 4: Phone prefix/digits
		if rec.Phone != "" {
			ph := SanitizeDigits(rec.Phone)
			if len(ph) >= 6 {
				phoneBlocks[ph[:6]] = append(phoneBlocks[ph[:6]], idx)
			}
		}
	}

	addPairsFromBlocks := func(blockMap map[string][]int) {
		for _, indices := range blockMap {
			if len(indices) < 2 || len(indices) > 500 {
				continue // Skip blocks that are too huge or too small
			}
			for a := 0; a < len(indices); a++ {
				for b := a + 1; b < len(indices); b++ {
					i, j := indices[a], indices[b]
					if i > j {
						i, j = j, i
					}
					pairMap[PairKey{i, j}] = true
				}
			}
		}
	}

	// Populate candidate comparison pool
	if (config.BlockingStrategy == "ALL" && len(rows) <= 1000) || (config.BlockingStrategy == "" && len(rows) <= 300) {
		// Exhaustive scan (only allowed for small datasets <= 1000 rows, otherwise defaults to blocking to prevent CPU/memory exhaustion)
		for i := 0; i < len(records); i++ {
			for j := i + 1; j < len(records); j++ {
				pairMap[PairKey{i, j}] = true
			}
		}
	} else {
		// Force fallback to safe blocking strategies if they tried exhaustive on massive datasets
		if config.BlockingStrategy == "ALL" {
			config.BlockingStrategy = "SOUNDEX_LASTNAME" // default safe fallback
		}
		switch config.BlockingStrategy {
		case "SOUNDEX_LASTNAME":
			addPairsFromBlocks(soundexBlocks)
			addPairsFromBlocks(dobBlocks)
		case "BIRTH_YEAR":
			addPairsFromBlocks(dobBlocks)
			addPairsFromBlocks(firstInitialBlocks)
		case "FIRST_INITIAL_ZIP":
			addPairsFromBlocks(firstInitialBlocks)
			addPairsFromBlocks(phoneBlocks) // Using phone as fallback proxy for zip
		default:
			addPairsFromBlocks(soundexBlocks)
			addPairsFromBlocks(dobBlocks)
			addPairsFromBlocks(firstInitialBlocks)
			addPairsFromBlocks(phoneBlocks)
		}
	}

	// 3. Compare candidate pairs and filter by confidence threshold
	threshold := config.ConfidenceThreshold
	if threshold <= 0 {
		threshold = 0.65
	}

	var duplicatePairs []domain.DuplicatePair

	for pair := range pairMap {
		recA := records[pair.i]
		recB := records[pair.j]

		confidence, fieldScores := CompareRecords(recA, recB, config.Weights)

		if confidence >= threshold {
			pairID := fmt.Sprintf("dup-%s", uuid.New().String()[:12])
			duplicatePairs = append(duplicatePairs, domain.DuplicatePair{
				ID:              pairID,
				DatasetID:       datasetID,
				OrganizationID:  orgID,
				RecordAID:       recA.ID,
				RecordBID:       recB.ID,
				RecordAData:     recA.RawData,
				RecordBData:     recB.RawData,
				ConfidenceScore: confidence,
				FieldScores:     fieldScores,
				Status:          domain.DuplicateStatusPending,
			})
		}
	}

	return duplicatePairs
}
