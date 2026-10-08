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
	// Purged mock initial runs. System now starts empty.
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

func (r *PipelineRepository) DeleteJob(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.jobs, id)
	delete(r.logs, id)
	return nil
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
		domain.StageAISynthesis:   "Google Gemini AI Clinical Synthesis",
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
