package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"caredata/backend/internal/analytics"
	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/storage"
	"github.com/google/uuid"
)

type AnalyticsService struct {
	repo    *repository.Repository
	storage storage.Storage
	cfg     *config.Config
	engine  *analytics.AnalyticsEngine
	sf      *analytics.SnowflakeClient
}

func NewAnalyticsService(repo *repository.Repository, store storage.Storage, cfg *config.Config) *AnalyticsService {
	return &AnalyticsService{
		repo:    repo,
		storage: store,
		cfg:     cfg,
		engine:  analytics.NewAnalyticsEngine(),
		sf:      analytics.NewSnowflakeClient(),
	}
}

// GetOverview computes and returns the comprehensive clinical KPI overview and visual distributions.
func (s *AnalyticsService) GetOverview(orgID string, filter domain.AnalyticsFilterParams) (*domain.AnalyticsOverviewResponse, error) {
	datasets, err := s.repo.GetDatasetsForAnalytics(orgID, filter.DatasetID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch datasets for analytics: %w", err)
	}

	if len(datasets) == 0 {
		return &domain.AnalyticsOverviewResponse{
			CalculatedAt: time.Now(),
		}, nil
	}

	objectNames := []string{}
	for _, d := range datasets {
		if d.StoragePath != "" {
			objectNames = append(objectNames, d.StoragePath)
		}
	}

	if len(objectNames) == 0 {
		return &domain.AnalyticsOverviewResponse{
			CalculatedAt: time.Now(),
		}, nil
	}

	payload := map[string]interface{}{
		"bucket":       "raw-data",
		"object_names": objectNames,
	}

	payloadBytes, _ := json.Marshal(payload)

	dataEngineURL := os.Getenv("DATA_ENGINE_URL")
	if dataEngineURL == "" {
		dataEngineURL = "http://localhost:8000"
	}

	httpResp, err := http.Post(fmt.Sprintf("%s/api/v1/analytics/overview", dataEngineURL), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to reach python data engine for overview: %w", err)
	}
	defer httpResp.Body.Close()

	var pyResp struct {
		KPIs            map[string]interface{}   `json:"kpis"`
		TopDiagnoses    []map[string]interface{} `json:"top_diagnoses"`
		Departments     []map[string]interface{} `json:"departments"`
		GenderBreakdown []map[string]interface{} `json:"gender_breakdown"`
		AgeCohorts      []map[string]interface{} `json:"age_cohorts"`
		PayerMix        []map[string]interface{} `json:"payer_mix"`
		VolumeTrends    []map[string]interface{} `json:"volume_trends"`
	}

	if err := json.NewDecoder(httpResp.Body).Decode(&pyResp); err != nil {
		return nil, fmt.Errorf("failed to parse data engine response: %w", err)
	}

	// Map python response back to domain models
	resp := s.engine.FormatDuckDBOverview(datasets, filter, pyResp)
	return &resp, nil
}

// GetClinicalMetrics returns deep-dive clinical KPIs and departmental utilization statistics.
func (s *AnalyticsService) GetClinicalMetrics(orgID string, filter domain.AnalyticsFilterParams) (*domain.AnalyticsOverviewResponse, error) {
	return s.GetOverview(orgID, filter)
}

// ExecuteQuery runs an in-memory / DuckDB OLAP SQL query against loaded dataset records via Python Data Engine, OR routes to Snowflake if configured.
func (s *AnalyticsService) ExecuteQuery(orgID string, req domain.SQLQueryRequest) (*domain.SQLQueryResponse, error) {
	// 1. Check if the user has a provisioned Snowflake warehouse
	if s.sf != nil && s.sf.ExecuteTenantQuery != nil {
		// Attempt Snowflake query first. If credentials are set, this succeeds.
		sfRes, err := s.sf.ExecuteTenantQuery(orgID, req.Query)
		if err == nil {
			return sfRes, nil
		}
		log.Printf("⚠️ Snowflake query failed or not configured, falling back to DuckDB: %v", err)
	}

	datasets, err := s.repo.GetDatasetsForAnalytics(orgID, req.DatasetID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch dataset for query: %w", err)
	}
	
	if len(datasets) == 0 {
		return nil, fmt.Errorf("no dataset found")
	}
	
	// Assume the first dataset is the target
	dataset := datasets[0]
	objectName := dataset.StoragePath // Assuming this contains the MinIO object name
	if objectName == "" {
		// Fallback for mocked data
		return &domain.SQLQueryResponse{
			Columns: []domain.SQLQueryColumn{{Name: "error", DataType: "STRING"}},
			Rows:    []map[string]interface{}{{"error": "Dataset has no physical storage path in MinIO yet"}},
		}, nil
	}

	// Prepare payload for Python Data Engine
	payload := map[string]interface{}{
		"query": req.Query,
		"bucket": "raw-data",
		"object_name": objectName,
	}
	
	payloadBytes, _ := json.Marshal(payload)
	
	dataEngineURL := os.Getenv("DATA_ENGINE_URL")
	if dataEngineURL == "" {
		dataEngineURL = "http://localhost:8000"
	}
	
	httpResp, err := http.Post(fmt.Sprintf("%s/api/v1/query", dataEngineURL), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to reach python data engine: %w", err)
	}
	defer httpResp.Body.Close()
	
	if httpResp.StatusCode != 200 {
		return nil, fmt.Errorf("data engine returned status %d", httpResp.StatusCode)
	}
	
	var result struct {
		Records         []map[string]interface{} `json:"records"`
		Count           int                      `json:"count"`
		ExecutionTimeMs float64                  `json:"execution_time_ms"`
	}
	
	if err := json.NewDecoder(httpResp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse data engine response: %w", err)
	}
	
	// Extract columns
	var columns []domain.SQLQueryColumn
	if len(result.Records) > 0 {
		for k := range result.Records[0] {
			columns = append(columns, domain.SQLQueryColumn{
				Name:     k,
				DataType: "UNKNOWN",
			})
		}
	}
	
	res := domain.SQLQueryResponse{
		Columns:         columns,
		Rows:            result.Records,
		TotalRows:       int64(result.Count),
		ExecutionTimeMs: result.ExecutionTimeMs,
	}
	
	return &res, nil
}

// GetSnowflakeStatus retrieves Snowflake configuration and sync history.
func (s *AnalyticsService) GetSnowflakeStatus(orgID string) (*domain.SnowflakeStatusResponse, error) {
	cfg, err := s.repo.GetSnowflakeConfig(orgID)
	if err != nil {
		return nil, err
	}

	syncs, total, err := s.repo.ListSnowflakeSyncLogs(orgID, 15)
	if err != nil {
		return nil, err
	}

	var lastSuccess *time.Time
	for _, sync := range syncs {
		if sync.Status == "SUCCESS" {
			t := sync.CreatedAt
			lastSuccess = &t
			break
		}
	}

	return &domain.SnowflakeStatusResponse{
		Config:      cfg,
		RecentSyncs: syncs,
		TotalSyncs:  total,
		LastSuccess: lastSuccess,
	}, nil
}

// UpdateSnowflakeConfig persists updated Snowflake connection and sync settings.
func (s *AnalyticsService) UpdateSnowflakeConfig(orgID string, cfg *domain.SnowflakeConfig) error {
	cfg.OrganizationID = orgID
	if cfg.ID == "" {
		cfg.ID = fmt.Sprintf("sf-%s", orgID)
	}
	
	// Provision the tenant warehouse upon config save if not already provisioned.
	// This ensures each healthcare center gets their dedicated resources.
	if s.sf != nil {
		if err := s.sf.ProvisionTenant(orgID); err != nil {
			log.Printf("⚠️ Snowflake provisioning failed for %s: %v", orgID, err)
			// Return error so user knows provisioning failed? 
			// We'll just log it for now to avoid blocking the config save if credentials aren't set in env yet.
		} else {
			cfg.IsConnected = true
			orgIDClean := strings.ReplaceAll(orgID, "-", "_")
			cfg.Warehouse = fmt.Sprintf("WH_ORG_%s", orgIDClean)
			cfg.Schema = fmt.Sprintf("SCHEMA_ORG_%s", orgIDClean)
			cfg.Database = "CAREDATA_DB"
		}
	}
	
	return s.repo.SaveSnowflakeConfig(cfg)
}

// TriggerSnowflakeSync simulated or executes a fast batch export into the enterprise Snowflake warehouse.
func (s *AnalyticsService) TriggerSnowflakeSync(orgID, userID, datasetID string) (*domain.SnowflakeSyncRecord, error) {
	datasets, err := s.repo.GetDatasetsForAnalytics(orgID, datasetID)
	if err != nil {
		return nil, err
	}

	var datasetName = "All Clinical Datasets"
	var totalRecords int64 = 0
	for _, d := range datasets {
		if datasetID != "" && d.ID == datasetID {
			datasetName = d.Name
		}
	}

	start := time.Now()
	var actuallySyncedRecords int64 = 0

	if s.sf != nil {
		if len(datasets) == 0 {
			return nil, fmt.Errorf("no datasets found to sync")
		}

		var hasValidFile bool
		for _, d := range datasets {
			if d.StoragePath != "" {
				// We must stream the file from MinIO to a temporary local file for Snowflake's PUT command
				stream, err := s.storage.GetStream("raw-data", d.StoragePath)
				if err != nil {
					log.Printf("⚠️ File missing in MinIO for dataset %s: %v", d.ID, err)
					continue
				}
				
				tempFile, err := os.CreateTemp("", "snowflake-sync-*.parquet")
				if err != nil {
					stream.Close()
					continue
				}
				tempPath := tempFile.Name()
				
				_, err = tempFile.ReadFrom(stream)
				tempFile.Close()
				stream.Close()
				
				if err != nil {
					os.Remove(tempPath)
					continue
				}
				
				hasValidFile = true

				rows, err := s.sf.SyncDatasetToSnowflake(orgID, tempPath)
				os.Remove(tempPath) // Clean up temp file immediately after
				
				if err != nil {
					log.Printf("⚠️ Failed to sync dataset %s: %v", d.ID, err)
					continue
				}
				actuallySyncedRecords += rows
			}
		}

		if !hasValidFile {
			return nil, fmt.Errorf("the physical files for your datasets are missing from storage. Please upload a new dataset.")
		}
	}

	duration := time.Since(start).Milliseconds()
	totalRecords = actuallySyncedRecords

	var targetTable = "PENDING_PROVISION.PUBLIC.ENCOUNTERS_MART"
	if cfg, err := s.repo.GetSnowflakeConfig(orgID); err == nil && cfg != nil && cfg.IsConnected {
		targetTable = fmt.Sprintf("%s.%s.clinical_encounters", cfg.Database, cfg.Schema)
	}

	syncRecord := &domain.SnowflakeSyncRecord{
		ID:             fmt.Sprintf("sync-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		DatasetID:      datasetID,
		DatasetName:    datasetName,
		TargetTable:    targetTable,
		RecordsSynced:  totalRecords,
		DurationMs:     duration,
		Status:         "SUCCESS",
		TriggeredBy:    userID,
		CreatedAt:      time.Now(),
	}

	if err := s.repo.SaveSnowflakeSyncRecord(syncRecord); err != nil {
		log.Printf("⚠️ Failed to save snowflake sync record: %v", err)
	}

	// Update snowflake config last sync timestamp
	if cfg, err := s.repo.GetSnowflakeConfig(orgID); err == nil && cfg != nil {
		now := time.Now()
		cfg.LastSyncAt = &now
		cfg.LastSyncStatus = "SUCCESS"
		_ = s.repo.SaveSnowflakeConfig(cfg)
	}

	return syncRecord, nil
}

// Helper to extract records from datasets
func (s *AnalyticsService) loadRecordsFromDatasets(datasets []domain.Dataset, maxRows int) []map[string]interface{} {
	var allRecords []map[string]interface{}

	for _, d := range datasets {
		if len(allRecords) >= maxRows {
			break
		}

		// Try loading raw data from storage via stream first
		if d.StoragePath != "" {
			stream, err := s.storage.GetStream("raw-data", d.StoragePath)
			if err == nil {
				fullPath := ""
				if d.FileType == "parquet" {
					fullPath = s.storage.GetStoragePath("raw-data", d.StoragePath)
				}
				if iter, err := ingest.NewRecordIterator(d.FileType, stream, fullPath); err == nil {
					for len(allRecords) < maxRows {
						row, err := iter.Next()
						if err != nil {
							break
						}
						allRecords = append(allRecords, row)
					}
					iter.Close()
				}
				stream.Close()
				if len(allRecords) > 0 {
					continue
				}
			}
		}

		// Fallback to preview_json if available
		if d.PreviewJSON != "" && d.PreviewJSON != "[]" {
			var preview []map[string]interface{}
			if err := json.Unmarshal([]byte(d.PreviewJSON), &preview); err == nil && len(preview) > 0 {
				allRecords = append(allRecords, preview...)
			}
		}
	}

	return allRecords
}
