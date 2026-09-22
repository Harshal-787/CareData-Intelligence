package ml

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"caredata/backend/internal/domain"
)

type MLEngine struct{}

func NewMLEngine() *MLEngine {
	return &MLEngine{}
}

func (e *MLEngine) RunPipeline(datasetID, datasetName, orgID, objectName string, contamination float64, nEstimators int) (*domain.MLModelRun, []domain.MLAnomaly, []domain.MLRiskScore, error) {
	if contamination <= 0 {
		contamination = 0.05
	}
	if nEstimators <= 0 {
		nEstimators = 200
	}
	
	if objectName == "" {
		return nil, nil, nil, fmt.Errorf("object_name (storage path) is required to run ML pipeline")
	}

	payload := map[string]interface{}{
		"bucket":        "raw-data",
		"object_name":   objectName,
		"contamination": contamination,
		"n_estimators":  nEstimators,
	}
	
	payloadBytes, _ := json.Marshal(payload)
	
	dataEngineURL := os.Getenv("DATA_ENGINE_URL")
	if dataEngineURL == "" {
		dataEngineURL = "http://localhost:8000"
	}
	
	httpResp, err := http.Post(fmt.Sprintf("%s/api/v1/ml/run", dataEngineURL), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to reach python data engine: %w", err)
	}
	defer httpResp.Body.Close()
	
	if httpResp.StatusCode != 200 {
		return nil, nil, nil, fmt.Errorf("data engine returned status %d", httpResp.StatusCode)
	}
	
	var res struct {
		ModelRun struct {
			Algorithm     string  `json:"Algorithm"`
			Accuracy      float64 `json:"Accuracy"`
			Contamination float64 `json:"Contamination"`
			NEstimators   int     `json:"NEstimators"`
			AnomalyCount  int     `json:"AnomalyCount"`
			TotalRecords  int     `json:"TotalRecords"`
		} `json:"modelRun"`
		Results []struct {
			RecordID     string                 `json:"record_id"`
			IsAnomaly    bool                   `json:"is_anomaly"`
			AnomalyScore float64                `json:"anomaly_score"`
			LaceScore    int                    `json:"lace_score"`
			RawData      map[string]interface{} `json:"raw_data"`
		} `json:"results"`
	}
	
	if err := json.NewDecoder(httpResp.Body).Decode(&res); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to parse data engine response: %w", err)
	}
	
	runID := fmt.Sprintf("run-%d", time.Now().UnixNano())
	now := time.Now()
	
	var anomalies []domain.MLAnomaly
	var riskScores []domain.MLRiskScore

	for idx, result := range res.Results {
		patientID := fmt.Sprintf("MRN-%05d", 10000+idx+1)
		patientName := fmt.Sprintf("Patient %04d", idx+1)
		encounterID := fmt.Sprintf("ENC-%05d", 20000+idx+1)
		
		if result.IsAnomaly {
			anomalies = append(anomalies, domain.MLAnomaly{
				ID:               fmt.Sprintf("anom-%d-%d", now.Unix(), idx+1),
				ModelRunID:       runID,
				DatasetID:        datasetID,
				DatasetName:      datasetName,
				OrganizationID:   orgID,
				RecordID:         result.RecordID,
				RowNumber:        idx + 1,
				PatientID:        patientID,
				EncounterID:      encounterID,
				PatientName:      patientName,
				AnomalyScore:     result.AnomalyScore,
				Severity:         domain.MLAnomalySeverityWarning,
				Category:         domain.MLAnomalyCategoryClinicalVitals,
				Description:      "Flagged as statistical outlier by Isolation Forest",
				ExplanationFlags: []string{"High isolation degree"},
				RecordData:       result.RawData,
				Status:           domain.MLAnomalyStatusPendingReview,
				CreatedAt:        now,
			})
		}
		
		// For risk scores, we map the LACE score to a risk tier
		var tier domain.MLRiskTier
		if result.LaceScore >= 10 {
			tier = domain.MLRiskTierHigh
		} else if result.LaceScore >= 5 {
			tier = domain.MLRiskTierModerate
		} else {
			tier = domain.MLRiskTierLow
		}
		
		var age int = 50
		if ageVal, ok := result.RawData["age"].(float64); ok {
			age = int(ageVal)
		}
		
		riskScores = append(riskScores, domain.MLRiskScore{
			ID:                      fmt.Sprintf("risk-%d-%d", now.Unix(), idx+1),
			ModelRunID:              runID,
			DatasetID:               datasetID,
			DatasetName:             datasetName,
			OrganizationID:          orgID,
			PatientID:               patientID,
			EncounterID:             encounterID,
			PatientName:             patientName,
			Age:                     age,
			Gender:                  "Unknown",
			PrimaryDiagnosis:        "Encounter",
			RiskScore:               float64(result.LaceScore) * 5.0, // Scale 0-100
			RiskTier:                tier,
			ReadmissionProbability:  float64(result.LaceScore) / 20.0,
			PredictedLOSDays:        5.0,
			TopDrivers:              []domain.MLRiskDriver{},
			ClinicalRecommendations: []string{"Follow standard protocol"},
			RecordData:              result.RawData,
			CreatedAt:               now,
		})
	}
	
	modelRun := &domain.MLModelRun{
		ID:             runID,
		OrganizationID: orgID,
		DatasetID:      datasetID,
		DatasetName:    datasetName,
		ModelName:      "CareData Enterprise ML Pipeline v2.0",
		ModelType:      res.ModelRun.Algorithm,
		Status:         domain.MLModelStatusCompleted,
		Accuracy:       res.ModelRun.Accuracy,
		F1Score:        0.0,
		AucRoc:         0.0,
		Contamination:  res.ModelRun.Contamination,
		NEstimators:    res.ModelRun.NEstimators,
		AnomalyCount:   int64(res.ModelRun.AnomalyCount),
		TotalRecords:   int64(res.ModelRun.TotalRecords),
		Hyperparameters: map[string]interface{}{
			"n_estimators":  res.ModelRun.NEstimators,
			"contamination": res.ModelRun.Contamination,
		},
		FeatureImportances: []domain.MLFeatureImportance{},
		CreatedAt:          now,
		CompletedAt:        &now,
	}
	
	return modelRun, anomalies, riskScores, nil
}
