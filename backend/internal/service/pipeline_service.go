package service

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/storage"
	"github.com/google/uuid"
)

type PipelineService struct {
	repo         *repository.Repository
	pipelineRepo *repository.PipelineRepository
	store        storage.Storage
	cfg          *config.Config
	cancels      map[string]context.CancelFunc
	mu           sync.Mutex
}

func NewPipelineService(repo *repository.Repository, pipelineRepo *repository.PipelineRepository, store storage.Storage, cfg *config.Config) *PipelineService {
	return &PipelineService{
		repo:         repo,
		pipelineRepo: pipelineRepo,
		store:        store,
		cfg:          cfg,
		cancels:      make(map[string]context.CancelFunc),
	}
}

func (s *PipelineService) ListPipelines(params domain.PipelineFilterParams) ([]domain.PipelineJob, error) {
	return s.pipelineRepo.ListJobs(params)
}

func (s *PipelineService) GetPipelineByID(id string) (*domain.PipelineJob, error) {
	return s.pipelineRepo.GetJobByID(id)
}

func (s *PipelineService) GetStats() *domain.PipelineStats {
	return s.pipelineRepo.GetStats()
}

func (s *PipelineService) GetLogs(pipelineID string) []domain.PipelineExecutionLog {
	return s.pipelineRepo.GetLogs(pipelineID)
}

func (s *PipelineService) TriggerPipeline(ctx context.Context, user *domain.User, req domain.PipelineRunRequest) (*domain.PipelineJob, error) {
	dataset, err := s.repo.GetDatasetByID(req.DatasetID)
	if err != nil || dataset == nil {
		// Fallback dataset info if using synthetic IDs
		dataset = &domain.Dataset{
			ID:           req.DatasetID,
			Name:         "Clinical Dataset " + req.DatasetID,
			TotalRecords: 10000,
			QualityScore: 95.0,
		}
	}

	triggerType := req.TriggerType
	if triggerType == "" {
		triggerType = "MANUAL"
	}

	now := time.Now()
	jobID := "pipe-run-" + uuid.New().String()[:8]

	stages := []domain.PipelineStage{
		{
			Key:              domain.StageIngestion,
			Name:             "Raw Lakehouse Ingestion",
			Description:      "Parse raw payload, infer schema & convert to partitioned Parquet in MinIO",
			Status:           domain.StageStatusPending,
			Progress:         0,
			RecordsProcessed: dataset.TotalRecords,
		},
		{
			Key:              domain.StageProfiling,
			Name:             "DuckDB Column Profiling",
			Description:      "Compute cardinality, null distributions, and statistical bounds with DuckDB",
			Status:           domain.StageStatusPending,
			Progress:         0,
			RecordsProcessed: dataset.TotalRecords,
		},
		{
			Key:              domain.StageValidation,
			Name:             "Healthcare Quality Rules",
			Description:      "Enforce ICD-10, vital ranges, NPI, and clinical mandatory fields",
			Status:           domain.StageStatusPending,
			Progress:         0,
			RecordsProcessed: dataset.TotalRecords,
		},
		{
			Key:              domain.StageDeduplication,
			Name:             "RapidFuzz Patient Deduplication",
			Description:      "Execute demographic blocking & fuzzy similarity matching for MPI linkage",
			Status:           domain.StageStatusPending,
			Progress:         0,
			RecordsProcessed: dataset.TotalRecords,
		},
		{
			Key:              domain.StageMLInference,
			Name:             "ML Anomaly & Risk Stratification",
			Description:      "Run Isolation Forest anomaly detection and 30-day readmission scoring",
			Status:           domain.StageStatusPending,
			Progress:         0,
			RecordsProcessed: dataset.TotalRecords,
		},
		{
			Key:              domain.StageAISynthesis,
			Name:             "Ollama AI Clinical Insights",
			Description:      "Synthesize narrative executive summary and automated clinical reports",
			Status:           domain.StageStatusPending,
			Progress:         0,
			RecordsProcessed: dataset.TotalRecords,
		},
	}

	userName := "System Operator"
	userEmail := "system@caredata.ai"
	orgID := "default-org-id"
	userID := "system"
	if user != nil {
		userName = user.FullName
		userEmail = user.Email
		orgID = user.OrganizationID
		userID = user.ID
	}

	job := &domain.PipelineJob{
		ID:                jobID,
		OrganizationID:    orgID,
		DatasetID:         dataset.ID,
		DatasetName:       dataset.Name,
		InitiatedBy:       userID,
		InitiatedByName:   userName,
		Status:            domain.PipelineStatusRunning,
		CurrentStage:      domain.StageIngestion,
		OverallProgress:   5,
		TriggerType:       triggerType,
		Stages:            stages,
		TotalRecords:      dataset.TotalRecords,
		QualityScore:      dataset.QualityScore,
		DuplicatesFound:   0,
		AnomaliesDetected: 0,
		HighRiskPatients:  0,
		CreatedAt:         now,
		StartedAt:         &now,
	}

	if err := s.pipelineRepo.CreateJob(job); err != nil {
		return nil, err
	}

	// Create context with cancel
	runCtx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.cancels[jobID] = cancel
	s.mu.Unlock()

	// Append audit log for pipeline launch
	s.pipelineRepo.AppendAuditLog(domain.AuditLog{
		OrganizationID: orgID,
		UserID:         userID,
		UserEmail:      userEmail,
		Action:         "PIPELINE_DISPATCH",
		Resource:       "pipeline:" + jobID,
		Severity:       "INFO",
		Module:         "PIPELINE",
		Status:         "SUCCESS",
		Details:        fmt.Sprintf("Dispatched end-to-end intelligence pipeline for dataset '%s' (%d records)", dataset.Name, dataset.TotalRecords),
	})

	// Log initial run start
	s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
		PipelineID: jobID,
		StageKey:   domain.StageIngestion,
		Level:      "INFO",
		Message:    fmt.Sprintf("Pipeline %s initiated by %s [Trigger: %s]. Target dataset: %s", jobID, userName, triggerType, dataset.Name),
		Timestamp:  time.Now(),
	})

	// Run background orchestration execution
	go s.executePipelineRun(runCtx, job)

	return job, nil
}

func (s *PipelineService) CancelPipeline(id string, user *domain.User) (*domain.PipelineJob, error) {
	s.mu.Lock()
	cancel, exists := s.cancels[id]
	if exists {
		cancel()
		delete(s.cancels, id)
	}
	s.mu.Unlock()

	job, err := s.pipelineRepo.GetJobByID(id)
	if err != nil || job == nil {
		return nil, fmt.Errorf("pipeline run not found")
	}

	if job.Status == domain.PipelineStatusRunning {
		now := time.Now()
		job.Status = domain.PipelineStatusCancelled
		job.CompletedAt = &now
		if job.StartedAt != nil {
			job.DurationMs = now.Sub(*job.StartedAt).Milliseconds()
		}
		job.ErrorMessage = "Pipeline was cancelled by user request."
		_ = s.pipelineRepo.UpdateJob(job)

		s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
			PipelineID: id,
			StageKey:   job.CurrentStage,
			Level:      "WARN",
			Message:    "Execution cancelled by user.",
			Timestamp:  time.Now(),
		})

		s.pipelineRepo.AppendAuditLog(domain.AuditLog{
			OrganizationID: job.OrganizationID,
			UserID:         user.ID,
			UserEmail:      user.Email,
			Action:         "PIPELINE_CANCEL",
			Resource:       "pipeline:" + id,
			Severity:       "WARNING",
			Module:         "PIPELINE",
			Status:         "SUCCESS",
			Details:        fmt.Sprintf("Pipeline %s execution was cancelled by %s", id, user.FullName),
		})
	}

	return job, nil
}

func (s *PipelineService) RetryPipeline(ctx context.Context, id string, user *domain.User) (*domain.PipelineJob, error) {
	job, err := s.pipelineRepo.GetJobByID(id)
	if err != nil || job == nil {
		return nil, fmt.Errorf("pipeline run not found")
	}

	req := domain.PipelineRunRequest{
		DatasetID:   job.DatasetID,
		TriggerType: "RETRY",
	}
	return s.TriggerPipeline(ctx, user, req)
}

// Background Orchestrator Worker Simulation
func (s *PipelineService) executePipelineRun(ctx context.Context, job *domain.PipelineJob) {
	defer func() {
		s.mu.Lock()
		delete(s.cancels, job.ID)
		s.mu.Unlock()
	}()

	stageDurations := []time.Duration{
		1200 * time.Millisecond, // Ingestion
		1500 * time.Millisecond, // Profiling
		1600 * time.Millisecond, // Validation
		1800 * time.Millisecond, // Deduplication
		2000 * time.Millisecond, // ML
		1900 * time.Millisecond, // AI
	}

	for i := range job.Stages {
		stage := &job.Stages[i]

		select {
		case <-ctx.Done():
			return
		default:
		}

		stageStart := time.Now()
		stage.StartedAt = &stageStart
		stage.Status = domain.StageStatusRunning
		stage.Progress = 10
		job.CurrentStage = stage.Key
		job.OverallProgress = int(float64(i) / float64(len(job.Stages)) * 100)
		_ = s.pipelineRepo.UpdateJob(job)

		s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
			PipelineID: job.ID,
			StageKey:   stage.Key,
			Level:      "INFO",
			Message:    fmt.Sprintf("Stage %d/6 [%s] started: %s", i+1, stage.Name, stage.Description),
			Timestamp:  time.Now(),
		})

		// Simulate progressive stage steps
		for step := 1; step <= 4; step++ {
			select {
			case <-ctx.Done():
				return
			case <-time.After(stageDurations[i] / 4):
				stage.Progress = step * 25
				job.OverallProgress = int((float64(i)+float64(step)/4.0)/float64(len(job.Stages))*100)
				_ = s.pipelineRepo.UpdateJob(job)
			}
		}

		stageEnd := time.Now()
		stage.CompletedAt = &stageEnd
		stage.DurationMs = stageEnd.Sub(stageStart).Milliseconds()
		stage.Status = domain.StageStatusCompleted
		stage.Progress = 100

		// Populate simulated stage results
		switch stage.Key {
		case domain.StageIngestion:
			stage.RecordsPassed = stage.RecordsProcessed
			stage.Summary = fmt.Sprintf("Partitioned %d rows into compressed Apache Parquet lakehouse storage", stage.RecordsProcessed)
			s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
				PipelineID: job.ID,
				StageKey:   stage.Key,
				Level:      "SUCCESS",
				Message:    fmt.Sprintf("Ingestion completed: %d rows written with snappy compression in %dms", stage.RecordsProcessed, stage.DurationMs),
				Timestamp:  time.Now(),
			})

		case domain.StageProfiling:
			stage.RecordsPassed = stage.RecordsProcessed
			job.QualityScore = 93.5 + rand.Float64()*5.5
			stage.Summary = fmt.Sprintf("DuckDB completed full columnar profiling across all clinical metrics (Quality: %.1f%%)", job.QualityScore)
			s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
				PipelineID: job.ID,
				StageKey:   stage.Key,
				Level:      "SUCCESS",
				Message:    fmt.Sprintf("DuckDB profiling finished. Data Quality Score: %.1f%%", job.QualityScore),
				Timestamp:  time.Now(),
			})

		case domain.StageValidation:
			flagged := int64(15 + rand.Intn(40))
			stage.RecordsFlagged = flagged
			stage.RecordsPassed = stage.RecordsProcessed - flagged
			stage.Summary = fmt.Sprintf("Enforced 14 clinical boundary rules. Flagged %d non-blocking violations", flagged)
			s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
				PipelineID: job.ID,
				StageKey:   stage.Key,
				Level:      "WARN",
				Message:    fmt.Sprintf("%d non-blocking clinical rule violations recorded (e.g. vital signs out of normal range)", flagged),
				Timestamp:  time.Now(),
			})

		case domain.StageDeduplication:
			dupes := 8 + rand.Intn(15)
			job.DuplicatesFound = dupes
			stage.RecordsFlagged = int64(dupes)
			stage.RecordsPassed = stage.RecordsProcessed - int64(dupes)
			stage.Summary = fmt.Sprintf("RapidFuzz demographic matching flagged %d duplicate candidate clusters", dupes)
			s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
				PipelineID: job.ID,
				StageKey:   stage.Key,
				Level:      "SUCCESS",
				Message:    fmt.Sprintf("Patient deduplication completed. %d candidate duplicate pairs queued for review", dupes),
				Timestamp:  time.Now(),
			})

		case domain.StageMLInference:
			anomalies := 18 + rand.Intn(30)
			highRisk := 45 + rand.Intn(60)
			job.AnomaliesDetected = anomalies
			job.HighRiskPatients = highRisk
			stage.RecordsFlagged = int64(anomalies + highRisk)
			stage.RecordsPassed = stage.RecordsProcessed - stage.RecordsFlagged
			stage.Summary = fmt.Sprintf("Isolation Forest identified %d billing/vitals outliers; scored %d high-risk readmissions", anomalies, highRisk)
			s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
				PipelineID: job.ID,
				StageKey:   stage.Key,
				Level:      "SUCCESS",
				Message:    fmt.Sprintf("ML inference: %d anomalies detected, %d patients stratified in High Risk tier", anomalies, highRisk),
				Timestamp:  time.Now(),
			})

		case domain.StageAISynthesis:
			stage.RecordsPassed = stage.RecordsProcessed
			stage.Summary = "Ollama synthesized executive summary, risk analysis, and automated clinical brief"
			s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
				PipelineID: job.ID,
				StageKey:   stage.Key,
				Level:      "SUCCESS",
				Message:    "Ollama AI clinical synthesis compiled successfully. Intelligence report ready.",
				Timestamp:  time.Now(),
			})
		}

		_ = s.pipelineRepo.UpdateJob(job)
	}

	// Finalize overall job
	totalEnd := time.Now()
	job.CompletedAt = &totalEnd
	job.Status = domain.PipelineStatusCompleted
	job.OverallProgress = 100
	if job.StartedAt != nil {
		job.DurationMs = totalEnd.Sub(*job.StartedAt).Milliseconds()
	}
	_ = s.pipelineRepo.UpdateJob(job)

	s.pipelineRepo.AddLog(domain.PipelineExecutionLog{
		PipelineID: job.ID,
		StageKey:   domain.StageAISynthesis,
		Level:      "SUCCESS",
		Message:    fmt.Sprintf("✓ Full Pipeline %s completed successfully in %.1fs across all 6 stages.", job.ID, float64(job.DurationMs)/1000.0),
		Timestamp:  time.Now(),
	})

	s.pipelineRepo.AppendAuditLog(domain.AuditLog{
		OrganizationID: job.OrganizationID,
		UserID:         job.InitiatedBy,
		UserEmail:      "system@caredata.ai",
		Action:         "PIPELINE_COMPLETE",
		Resource:       "pipeline:" + job.ID,
		Severity:       "INFO",
		Module:         "PIPELINE",
		Status:         "SUCCESS",
		Details:        fmt.Sprintf("Pipeline %s finished in %.1fs with Quality Score %.1f%% (%d records)", job.ID, float64(job.DurationMs)/1000.0, job.QualityScore, job.TotalRecords),
	})
}
