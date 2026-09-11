package quality

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"

	"caredata/backend/internal/domain"
)

// ProfileDataset processes row-based records and computes comprehensive column-level statistical profiles.
func ProfileDataset(schema []domain.DatasetColumn, rows []map[string]interface{}) []domain.ColumnProfile {
	totalRows := int64(len(rows))
	if totalRows == 0 {
		profiles := make([]domain.ColumnProfile, len(schema))
		for i, col := range schema {
			profiles[i] = domain.ColumnProfile{
				ColumnName:     col.Name,
				DataType:       col.DataType,
				TotalCount:     0,
				NullCount:      0,
				NullPercentage: 0,
				DistinctCount:  0,
				UniquePct:      0,
				HealthScore:    100.0,
			}
		}
		return profiles
	}

	profiles := make([]domain.ColumnProfile, 0, len(schema))

	for _, col := range schema {
		colName := col.Name
		colType := strings.ToUpper(col.DataType)

		var nullCount int64
		distinctMap := make(map[string]int)
		var numericVals []float64

		for _, row := range rows {
			val, exists := row[colName]
			if !exists || val == nil {
				nullCount++
				continue
			}

			strVal := strings.TrimSpace(fmt.Sprintf("%v", val))
			if strVal == "" || strings.EqualFold(strVal, "null") || strings.EqualFold(strVal, "none") || strings.EqualFold(strVal, "nan") {
				nullCount++
				continue
			}

			distinctMap[strVal]++

			if colType == "INTEGER" || colType == "FLOAT" || colType == "NUMERIC" || colType == "DOUBLE" {
				if num, err := strconv.ParseFloat(strVal, 64); err == nil {
					numericVals = append(numericVals, num)
				}
			} else {
				// Also try to detect if string column contains purely numbers
				if num, err := strconv.ParseFloat(strVal, 64); err == nil {
					numericVals = append(numericVals, num)
				}
			}
		}

		distinctCount := int64(len(distinctMap))
		nullPct := 0.0
		if totalRows > 0 {
			nullPct = math.Round((float64(nullCount)/float64(totalRows))*10000) / 100
		}
		uniquePct := 0.0
		nonNullCount := totalRows - nullCount
		if nonNullCount > 0 {
			uniquePct = math.Round((float64(distinctCount)/float64(nonNullCount))*10000) / 100
		}

		profile := domain.ColumnProfile{
			ColumnName:     colName,
			DataType:       colType,
			TotalCount:     totalRows,
			NullCount:      nullCount,
			NullPercentage: nullPct,
			DistinctCount:  distinctCount,
			UniquePct:      uniquePct,
			HealthScore:    math.Max(0, 100.0-nullPct),
		}

		// Calculate Top Values
		type kv struct {
			Key   string
			Value int
		}
		var sortedKVs []kv
		for k, v := range distinctMap {
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
		for i := 0; i < topLimit; i++ {
			pct := 0.0
			if totalRows > 0 {
				pct = math.Round((float64(sortedKVs[i].Value)/float64(totalRows))*10000) / 100
			}
			topValues = append(topValues, domain.ValueFrequency{
				Value: sortedKVs[i].Key,
				Count: sortedKVs[i].Value,
				Pct:   pct,
			})
		}
		profile.TopValues = topValues

		// Numeric Statistics & Histograms
		if len(numericVals) > 0 && (colType == "INTEGER" || colType == "FLOAT" || colType == "NUMERIC" || colType == "DOUBLE" || len(numericVals) == int(nonNullCount)) {
			sort.Float64s(numericVals)

			minVal := numericVals[0]
			maxVal := numericVals[len(numericVals)-1]
			profile.Min = minVal
			profile.Max = maxVal

			// Mean
			var sum float64
			for _, v := range numericVals {
				sum += v
			}
			mean := sum / float64(len(numericVals))
			profile.Mean = math.Round(mean*100) / 100

			// Standard Deviation
			var sumSquares float64
			for _, v := range numericVals {
				sumSquares += (v - mean) * (v - mean)
			}
			variance := sumSquares / float64(len(numericVals))
			profile.StdDev = math.Round(math.Sqrt(variance)*100) / 100

			// Median and Quartiles
			profile.Median = math.Round(getPercentile(numericVals, 0.50)*100) / 100
			profile.Q25 = math.Round(getPercentile(numericVals, 0.25)*100) / 100
			profile.Q75 = math.Round(getPercentile(numericVals, 0.75)*100) / 100

			// Histogram Bins
			profile.Histogram = buildHistogram(numericVals, minVal, maxVal, 6)
		} else if len(sortedKVs) > 0 {
			profile.Min = sortedKVs[len(sortedKVs)-1].Key
			profile.Max = sortedKVs[0].Key
		}

		profiles = append(profiles, profile)
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
