package repository

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"

	"caredata/backend/internal/domain"
	"github.com/google/uuid"
)

type PipelineRepository struct {
	mu          sync.RWMutex
	jobs        map[string]*domain.PipelineJob
	logs        map[string][]domain.PipelineExecutionLog // keyed by pipeline ID
	auditChain  []domain.AuditLog
	lastHash    string
}

func NewPipelineRepository() *PipelineRepository {
	repo := &PipelineRepository{
		jobs:       make(map[string]*domain.PipelineJob),
		logs:       make(map[string][]domain.PipelineExecutionLog),
		auditChain: make([]domain.AuditLog, 0),
		lastHash:   "0000000000000000000000000000000000000000000000000000000000000000",
	}

	repo.seedInitialRuns()
	return repo
}

func (r *PipelineRepository) seedInitialRuns() {
	now := time.Now()
	t1 := now.Add(-3 * time.Hour)
	t1End := t1.Add(42 * time.Second)
	t2 := now.Add(-1 * time.Hour)
	t2End := t2.Add(58 * time.Second)

	job1 := &domain.PipelineJob{
		ID:              "pipe-run-001",
		OrganizationID:  "default-org-id",
		DatasetID:       "sample-clinical-encounters",
		DatasetName:     "MIMIC-IV Synthea Hospital Encounters Q2",
		InitiatedBy:     "usr-admin-01",
		InitiatedByName: "Dr. Sarah Lin (Lead Clinical Architect)",
		Status:          domain.PipelineStatusCompleted,
		CurrentStage:    domain.StageAISynthesis,
		OverallProgress: 100,
		TriggerType:     "MANUAL",
		TotalRecords:    12450,
		QualityScore:    94.8,
		DuplicatesFound: 18,
		AnomaliesDetected: 42,
		HighRiskPatients:  156,
		CreatedAt:       t1,
		StartedAt:       &t1,
		CompletedAt:     &t1End,
		DurationMs:      42300,
		Stages: []domain.PipelineStage{
			{
				Key:              domain.StageIngestion,
				Name:             "Raw Lakehouse Ingestion",
				Description:      "Parse raw payload, infer schema & convert to partitioned Parquet",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				StartedAt:        &t1,
				DurationMs:       4200,
				RecordsProcessed: 12450,
				RecordsPassed:    12450,
				Summary:          "12,450 records ingested and stored in MinIO raw lake with snappy compression",
			},
			{
				Key:              domain.StageProfiling,
				Name:             "DuckDB Column Profiling",
				Description:      "Compute cardinality, null distributions, and statistical bounds",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       5800,
				RecordsProcessed: 12450,
				RecordsPassed:    12450,
				Summary:          "Calculated summary statistics across 28 clinical columns in 5.8s",
			},
			{
				Key:              domain.StageValidation,
				Name:             "Healthcare Quality Rules",
				Description:      "Enforce ICD-10, vital ranges, NPI, and clinical mandatory fields",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       6400,
				RecordsProcessed: 12450,
				RecordsPassed:    11802,
				RecordsFlagged:   648,
				Summary:          "Enforced 12 active rules: 648 non-blocking violations logged",
			},
			{
				Key:              domain.StageDeduplication,
				Name:             "RapidFuzz Patient Deduplication",
				Description:      "Execute demographic blocking & fuzzy similarity matching",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       8100,
				RecordsProcessed: 12450,
				RecordsPassed:    12432,
				RecordsFlagged:   18,
				Summary:          "Identified 18 candidate duplicate patient clusters with >80% confidence",
			},
			{
				Key:              domain.StageMLInference,
				Name:             "ML Anomaly & Risk Stratification",
				Description:      "Run Isolation Forest anomaly detection and 30-day readmission scoring",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       9200,
				RecordsProcessed: 12450,
				RecordsPassed:    12294,
				RecordsFlagged:   156,
				Summary:          "Detected 42 billing/vitals outliers and scored 156 high-risk readmissions",
			},
			{
				Key:              domain.StageAISynthesis,
				Name:             "Ollama AI Clinical Insights",
				Description:      "Synthesize narrative executive summary and clinical recommendations",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       8600,
				RecordsProcessed: 12450,
				RecordsPassed:    12450,
				Summary:          "Synthesized 4 key findings, 2 strategic risks, and automated report brief",
			},
		},
	}

	job2 := &domain.PipelineJob{
		ID:              "pipe-run-002",
		OrganizationID:  "default-org-id",
		DatasetID:       "ehr-inpatient-admissions",
		DatasetName:     "General Hospital Inpatient Admissions & Vitals",
		InitiatedBy:     "usr-analyst-02",
		InitiatedByName: "Marcus Vance (Healthcare Data Steward)",
		Status:          domain.PipelineStatusCompleted,
		CurrentStage:    domain.StageAISynthesis,
		OverallProgress: 100,
		TriggerType:     "AUTOMATED_INGEST",
		TotalRecords:    8920,
		QualityScore:    98.1,
		DuplicatesFound: 7,
		AnomaliesDetected: 24,
		HighRiskPatients:  98,
		CreatedAt:       t2,
		StartedAt:       &t2,
		CompletedAt:     &t2End,
		DurationMs:      38100,
		Stages: []domain.PipelineStage{
			{
				Key:              domain.StageIngestion,
				Name:             "Raw Lakehouse Ingestion",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       3100,
				RecordsProcessed: 8920,
				RecordsPassed:    8920,
				Summary:          "8,920 records successfully parsed and partitioned",
			},
			{
				Key:              domain.StageProfiling,
				Name:             "DuckDB Column Profiling",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       4900,
				RecordsProcessed: 8920,
				RecordsPassed:    8920,
				Summary:          "Completed profiling in 4.9s with 0 critical schema mismatches",
			},
			{
				Key:              domain.StageValidation,
				Name:             "Healthcare Quality Rules",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       5200,
				RecordsProcessed: 8920,
				RecordsPassed:    8750,
				RecordsFlagged:   170,
				Summary:          "Validation index: 98.1% pass rate",
			},
			{
				Key:              domain.StageDeduplication,
				Name:             "RapidFuzz Patient Deduplication",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       7400,
				RecordsProcessed: 8920,
				RecordsPassed:    8913,
				RecordsFlagged:   7,
				Summary:          "7 candidate duplicate demographic pairs surfaced",
			},
			{
				Key:              domain.StageMLInference,
				Name:             "ML Anomaly & Risk Stratification",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       8900,
				RecordsProcessed: 8920,
				RecordsPassed:    8822,
				RecordsFlagged:   98,
				Summary:          "24 anomalies flagged, 98 patients stratified as high risk",
			},
			{
				Key:              domain.StageAISynthesis,
				Name:             "Ollama AI Clinical Insights",
				Status:           domain.StageStatusCompleted,
				Progress:         100,
				DurationMs:       8600,
				RecordsProcessed: 8920,
				RecordsPassed:    8920,
				Summary:          "Generated clinical executive narrative with strategic action items",
			},
		},
	}

	r.jobs[job1.ID] = job1
	r.jobs[job2.ID] = job2

	r.logs[job1.ID] = []domain.PipelineExecutionLog{
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageIngestion, Level: "INFO", Message: "Pipeline initialized. Trigger: MANUAL by Dr. Sarah Lin", Timestamp: t1},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageIngestion, Level: "SUCCESS", Message: "Ingested 12,450 records into MinIO parquet storage [raw-data/encounters.parquet]", Timestamp: t1.Add(4 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageProfiling, Level: "INFO", Message: "Executing DuckDB column-level profiling & distribution calculation", Timestamp: t1.Add(5 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageProfiling, Level: "SUCCESS", Message: "DuckDB profiling finished across 28 columns in 5.8s (Quality: 94.8%)", Timestamp: t1.Add(10 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageValidation, Level: "INFO", Message: "Evaluating 12 healthcare rules (ICD-10 regex, vitals boundary, NPI)", Timestamp: t1.Add(11 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageValidation, Level: "WARN", Message: "648 records flagged with non-blocking physiological warnings (e.g. systolic BP > 180)", Timestamp: t1.Add(17 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageDeduplication, Level: "INFO", Message: "Starting RapidFuzz demographic blocking & token similarity matrix computation", Timestamp: t1.Add(18 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageDeduplication, Level: "SUCCESS", Message: "Deduplication complete: 18 duplicate patient clusters identified", Timestamp: t1.Add(26 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageMLInference, Level: "INFO", Message: "Running scikit-learn Isolation Forest & Readmission Risk Stratification", Timestamp: t1.Add(27 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageMLInference, Level: "SUCCESS", Message: "ML inference complete: 42 anomalies detected, 156 patients scored high risk", Timestamp: t1.Add(36 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageAISynthesis, Level: "INFO", Message: "Dispatching clinical synthesis prompt to Ollama local LLM", Timestamp: t1.Add(37 * time.Second)},
		{ID: uuid.New().String(), PipelineID: job1.ID, StageKey: domain.StageAISynthesis, Level: "SUCCESS", Message: "Pipeline completed successfully in 42.3s. Automated report brief compiled.", Timestamp: t1End},
	}
}

func (r *PipelineRepository) CreateJob(job *domain.PipelineJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.jobs[job.ID] = job
	return nil
}

func (r *PipelineRepository) UpdateJob(job *domain.PipelineJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.jobs[job.ID] = job
	return nil
}

func (r *PipelineRepository) GetJobByID(id string) (*domain.PipelineJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	job, exists := r.jobs[id]
	if !exists {
		return nil, nil
	}
	return job, nil
}

func (r *PipelineRepository) ListJobs(params domain.PipelineFilterParams) ([]domain.PipelineJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []domain.PipelineJob
	for _, job := range r.jobs {
		if params.DatasetID != "" && job.DatasetID != params.DatasetID {
			continue
		}
		if params.Status != "" && job.Status != params.Status {
			continue
		}
		if params.TriggerType != "" && job.TriggerType != params.TriggerType {
			continue
		}
		result = append(result, *job)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})

	if params.Limit > 0 && len(result) > params.Limit {
		result = result[:params.Limit]
	}

	return result, nil
}

func (r *PipelineRepository) AddLog(log domain.PipelineExecutionLog) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if log.ID == "" {
		log.ID = uuid.New().String()
	}
	if log.Timestamp.IsZero() {
		log.Timestamp = time.Now()
	}
	r.logs[log.PipelineID] = append(r.logs[log.PipelineID], log)
}

func (r *PipelineRepository) GetLogs(pipelineID string) []domain.PipelineExecutionLog {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.logs[pipelineID]
}

func (r *PipelineRepository) GetStats() *domain.PipelineStats {
	r.mu.RLock()
	defer r.mu.RUnlock()

	stats := &domain.PipelineStats{
		CalculatedAt: time.Now(),
	}

	stageDurationSum := make(map[domain.PipelineStageKey]float64)
	stageFailureCount := make(map[domain.PipelineStageKey]int)
	stageRunCount := make(map[domain.PipelineStageKey]int)

	var totalDuration float64
	var completedCount int

	for _, job := range r.jobs {
		stats.TotalRuns++
		stats.TotalRecordsProcessed += job.TotalRecords

		switch job.Status {
		case domain.PipelineStatusRunning:
			stats.ActiveRuns++
		case domain.PipelineStatusCompleted:
			stats.CompletedRuns++
			completedCount++
			totalDuration += float64(job.DurationMs)
		case domain.PipelineStatusFailed:
			stats.FailedRuns++
		}

		for _, stage := range job.Stages {
			stageRunCount[stage.Key]++
			stageDurationSum[stage.Key] += float64(stage.DurationMs)
			if stage.Status == domain.StageStatusFailed {
				stageFailureCount[stage.Key]++
			}
		}

		stats.RecentRuns = append(stats.RecentRuns, *job)
	}

	if stats.TotalRuns > 0 {
		stats.SuccessRate = float64(stats.CompletedRuns) / float64(stats.TotalRuns) * 100
	} else {
		stats.SuccessRate = 100
	}

	if completedCount > 0 {
		stats.AvgDurationMs = totalDuration / float64(completedCount)
	}

	sort.Slice(stats.RecentRuns, func(i, j int) bool {
		return stats.RecentRuns[i].CreatedAt.After(stats.RecentRuns[j].CreatedAt)
	})
	if len(stats.RecentRuns) > 5 {
		stats.RecentRuns = stats.RecentRuns[:5]
	}

	stageMeta := map[domain.PipelineStageKey]string{
		domain.StageIngestion:     "Raw Lakehouse Ingestion",
		domain.StageProfiling:     "DuckDB Column Profiling",
		domain.StageValidation:    "Healthcare Quality Rules",
		domain.StageDeduplication: "RapidFuzz Deduplication",
		domain.StageMLInference:   "ML Anomaly & Risk Scoring",
		domain.StageAISynthesis:   "Ollama AI Clinical Synthesis",
	}

	for k, name := range stageMeta {
		runs := stageRunCount[k]
		var avgDur, failRate float64
		if runs > 0 {
			avgDur = stageDurationSum[k] / float64(runs)
			failRate = float64(stageFailureCount[k]) / float64(runs) * 100
		}
		stats.StageBottlenecks = append(stats.StageBottlenecks, domain.PipelineStageBottleneck{
			StageKey:      k,
			StageName:     name,
			AvgDurationMs: avgDur,
			FailureRate:   failRate,
			TotalRuns:     runs,
		})
	}

	return stats
}

// Chained Cryptographic Audit Trail
func (r *PipelineRepository) AppendAuditLog(log domain.AuditLog) domain.AuditLog {
	r.mu.Lock()
	defer r.mu.Unlock()

	if log.ID == "" {
		log.ID = uuid.New().String()
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	if log.Severity == "" {
		log.Severity = "INFO"
	}
	if log.Status == "" {
		log.Status = "SUCCESS"
	}

	log.PreviousHash = r.lastHash

	// Compute SHA-256 integrity hash
	payload := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s|%s|%s",
		log.ID, log.OrganizationID, log.UserID, log.Action, log.Resource, log.Severity, log.Status, log.PreviousHash, log.CreatedAt.UTC().Format(time.RFC3339Nano))
	h := sha256.New()
	h.Write([]byte(payload))
	log.IntegrityHash = hex.EncodeToString(h.Sum(nil))

	r.lastHash = log.IntegrityHash
	r.auditChain = append([]domain.AuditLog{log}, r.auditChain...) // prepend newest
	return log
}

func (r *PipelineRepository) ListAuditLogs(limit int) []domain.AuditLog {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if limit <= 0 || limit > len(r.auditChain) {
		limit = len(r.auditChain)
	}
	return r.auditChain[:limit]
}
