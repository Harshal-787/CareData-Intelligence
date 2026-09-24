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
			ID                 string                       `json:"id"`
			ModelName          string                       `json:"modelName"`
			ModelType          string                       `json:"modelType"`
			Status             domain.MLModelStatus         `json:"status"`
			Accuracy           float64                      `json:"accuracy"`
			F1Score            float64                      `json:"f1Score"`
			AucRoc             float64                      `json:"aucRoc"`
			Contamination      float64                      `json:"contamination"`
			NEstimators        int                          `json:"nEstimators"`
			AnomalyCount       int64                        `json:"anomalyCount"`
			TotalRecords       int64                        `json:"totalRecords"`
			Hyperparameters    map[string]interface{}       `json:"hyperparameters"`
			FeatureImportances []domain.MLFeatureImportance `json:"featureImportances"`
		} `json:"modelRun"`
		Anomalies []struct {
			ID               string                   `json:"id"`
			RecordID         string                   `json:"recordId"`
			RowNumber        int                      `json:"rowNumber"`
			PatientID        string                   `json:"patientId"`
			EncounterID      string                   `json:"encounterId"`
			PatientName      string                   `json:"patientName"`
			AnomalyScore     float64                  `json:"anomalyScore"`
			Severity         domain.MLAnomalySeverity `json:"severity"`
			Category         domain.MLAnomalyCategory `json:"category"`
			Description      string                   `json:"description"`
			ExplanationFlags []string                 `json:"explanationFlags"`
			RecordData       map[string]interface{}   `json:"recordData"`
			Status           domain.MLAnomalyStatus   `json:"status"`
		} `json:"anomalies"`
		RiskScores []struct {
			ID                      string                 `json:"id"`
			PatientID               string                 `json:"patientId"`
			EncounterID             string                 `json:"encounterId"`
			PatientName             string                 `json:"patientName"`
			Age                     int                    `json:"age"`
			Gender                  string                 `json:"gender"`
			PrimaryDiagnosis        string                 `json:"primaryDiagnosis"`
			RiskScore               float64                `json:"riskScore"`
			RiskTier                domain.MLRiskTier      `json:"riskTier"`
			ReadmissionProbability  float64                `json:"readmissionProbability"`
			PredictedLOSDays        float64                `json:"predictedLOSDays"`
			TopDrivers              []domain.MLRiskDriver  `json:"topDrivers"`
			ClinicalRecommendations []string               `json:"clinicalRecommendations"`
			RecordData              map[string]interface{} `json:"recordData"`
		} `json:"riskScores"`
	}
	
	if err := json.NewDecoder(httpResp.Body).Decode(&res); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to parse data engine response: %w", err)
	}
	
	runID := fmt.Sprintf("run-%d", time.Now().UnixNano())
	now := time.Now()
	
	var anomalies []domain.MLAnomaly
	for _, a := range res.Anomalies {
		anomalies = append(anomalies, domain.MLAnomaly{
			ID:               a.ID,
			ModelRunID:       runID,
			DatasetID:        datasetID,
			DatasetName:      datasetName,
			OrganizationID:   orgID,
			RecordID:         a.RecordID,
			RowNumber:        a.RowNumber,
			PatientID:        a.PatientID,
			EncounterID:      a.EncounterID,
			PatientName:      a.PatientName,
			AnomalyScore:     a.AnomalyScore,
			Severity:         a.Severity,
			Category:         a.Category,
			Description:      a.Description,
			ExplanationFlags: a.ExplanationFlags,
			RecordData:       a.RecordData,
			Status:           a.Status,
			CreatedAt:        now,
		})
	}

	var riskScores []domain.MLRiskScore
	for _, r := range res.RiskScores {
		riskScores = append(riskScores, domain.MLRiskScore{
			ID:                      r.ID,
			ModelRunID:              runID,
			DatasetID:               datasetID,
			DatasetName:             datasetName,
			OrganizationID:          orgID,
			PatientID:               r.PatientID,
			EncounterID:             r.EncounterID,
			PatientName:             r.PatientName,
			Age:                     r.Age,
			Gender:                  r.Gender,
			PrimaryDiagnosis:        r.PrimaryDiagnosis,
			RiskScore:               r.RiskScore,
			RiskTier:                r.RiskTier,
			ReadmissionProbability:  r.ReadmissionProbability,
			PredictedLOSDays:        r.PredictedLOSDays,
			TopDrivers:              r.TopDrivers,
			ClinicalRecommendations: r.ClinicalRecommendations,
			RecordData:              r.RecordData,
			CreatedAt:               now,
		})
	}
	
	modelRun := &domain.MLModelRun{
		ID:                 runID,
		OrganizationID:     orgID,
		DatasetID:          datasetID,
		DatasetName:        datasetName,
		ModelName:          res.ModelRun.ModelName,
		ModelType:          res.ModelRun.ModelType,
		Status             : res.ModelRun.Status,
		Accuracy:           res.ModelRun.Accuracy,
		F1Score:            res.ModelRun.F1Score,
		AucRoc:             res.ModelRun.AucRoc,
		Contamination:      res.ModelRun.Contamination,
		NEstimators:        res.ModelRun.NEstimators,
		AnomalyCount:       res.ModelRun.AnomalyCount,
		TotalRecords:       res.ModelRun.TotalRecords,
		Hyperparameters:    res.ModelRun.Hyperparameters,
		FeatureImportances: res.ModelRun.FeatureImportances,
		CreatedAt:          now,
		CompletedAt:        &now,
	}
	
	return modelRun, anomalies, riskScores, nil
}
