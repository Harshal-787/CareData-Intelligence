package ml

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"caredata/backend/internal/domain"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
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

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
	})
	defer rdb.Close()
	
	jobID := "ml-job-" + uuid.New().String()[:8]

	payload := map[string]interface{}{
		"job_id":        jobID,
		"bucket":        "raw-data",
		"object_name":   objectName,
		"contamination": contamination,
		"n_estimators":  nEstimators,
	}
	
	payloadBytes, _ := json.Marshal(payload)
	
	// Enqueue to Redis
	err := rdb.LPush(context.Background(), "ml_jobs", payloadBytes).Err()
	if err != nil {
		err = fmt.Errorf("failed to enqueue ml job to redis: %w", err)
		log.Printf("ML Pipeline Error: %v", err)
		return nil, nil, nil, err
	}
	
	// Poll for result
	var resBytes []byte
	maxAttempts := 120 // 120 * 2s = 240 seconds
	for i := 0; i < maxAttempts; i++ {
		resStr, err := rdb.Get(context.Background(), "ml_result:"+jobID).Result()
		if err == redis.Nil {
			time.Sleep(2 * time.Second)
			continue
		} else if err != nil {
			err = fmt.Errorf("redis error while waiting for result: %w", err)
			log.Printf("ML Pipeline Error: %v", err)
			return nil, nil, nil, err
		}
		
		resBytes = []byte(resStr)
		break
	}
	
	if len(resBytes) == 0 {
		err = fmt.Errorf("timed out waiting for ML worker to process job %s", jobID)
		log.Printf("ML Pipeline Error: %v", err)
		return nil, nil, nil, err
	}

	var res struct {
		Error    string `json:"error"`
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
			DriftReport        map[string]interface{}       `json:"driftReport"`
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
	
	if err := json.Unmarshal(resBytes, &res); err != nil {
		err = fmt.Errorf("failed to parse data engine response: %w", err)
		log.Printf("ML Pipeline Error: %v", err)
		return nil, nil, nil, err
	}

	if res.Error != "" {
		err = fmt.Errorf("ML pipeline failed: %s", res.Error)
		log.Printf("ML Pipeline Error: %v", err)
		return nil, nil, nil, err
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
		DriftReport:        res.ModelRun.DriftReport,
		CreatedAt:          now,
		CompletedAt:        &now,
	}
	
	return modelRun, anomalies, riskScores, nil
}
