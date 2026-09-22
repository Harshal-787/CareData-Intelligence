package service

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
	"caredata/backend/internal/quality"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/storage"
	"github.com/google/uuid"
)

type QualityService struct {
	repo    *repository.Repository
	storage storage.Storage
	cfg     *config.Config
}

func NewQualityService(repo *repository.Repository, store storage.Storage, cfg *config.Config) *QualityService {
	return &QualityService{
		repo:    repo,
		storage: store,
		cfg:     cfg,
	}
}

// RunQualityAudit performs complete column-level statistical profiling and healthcare rule validation.
func (s *QualityService) RunQualityAudit(datasetID, orgID string) (*domain.QualityReport, error) {
	dataset, err := s.repo.GetDatasetByID(datasetID)
	if err != nil {
		return nil, fmt.Errorf("database query failed: %w", err)
	}
	if dataset == nil {
		return nil, fmt.Errorf("dataset not found")
	}

	// 2. Open stream for validation
	stream1, err := s.storage.GetStream("raw-data", dataset.StoragePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open dataset stream for validation: %w", err)
	}
	defer stream1.Close()

	var iter1 ingest.RecordIterator
	if dataset.FileType == "parquet" {
		fullPath := s.storage.GetStoragePath("raw-data", dataset.StoragePath)
		iter1, err = ingest.NewRecordIterator(dataset.FileType, stream1, fullPath)
	} else {
		iter1, err = ingest.NewRecordIterator(dataset.FileType, stream1, "")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create record iterator: %w", err)
	}
	defer iter1.Close()

	// 3. Load or initialize validation rules
	rules, err := s.repo.ListValidationRules(orgID, datasetID)
	if err != nil || len(rules) == 0 {
		defaultRules := quality.GetDefaultHealthcareRules(orgID, datasetID)
		for _, r := range defaultRules {
			_ = s.repo.CreateValidationRule(&r)
		}
		rules, _ = s.repo.ListValidationRules(orgID, datasetID)
	}

	// 4. Parse Schema
	var schema []domain.DatasetColumn
	if dataset.SchemaJSON != "" {
		_ = json.Unmarshal([]byte(dataset.SchemaJSON), &schema)
	}

	// 5. Evaluate Clinical Validation Rules & Scores
	valResult := quality.EvaluateQualityAndRules(datasetID, orgID, schema, iter1, rules)

	// 6. Open stream for profiling
	stream2, err := s.storage.GetStream("raw-data", dataset.StoragePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open dataset stream for profiling: %w", err)
	}
	defer stream2.Close()
	
	var iter2 ingest.RecordIterator
	if dataset.FileType == "parquet" {
		fullPath := s.storage.GetStoragePath("raw-data", dataset.StoragePath)
		iter2, err = ingest.NewRecordIterator(dataset.FileType, stream2, fullPath)
	} else {
		iter2, err = ingest.NewRecordIterator(dataset.FileType, stream2, "")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create profiling iterator: %w", err)
	}
	defer iter2.Close()

	// 7. Generate Column Statistical Profiles
	columnProfiles := quality.ProfileDataset(schema, iter2)
	profilingJSON, _ := json.Marshal(columnProfiles)

	now := time.Now()
	reportID := fmt.Sprintf("qr-%s", uuid.New().String()[:12])

	report := &domain.QualityReport{
		ID:                reportID,
		DatasetID:         datasetID,
		DatasetName:       dataset.Name,
		OrganizationID:    orgID,
		OverallScore:      valResult.OverallScore,
		CompletenessScore: valResult.CompletenessScore,
		ValidityScore:     valResult.ValidityScore,
		UniquenessScore:   valResult.UniquenessScore,
		ConsistencyScore:  valResult.ConsistencyScore,
		TotalChecks:       valResult.TotalChecks,
		PassedChecks:      valResult.PassedChecks,
		FailedChecks:      valResult.FailedChecks,
		TotalViolations:   int64(len(valResult.Violations)),
		CriticalCount:     valResult.CriticalCount,
		WarningCount:      valResult.WarningCount,
		InfoCount:         valResult.InfoCount,
		ProfilingJSON:     string(profilingJSON),
		ColumnProfiles:    columnProfiles,
		Violations:        valResult.Violations,
		CreatedAt:         now,
	}

	// Link report ID to violations
	for i := range report.Violations {
		report.Violations[i].QualityReportID = reportID
	}

	// 6. Persist Quality Report & Violations
	if err := s.repo.SaveQualityReport(report); err != nil {
		log.Printf("⚠️ Failed to save quality report: %v", err)
	}
	if err := s.repo.SaveQualityViolations(report.Violations); err != nil {
		log.Printf("⚠️ Failed to save quality violations: %v", err)
	}

	return report, nil
}

// GetQualityReport retrieves the latest quality report or generates one if none exists.
func (s *QualityService) GetQualityReport(datasetID, orgID string) (*domain.QualityReport, error) {
	report, err := s.repo.GetLatestQualityReport(datasetID)
	if err != nil {
		return nil, err
	}
	if report == nil {
		// Auto-run audit on first request
		return s.RunQualityAudit(datasetID, orgID)
	}

	// Unmarshal column profiles
	if report.ProfilingJSON != "" && report.ProfilingJSON != "[]" {
		var profiles []domain.ColumnProfile
		if err := json.Unmarshal([]byte(report.ProfilingJSON), &profiles); err == nil {
			report.ColumnProfiles = profiles
		}
	}

	// Fetch dataset details for name
	if ds, err := s.repo.GetDatasetByID(datasetID); err == nil && ds != nil {
		report.DatasetName = ds.Name
	}

	// Fetch top 50 violations
	violations, _, _ := s.repo.ListQualityViolations(datasetID, "", 50, 0)
	report.Violations = violations

	return report, nil
}

// ListViolations returns paginated violations with severity filtering.
func (s *QualityService) ListViolations(datasetID, severity string, limit, offset int) ([]domain.QualityViolation, int64, error) {
	return s.repo.ListQualityViolations(datasetID, severity, limit, offset)
}

// ListRules lists all active and inactive validation rules.
func (s *QualityService) ListRules(orgID, datasetID string) ([]domain.ValidationRule, error) {
	rules, err := s.repo.ListValidationRules(orgID, datasetID)
	if err != nil {
		return nil, err
	}
	if len(rules) == 0 {
		defaultRules := quality.GetDefaultHealthcareRules(orgID, datasetID)
		for _, r := range defaultRules {
			_ = s.repo.CreateValidationRule(&r)
		}
		return s.repo.ListValidationRules(orgID, datasetID)
	}
	return rules, nil
}

// CreateRule registers a new user-defined validation rule.
func (s *QualityService) CreateRule(orgID, datasetID string, req *domain.CreateValidationRuleRequest) (*domain.ValidationRule, error) {
	if req.FieldName == "" {
		return nil, fmt.Errorf("field name is required")
	}
	if req.RuleType == "" {
		return nil, fmt.Errorf("rule type is required")
	}
	if req.Severity == "" {
		req.Severity = domain.SeverityWarning
	}
	if req.Parameters == "" {
		req.Parameters = "{}"
	}

	now := time.Now()
	rule := &domain.ValidationRule{
		ID:             fmt.Sprintf("rule-custom-%s", uuid.New().String()[:8]),
		DatasetID:      datasetID,
		OrganizationID: orgID,
		FieldName:      req.FieldName,
		RuleType:       req.RuleType,
		Severity:       req.Severity,
		Parameters:     req.Parameters,
		IsActive:       req.IsActive,
		Description:    req.Description,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateValidationRule(rule); err != nil {
		return nil, fmt.Errorf("failed to save validation rule: %w", err)
	}

	return rule, nil
}

// UpdateRule modifies an existing validation rule.
func (s *QualityService) UpdateRule(orgID, ruleID string, req *domain.UpdateValidationRuleRequest) (*domain.ValidationRule, error) {
	existing, err := s.repo.GetValidationRuleByID(ruleID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, fmt.Errorf("rule not found")
	}

	if req.FieldName != "" {
		existing.FieldName = req.FieldName
	}
	if req.RuleType != "" {
		existing.RuleType = req.RuleType
	}
	if req.Severity != "" {
		existing.Severity = req.Severity
	}
	if req.Parameters != "" {
		existing.Parameters = req.Parameters
	}
	existing.IsActive = req.IsActive
	if req.Description != "" {
		existing.Description = req.Description
	}
	existing.UpdatedAt = time.Now()

	if err := s.repo.UpdateValidationRule(existing); err != nil {
		return nil, fmt.Errorf("failed to update validation rule: %w", err)
	}

	return existing, nil
}

// DeleteRule removes a validation rule.
func (s *QualityService) DeleteRule(orgID, ruleID string) error {
	return s.repo.DeleteValidationRule(ruleID)
}

// ResetDefaultRules clears dataset rules and restores default clinical rules.
func (s *QualityService) ResetDefaultRules(orgID, datasetID string) ([]domain.ValidationRule, error) {
	_ = s.repo.DeleteValidationRulesByDataset(datasetID)
	defaults := quality.GetDefaultHealthcareRules(orgID, datasetID)
	for _, r := range defaults {
		_ = s.repo.CreateValidationRule(&r)
	}
	return s.repo.ListValidationRules(orgID, datasetID)
}

// GetQualityOverview aggregates quality metrics across all datasets in the organization.
func (s *QualityService) GetQualityOverview(orgID string) (*domain.QualityOverview, error) {
	return s.repo.GetQualityOverview(orgID)
}
