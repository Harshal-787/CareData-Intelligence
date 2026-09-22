package quality

import (
	"fmt"
	"io"
	"math"
	"sort"
	"strconv"
	"strings"

	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
)

// ProfileDataset processes stream records and computes comprehensive column-level statistical profiles.
func ProfileDataset(schema []domain.DatasetColumn, iter ingest.RecordIterator) []domain.ColumnProfile {
	profiles := make([]domain.ColumnProfile, len(schema))
	for i, col := range schema {
		profiles[i] = domain.ColumnProfile{
			ColumnName:     col.Name,
			DataType:       col.DataType,
			HealthScore:    100.0,
		}
	}

	var totalRows int64

	// To avoid OOM on huge datasets, we collect up to 1000 numeric samples for histograms
	// and keep distinct maps for uniqueness, though for huge cardinality we could cap distinctMap.
	const maxDistinctTracking = 5000 
	const maxNumericSamples = 1000

	distinctMaps := make([]map[string]int, len(schema))
	numericSamples := make([][]float64, len(schema))
	
	for i := range schema {
		distinctMaps[i] = make(map[string]int)
	}

	for {
		row, err := iter.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		totalRows++

		for i, col := range schema {
			colName := col.Name
			colType := strings.ToUpper(col.DataType)

			val, exists := row[colName]
			if !exists {
				val, exists = row[strings.ToLower(colName)]
			}
			if !exists || val == nil {
				profiles[i].NullCount++
				continue
			}

			strVal := strings.TrimSpace(fmt.Sprintf("%v", val))
			if strVal == "" || strings.EqualFold(strVal, "null") || strings.EqualFold(strVal, "none") || strings.EqualFold(strVal, "nan") {
				profiles[i].NullCount++
				continue
			}

			if len(distinctMaps[i]) < maxDistinctTracking {
				distinctMaps[i][strVal]++
			}

			if colType == "INTEGER" || colType == "FLOAT" || colType == "NUMERIC" || colType == "DOUBLE" {
				if num, err := strconv.ParseFloat(strVal, 64); err == nil && !math.IsNaN(num) && !math.IsInf(num, 0) {
					if len(numericSamples[i]) < maxNumericSamples {
						numericSamples[i] = append(numericSamples[i], num)
					}
				}
			} else {
				// Also try to detect if string column contains purely numbers
				if num, err := strconv.ParseFloat(strVal, 64); err == nil && !math.IsNaN(num) && !math.IsInf(num, 0) {
					if len(numericSamples[i]) < maxNumericSamples {
						numericSamples[i] = append(numericSamples[i], num)
					}
				}
			}
		}
	}

	if totalRows == 0 {
		return profiles
	}

	// Finalize stats
	for i, col := range schema {
		colType := strings.ToUpper(col.DataType)
		
		profiles[i].TotalCount = totalRows
		profiles[i].NullPercentage = math.Round((float64(profiles[i].NullCount)/float64(totalRows))*10000) / 100
		profiles[i].DistinctCount = int64(len(distinctMaps[i]))
		profiles[i].UniquePct = math.Round((float64(profiles[i].DistinctCount)/float64(totalRows))*10000) / 100

		// Calculate Top Values
		type kv struct {
			Key   string
			Value int
		}
		var sortedKVs []kv
		for k, v := range distinctMaps[i] {
			sortedKVs = append(sortedKVs, kv{Key: k, Value: v})
		}
		sort.Slice(sortedKVs, func(i, j int) bool {
			return sortedKVs[i].Value > sortedKVs[j].Value
		})

		topLimit := 8
		if len(sortedKVs) < topLimit {
			topLimit = len(sortedKVs)
		}
		topValues := make([]domain.ValueFrequency, 0, topLimit)
		for j := 0; j < topLimit; j++ {
			pct := 0.0
			if totalRows > 0 {
				pct = math.Round((float64(sortedKVs[j].Value)/float64(totalRows))*10000) / 100
			}
			topValues = append(topValues, domain.ValueFrequency{
				Value: sortedKVs[j].Key,
				Count: sortedKVs[j].Value,
				Pct:   pct,
			})
		}
		profiles[i].TopValues = topValues

		// Numeric Statistics & Histograms
		if len(numericSamples[i]) > 0 && (colType == "INTEGER" || colType == "FLOAT" || colType == "NUMERIC" || colType == "DOUBLE") {
			sort.Float64s(numericSamples[i])

			minVal := numericSamples[i][0]
			maxVal := numericSamples[i][len(numericSamples[i])-1]
			profiles[i].Min = minVal
			profiles[i].Max = maxVal

			// Mean
			var sum float64
			for _, v := range numericSamples[i] {
				sum += v
			}
			mean := sum / float64(len(numericSamples[i]))
			profiles[i].Mean = math.Round(mean*100) / 100

			// Standard Deviation
			var sumSquares float64
			for _, v := range numericSamples[i] {
				sumSquares += (v - mean) * (v - mean)
			}
			variance := sumSquares / float64(len(numericSamples[i]))
			profiles[i].StdDev = math.Round(math.Sqrt(variance)*100) / 100

			// Median and Quartiles
			profiles[i].Median = math.Round(getPercentile(numericSamples[i], 0.50)*100) / 100
			profiles[i].Q25 = math.Round(getPercentile(numericSamples[i], 0.25)*100) / 100
			profiles[i].Q75 = math.Round(getPercentile(numericSamples[i], 0.75)*100) / 100

			// Histogram Bins
			profiles[i].Histogram = buildHistogram(numericSamples[i], minVal, maxVal, 6)
		} else if len(sortedKVs) > 0 {
			profiles[i].Min = sortedKVs[len(sortedKVs)-1].Key
			profiles[i].Max = sortedKVs[0].Key
		}

		// Quality Score (based on completeness, heavily penalizing > 10% missing)
		missingPenalty := profiles[i].NullPercentage * 1.5
		if missingPenalty > 100 {
			missingPenalty = 100
		}
		profiles[i].HealthScore = math.Round((100.0-missingPenalty)*10) / 10
	}

	return profiles
}

func getPercentile(sortedVals []float64, p float64) float64 {
	n := len(sortedVals)
	if n == 0 {
		return 0
	}
	if n == 1 {
		return sortedVals[0]
	}

	index := p * float64(n-1)
	lower := int(math.Floor(index))
	upper := int(math.Ceil(index))

	if lower == upper {
		return sortedVals[lower]
	}

	weight := index - float64(lower)
	return sortedVals[lower]*(1.0-weight) + sortedVals[upper]*weight
}

func buildHistogram(vals []float64, minVal, maxVal float64, binCount int) []domain.HistogramBin {
	if len(vals) == 0 || binCount <= 0 {
		return nil
	}

	if minVal == maxVal {
		return []domain.HistogramBin{
			{
				BinLabel: fmt.Sprintf("%.1f", minVal),
				MinVal:   minVal,
				MaxVal:   maxVal,
				Count:    len(vals),
			},
		}
	}

	binWidth := (maxVal - minVal) / float64(binCount)
	bins := make([]domain.HistogramBin, binCount)

	for i := 0; i < binCount; i++ {
		bMin := minVal + float64(i)*binWidth
		bMax := minVal + float64(i+1)*binWidth
		bins[i] = domain.HistogramBin{
			BinLabel: fmt.Sprintf("%.1f - %.1f", bMin, bMax),
			MinVal:   math.Round(bMin*100) / 100,
			MaxVal:   math.Round(bMax*100) / 100,
			Count:    0,
		}
	}

	for _, v := range vals {
		binIdx := int((v - minVal) / binWidth)
		if binIdx >= binCount {
			binIdx = binCount - 1
		}
		if binIdx < 0 {
			binIdx = 0
		}
		bins[binIdx].Count++
	}

	return bins
}
