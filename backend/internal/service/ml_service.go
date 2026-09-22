package service

import (
	"fmt"
	"log"
	"sync"

	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/ml"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/storage"
)

type MLService struct {
	repo   *repository.Repository
	store  storage.Storage
	cfg    *config.Config
	engine *ml.MLEngine
	mu     sync.Mutex
}

func NewMLService(repo *repository.Repository, store storage.Storage, cfg *config.Config) *MLService {
	s := &MLService{
		repo:   repo,
		store:  store,
		cfg:    cfg,
		engine: ml.NewMLEngine(),
	}
	s.ensureSeedData()
	return s
}

func (s *MLService) ensureSeedData() {
	s.mu.Lock()
	defer s.mu.Unlock()

	runs, err := s.repo.ListMLModelRuns("")
	if err == nil && len(runs) > 0 {
		return // Already have ML data
	}

	// Fetch first ready dataset
	datasets, err := s.repo.ListDatasets(domain.DatasetFilterParams{})
	if err != nil || len(datasets) == 0 {
		return // No datasets to run ML on
	}

	targetDs := datasets[0]
	if targetDs.StoragePath == "" {
		return
	}
	modelRun, anomalies, riskScores, _ := s.engine.RunPipeline(targetDs.ID, targetDs.Name, targetDs.OrganizationID, targetDs.StoragePath, 0.08, 100)
	if modelRun != nil {
		_ = s.repo.SaveMLModelRun(modelRun)
		_ = s.repo.SaveMLAnomalies(anomalies)
		_ = s.repo.SaveMLRiskScores(riskScores)
		log.Printf("✓ Initialized ML Intelligence baseline for dataset: %s", targetDs.Name)
	}
}

func (s *MLService) GetOverview(orgID, datasetID string) (*domain.MLOverviewResponse, error) {
	overview, err := s.repo.GetMLOverviewStats(orgID, datasetID)
	if err != nil {
		return nil, err
	}

	if overview.TotalInferences == 0 {
		s.ensureSeedData()
		return s.repo.GetMLOverviewStats(orgID, datasetID)
	}

	return overview, nil
}

func (s *MLService) ListAnomalies(params domain.MLFilterParams) ([]domain.MLAnomaly, int64, error) {
	anomalies, total, err := s.repo.ListMLAnomalies(params)
	if err != nil {
		return nil, 0, err
	}
	if total == 0 && params.Severity == "" && params.Category == "" && params.Search == "" {
		s.ensureSeedData()
		return s.repo.ListMLAnomalies(params)
	}
	return anomalies, total, nil
}

func (s *MLService) GetAnomalyByID(id string) (*domain.MLAnomaly, error) {
	return s.repo.GetMLAnomalyByID(id)
}

func (s *MLService) ResolveAnomaly(id string, req domain.MLResolveAnomalyRequest, resolvedBy string) error {
	status := req.Status
	if status == "" {
		status = domain.MLAnomalyStatusConfirmedAnomaly
	}
	return s.repo.UpdateMLAnomalyStatus(id, status, req.ResolutionNotes, resolvedBy)
}

func (s *MLService) ListRiskScores(params domain.MLFilterParams) ([]domain.MLRiskScore, int64, error) {
	scores, total, err := s.repo.ListMLRiskScores(params)
	if err != nil {
		return nil, 0, err
	}
	if total == 0 && params.RiskTier == "" && params.Search == "" {
		s.ensureSeedData()
		return s.repo.ListMLRiskScores(params)
	}
	return scores, total, nil
}

func (s *MLService) ListModelRuns(orgID string) ([]domain.MLModelRun, error) {
	runs, err := s.repo.ListMLModelRuns(orgID)
	if err != nil {
		return nil, err
	}
	if len(runs) == 0 {
		s.ensureSeedData()
		return s.repo.ListMLModelRuns(orgID)
	}
	return runs, nil
}

func (s *MLService) TriggerMLRun(datasetID, orgID string, req domain.MLTrainRequest) (*domain.MLModelRun, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	ds, err := s.repo.GetDatasetByID(datasetID)
	if err != nil || ds == nil {
		return nil, fmt.Errorf("dataset not found")
	}

	if ds.StoragePath == "" {
		return nil, fmt.Errorf("dataset has no physical storage path in MinIO")
	}

	contamination := req.Contamination
	if contamination <= 0 {
		contamination = 0.08
	}
	nEstimators := req.NEstimators
	if nEstimators <= 0 {
		nEstimators = 100
	}

	modelRun, anomalies, riskScores, err := s.engine.RunPipeline(ds.ID, ds.Name, orgID, ds.StoragePath, contamination, nEstimators)
	if err != nil {
		return nil, fmt.Errorf("ml inference failed: %w", err)
	}

	if err := s.repo.SaveMLModelRun(modelRun); err != nil {
		return nil, fmt.Errorf("failed saving model run: %w", err)
	}
	if err := s.repo.SaveMLAnomalies(anomalies); err != nil {
		log.Printf("Warning: error saving anomalies: %v", err)
	}
	if err := s.repo.SaveMLRiskScores(riskScores); err != nil {
		log.Printf("Warning: error saving risk scores: %v", err)
	}

	return modelRun, nil
}
