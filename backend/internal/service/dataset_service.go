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

type DatasetService struct {
	repo    *repository.Repository
	storage storage.Storage
	cfg     *config.Config
}

func NewDatasetService(repo *repository.Repository, store storage.Storage, cfg *config.Config) *DatasetService {
	return &DatasetService{
		repo:    repo,
		storage: store,
		cfg:     cfg,
	}
}

func (s *DatasetService) UploadAndIngest(orgID, userID, userEmail, ipAddress, name, filename string, data []byte) (*domain.DatasetResponse, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("uploaded file is empty")
	}

	datasetID := fmt.Sprintf("ds-%s", uuid.New().String()[:12])
	if name == "" {
		name = filename
	}

	mimeType := storage.DetectMimeType(filename, data)
	fileType := storage.DetectFileType(filename)
	storageKey := storage.FormatStorageKey(orgID, datasetID, filename)

	// 1. Store raw file in lakehouse storage
	storagePath, err := s.storage.Save("raw-data", storageKey, data, mimeType)
	if err != nil {
		return nil, fmt.Errorf("failed to store raw dataset: %w", err)
	}

	now := time.Now()
	dataset := &domain.Dataset{
		ID:             datasetID,
		OrganizationID: orgID,
		UploadedBy:     userID,
		Name:           name,
		FileName:       filename,
		FileSize:       int64(len(data)),
		MimeType:       mimeType,
		FileType:       fileType,
		StoragePath:    storagePath,
		Status:         domain.DatasetStatusProcessing,
		TotalRecords:   0,
		ColumnsCount:   0,
		QualityScore:   0,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateDataset(dataset); err != nil {
		_ = s.storage.Delete("raw-data", storageKey)
		return nil, fmt.Errorf("failed to register dataset record: %w", err)
	}

	// 2. Run Ingestion Parser & Schema Inference
	parseRes, parseErr := ingest.ParseDatasetContent(fileType, data)
	if parseErr != nil {
		log.Printf("⚠️ Ingestion parsing warning for dataset %s: %v", datasetID, parseErr)
		_ = s.repo.UpdateDatasetStatusAndSchema(datasetID, domain.DatasetStatusFailed, 0, 0, "[]", "[]", 0, parseErr.Error())
		dataset.Status = domain.DatasetStatusFailed
		dataset.ErrorMessage = parseErr.Error()
	} else {
		schemaBytes, _ := json.Marshal(parseRes.Schema)
		previewBytes, _ := json.Marshal(parseRes.Preview)

		_ = s.repo.UpdateDatasetStatusAndSchema(
			datasetID,
			domain.DatasetStatusReady,
			parseRes.TotalRecords,
			parseRes.ColumnsCount,
			string(schemaBytes),
			string(previewBytes),
			parseRes.QualityScore,
			"",
		)

		dataset.Status = domain.DatasetStatusReady
		dataset.TotalRecords = parseRes.TotalRecords
		dataset.ColumnsCount = parseRes.ColumnsCount
		dataset.SchemaJSON = string(schemaBytes)
		dataset.PreviewJSON = string(previewBytes)
		dataset.QualityScore = parseRes.QualityScore

		// Initialize default healthcare rules & generate complete initial quality audit
		go func(dsID, oID string, sc []domain.DatasetColumn, pr []map[string]interface{}) {
			defaultRules := quality.GetDefaultHealthcareRules(oID, dsID)
			for _, r := range defaultRules {
				_ = s.repo.CreateValidationRule(&r)
			}
			columnProfiles := quality.ProfileDataset(sc, pr)
			profJSON, _ := json.Marshal(columnProfiles)
			valRes := quality.EvaluateQualityAndRules(dsID, oID, sc, pr, defaultRules)
			reportID := fmt.Sprintf("qr-%s", uuid.New().String()[:12])
			rep := &domain.QualityReport{
				ID:                reportID,
				DatasetID:         dsID,
				OrganizationID:    oID,
				OverallScore:      valRes.OverallScore,
				CompletenessScore: valRes.CompletenessScore,
				ValidityScore:     valRes.ValidityScore,
				UniquenessScore:   valRes.UniquenessScore,
				ConsistencyScore:  valRes.ConsistencyScore,
				TotalChecks:       valRes.TotalChecks,
				PassedChecks:      valRes.PassedChecks,
				FailedChecks:      valRes.FailedChecks,
				TotalViolations:   int64(len(valRes.Violations)),
				CriticalCount:     valRes.CriticalCount,
				WarningCount:      valRes.WarningCount,
				InfoCount:         valRes.InfoCount,
				ProfilingJSON:     string(profJSON),
				CreatedAt:         time.Now(),
			}
			for i := range valRes.Violations {
				valRes.Violations[i].QualityReportID = reportID
			}
			_ = s.repo.SaveQualityReport(rep)
			_ = s.repo.SaveQualityViolations(valRes.Violations)
		}(datasetID, orgID, parseRes.Schema, parseRes.Preview)
	}

	// 3. Record Audit Log
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             fmt.Sprintf("audit-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		UserID:         userID,
		UserEmail:      userEmail,
		Action:         "DATASET_UPLOAD",
		Resource:       fmt.Sprintf("dataset:%s", datasetID),
		Details:        fmt.Sprintf("Ingested dataset '%s' (%s, %d bytes, %d records, status: %s)", name, fileType, len(data), dataset.TotalRecords, dataset.Status),
		IPAddress:      ipAddress,
		CreatedAt:      now,
	})

	return s.toResponse(dataset), nil
}

func (s *DatasetService) GenerateSampleDataset(orgID, userID, userEmail, ipAddress, sampleType string) (*domain.DatasetResponse, error) {
	var data []byte
	var filename string
	var name string

	switch stringsToLower(sampleType) {
	case "demographics", "patients":
		data, filename = ingest.GeneratePatientDemographicsCSV(250)
		name = "Master Patient Demographics (Synthetic Benchmarks)"
	case "labs", "vitals", "lab_results":
		data, filename = ingest.GenerateLabVitalsJSON(300)
		name = "Clinical Laboratory & Metabolic Vitals Feed"
	case "encounters", "clinical", "admissions":
		fallthrough
	default:
		data, filename = ingest.GenerateClinicalEncountersCSV(250)
		name = "Inpatient & Emergency Clinical Encounters"
	}

	return s.UploadAndIngest(orgID, userID, userEmail, ipAddress, name, filename, data)
}

func (s *DatasetService) ListDatasets(filter domain.DatasetFilterParams) ([]domain.DatasetResponse, error) {
	datasets, err := s.repo.ListDatasets(filter)
	if err != nil {
		return nil, err
	}

	var res []domain.DatasetResponse
	for _, d := range datasets {
		res = append(res, *s.toResponse(&d))
	}
	return res, nil
}

func (s *DatasetService) GetDatasetByID(id, orgID string) (*domain.DatasetResponse, error) {
	dataset, err := s.repo.GetDatasetByID(id)
	if err != nil {
		return nil, err
	}
	if dataset == nil {
		return nil, nil
	}
	if orgID != "" && dataset.OrganizationID != orgID {
		return nil, fmt.Errorf("unauthorized access to dataset")
	}

	return s.toResponse(dataset), nil
}

func (s *DatasetService) DownloadDataset(id, orgID string) ([]byte, string, string, error) {
	dataset, err := s.repo.GetDatasetByID(id)
	if err != nil || dataset == nil {
		return nil, "", "", fmt.Errorf("dataset not found")
	}
	if orgID != "" && dataset.OrganizationID != orgID {
		return nil, "", "", fmt.Errorf("unauthorized access to dataset")
	}

	data, err := s.storage.Get("raw-data", dataset.StoragePath)
	if err != nil {
		// Fallback to read directly from storage_path if full path
		data, err = s.storage.Get("", dataset.StoragePath)
		if err != nil {
			return nil, "", "", fmt.Errorf("failed to retrieve dataset content from storage: %w", err)
		}
	}

	return data, dataset.FileName, dataset.MimeType, nil
}

func (s *DatasetService) DeleteDataset(id, orgID, userID, userEmail, ipAddress string) error {
	dataset, err := s.repo.GetDatasetByID(id)
	if err != nil || dataset == nil {
		return fmt.Errorf("dataset not found")
	}
	if orgID != "" && dataset.OrganizationID != orgID {
		return fmt.Errorf("unauthorized access to dataset")
	}

	// Delete from storage
	_ = s.storage.Delete("raw-data", dataset.StoragePath)

	// Delete from database
	if err := s.repo.DeleteDataset(id); err != nil {
		return fmt.Errorf("failed to delete dataset record: %w", err)
	}

	// Record audit log
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             fmt.Sprintf("audit-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		UserID:         userID,
		UserEmail:      userEmail,
		Action:         "DATASET_DELETE",
		Resource:       fmt.Sprintf("dataset:%s", id),
		Details:        fmt.Sprintf("Deleted dataset '%s' (File: %s)", dataset.Name, dataset.FileName),
		IPAddress:      ipAddress,
		CreatedAt:      time.Now(),
	})

	return nil
}

func (s *DatasetService) GetStats(orgID string) (*domain.DatasetStatsResponse, error) {
	return s.repo.GetDatasetStats(orgID)
}

func (s *DatasetService) toResponse(d *domain.Dataset) *domain.DatasetResponse {
	var schema []domain.DatasetColumn
	if d.SchemaJSON != "" && d.SchemaJSON != "[]" {
		_ = json.Unmarshal([]byte(d.SchemaJSON), &schema)
	}

	var preview []map[string]interface{}
	if d.PreviewJSON != "" && d.PreviewJSON != "[]" {
		_ = json.Unmarshal([]byte(d.PreviewJSON), &preview)
	}

	return &domain.DatasetResponse{
		ID:             d.ID,
		OrganizationID: d.OrganizationID,
		UploadedBy:     d.UploadedBy,
		Name:           d.Name,
		FileName:       d.FileName,
		FileSize:       d.FileSize,
		MimeType:       d.MimeType,
		FileType:       d.FileType,
		StoragePath:    d.StoragePath,
		Status:         d.Status,
		TotalRecords:   d.TotalRecords,
		ColumnsCount:   d.ColumnsCount,
		Schema:         schema,
		Preview:        preview,
		QualityScore:   d.QualityScore,
		ErrorMessage:   d.ErrorMessage,
		CreatedAt:      d.CreatedAt,
		UpdatedAt:      d.UpdatedAt,
	}
}

func stringsToLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}
