package service

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"caredata/backend/internal/analytics"
	"caredata/backend/internal/config"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
	"caredata/backend/internal/quality"
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
	svc := &AnalyticsService{
		repo:    repo,
		storage: store,
		cfg:     cfg,
		engine:  analytics.NewAnalyticsEngine(),
		sf:      analytics.NewSnowflakeClient(),
	}
	
	// Recover Snowflake connection from database across restarts
	sfCfg, err := repo.GetSnowflakeConfig("org-default-001")
	if err == nil && sfCfg != nil && sfCfg.IsConnected && sfCfg.Password != "" {
		if err := svc.sf.UpdateConnection(sfCfg.Account, sfCfg.Username, sfCfg.Password, sfCfg.Role); err != nil {
			log.Printf("⚠️ Failed to recover Snowflake connection on startup: %v", err)
		} else {
			log.Printf("✓ Snowflake connection recovered from DB for org-default-001")
		}
	}
	
	return svc
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

	// 1. Check if Snowflake is configured and connected. If so, route query to Snowflake!
	if s.sf != nil {
		cfg, err := s.repo.GetSnowflakeConfig(orgID)
		if err == nil && cfg != nil && cfg.IsConnected {
			return s.getSnowflakeOverview(orgID, filter, datasets)
		}
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
		dataEngineURL = "http://localhost:8001"
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
	if s.sf != nil {
		sfCfg, err := s.repo.GetSnowflakeConfig(orgID)
		if err == nil && sfCfg != nil && sfCfg.IsConnected {
			sfRes, err := s.sf.ExecuteTenantQuery(sfCfg.Warehouse, sfCfg.Database, sfCfg.Schema, req.Query)
			if err == nil {
				return sfRes, nil
			}
			log.Printf("⚠️ Snowflake query failed or not configured, falling back to DuckDB: %v", err)
		}
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
		dataEngineURL = "http://localhost:8001"
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
	
	// If password is empty (e.g. redacted by frontend), retain the existing one
	if cfg.Password == "" {
		if existing, err := s.repo.GetSnowflakeConfig(orgID); err == nil && existing != nil {
			cfg.Password = existing.Password
		}
	}

	// Provision the tenant warehouse upon config save if not already provisioned.
	// This ensures each healthcare center gets their dedicated resources.
	if s.sf != nil {
		if err := s.sf.UpdateConnection(cfg.Account, cfg.Username, cfg.Password, cfg.Role); err != nil {
			log.Printf("⚠️ Snowflake connection failed for %s: %v", orgID, err)
		} else if err := s.sf.ProvisionTenant(orgID, cfg.Database, cfg.Schema, cfg.Warehouse); err != nil {
			log.Printf("⚠️ Snowflake provisioning failed for %s: %v", orgID, err)
		} else {
			cfg.IsConnected = true
		}
	}
	
	return s.repo.SaveSnowflakeConfig(cfg)
}

// TriggerSnowflakeSync simulated or executes a fast batch export into the enterprise Snowflake warehouse.
func (s *AnalyticsService) TriggerSnowflakeSync(orgID, userID, datasetID, tableName string) (*domain.SnowflakeSyncRecord, error) {
	start := time.Now()
	
	if s.sf == nil {
		return nil, fmt.Errorf("snowflake client not initialized")
	}

	query := "SELECT * FROM clinical_encounters"
	if tableName != "" {
		query = fmt.Sprintf("SELECT * FROM %s", tableName)
	}

	sfCfg, err := s.repo.GetSnowflakeConfig(orgID)
	if err != nil || sfCfg == nil || !sfCfg.IsConnected {
		return nil, fmt.Errorf("snowflake not configured for organization")
	}

	res, err := s.sf.ExecuteTenantQuery(sfCfg.Warehouse, sfCfg.Database, sfCfg.Schema, query)
	if err != nil {
		return nil, fmt.Errorf("failed to extract data from Snowflake: %w", err)
	}

	if len(res.Rows) == 0 {
		return nil, fmt.Errorf("no datasets found in Snowflake to sync")
	}

	// Create CSV
	tempFile, err := os.CreateTemp("", "snowflake-extract-*.csv")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tempFile.Name())

	writer := csv.NewWriter(tempFile)
	// Write headers
	headers := make([]string, len(res.Columns))
	for i, col := range res.Columns {
		headers[i] = col.Name
	}
	writer.Write(headers)

	for _, row := range res.Rows {
		strRow := make([]string, len(res.Columns))
		for i, col := range res.Columns {
			val := row[col.Name]
			if val == nil {
				strRow[i] = ""
			} else {
				strRow[i] = fmt.Sprintf("%v", val)
			}
		}
		writer.Write(strRow)
	}
	writer.Flush()
	tempFile.Seek(0, 0) // reset pointer to upload

	fileName := fmt.Sprintf("snowflake_extract_%s.csv", time.Now().Format("20060102150405"))
	storagePath, err := s.storage.SaveStream("raw-data", fileName, tempFile, "text/csv")
	if err != nil {
		return nil, err
	}

	fileInfo, _ := tempFile.Stat()
	fileSize := fileInfo.Size()

	dataset := &domain.Dataset{
		ID:             fmt.Sprintf("ds-%s", uuid.New().String()[:8]),
		OrganizationID: orgID,
		Name:           "Snowflake Clinical Encounters (Extracted)",
		FileName:       fileName,
		MimeType:       "text/csv",
		FileType:       "csv",
		Status:         "READY",
		StoragePath:    storagePath,
		TotalRecords:   int64(len(res.Rows)),
		FileSize:       fileSize,
		UploadedBy:     userID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.repo.CreateDataset(dataset); err != nil {
		return nil, err
	}

	// 2. Run Ingestion Parser & Schema Inference via Stream
	stream, err := s.storage.GetStream("raw-data", storagePath)
	if err == nil {
		defer stream.Close()
		iter, err := ingest.NewRecordIterator("csv", stream, "")
		if err == nil {
			defer iter.Close()
			parseRes, parseErr := ingest.ParseDatasetStream("csv", iter)
			if parseErr == nil {
				schemaBytes, _ := json.Marshal(parseRes.Schema)
				previewBytes, _ := json.Marshal(parseRes.Preview)

				_ = s.repo.UpdateDatasetStatusAndSchema(
					dataset.ID,
					domain.DatasetStatusReady,
					parseRes.TotalRecords,
					parseRes.ColumnsCount,
					string(schemaBytes),
					string(previewBytes),
					parseRes.QualityScore,
					"",
				)

				// Initialize default healthcare rules & generate complete initial quality audit
				go func(dsID, oID string, sc []domain.DatasetColumn, pr []map[string]interface{}) {
					defaultRules := quality.GetDefaultHealthcareRules(oID, dsID)
					for _, r := range defaultRules {
						_ = s.repo.CreateValidationRule(&r)
					}
					iter1 := ingest.NewMemoryIterator(pr)
					columnProfiles := quality.ProfileDataset(sc, iter1)
					profJSON, _ := json.Marshal(columnProfiles)
					
					iter2 := ingest.NewMemoryIterator(pr)
					valRes := quality.EvaluateQualityAndRules(dsID, oID, sc, iter2, defaultRules)
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
				}(dataset.ID, orgID, parseRes.Schema, parseRes.Preview)
			}
		}
	}

	duration := time.Since(start).Milliseconds()

	syncRecord := &domain.SnowflakeSyncRecord{
		ID:             fmt.Sprintf("sync-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		DatasetID:      dataset.ID,
		DatasetName:    dataset.Name,
		TargetTable:    "Lakehouse (MinIO CSV cache)",
		RecordsSynced:  int64(len(res.Rows)),
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

func (s *AnalyticsService) GetSnowflakeTables(orgID string) ([]map[string]interface{}, error) {
	if s.sf != nil {
		sfCfg, err := s.repo.GetSnowflakeConfig(orgID)
		if err != nil || sfCfg == nil || !sfCfg.IsConnected {
			return nil, fmt.Errorf("snowflake not configured for organization")
		}
		return s.sf.GetTables(sfCfg.Database, sfCfg.Schema)
	}
	return nil, fmt.Errorf("snowflake client not initialized or not connected")
}

func (s *AnalyticsService) getSnowflakeOverview(orgID string, filter domain.AnalyticsFilterParams, datasets []domain.Dataset) (*domain.AnalyticsOverviewResponse, error) {
	var pyResp analytics.PythonOverviewResponse
	
	var wg sync.WaitGroup
	var errs []error
	var errMutex sync.Mutex

	runQuery := func(query string, target interface{}) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			sfCfg, cfgErr := s.repo.GetSnowflakeConfig(orgID)
			if cfgErr != nil || sfCfg == nil || !sfCfg.IsConnected {
				errMutex.Lock()
				errs = append(errs, fmt.Errorf("snowflake not configured"))
				errMutex.Unlock()
				return
			}
			
			res, err := s.sf.ExecuteTenantQuery(sfCfg.Warehouse, sfCfg.Database, sfCfg.Schema, query)
			if err != nil {
				errMutex.Lock()
				errs = append(errs, err)
				errMutex.Unlock()
				return
			}
			
			switch v := target.(type) {
			case *map[string]interface{}:
				if len(res.Rows) > 0 {
					*v = res.Rows[0]
				} else {
					*v = make(map[string]interface{})
				}
			case *[]map[string]interface{}:
				*v = res.Rows
			}
		}()
	}

	runQuery(`
		SELECT 
			COUNT(*) as total_encounters,
			COUNT(DISTINCT patient_id) as active_patients,
			0 as unique_providers,
			AVG(length_of_stay) as avg_los,
			AVG(CASE WHEN readmitted = TRUE THEN 1.0 ELSE 0.0 END)*100 as readmission_pct,
			AVG(CASE WHEN LOWER(admission_type) LIKE '%emerg%' THEN 1.0 ELSE 0.0 END)*100 as emergency_pct,
			SUM(billing_amount) as total_cost,
			AVG(billing_amount) as avg_cost
		FROM clinical_encounters
	`, &pyResp.KPIs)

	runQuery(`
		SELECT 
			icd10_code,
			diagnosis_description as diagnosis_name,
			COUNT(*) as count,
			AVG(length_of_stay) as avg_los,
			AVG(CASE WHEN readmitted = TRUE THEN 1.0 ELSE 0.0 END)*100 as readmission_rate,
			AVG(billing_amount) as avg_cost
		FROM clinical_encounters
		GROUP BY icd10_code, diagnosis_description
		ORDER BY count DESC LIMIT 10
	`, &pyResp.TopDiagnoses)

	runQuery(`
		SELECT
			department,
			COUNT(*) as count,
			AVG(length_of_stay) as avg_los,
			AVG(billing_amount) as avg_cost,
			SUM(billing_amount) as total_cost,
			AVG(CASE WHEN readmitted = TRUE THEN 1.0 ELSE 0.0 END)*100 as readmission_rate
		FROM clinical_encounters
		GROUP BY department
		ORDER BY count DESC
	`, &pyResp.Departments)

	runQuery(`
		SELECT gender, COUNT(*) as count FROM clinical_encounters GROUP BY gender
	`, &pyResp.GenderBreakdown)

	runQuery(`
		SELECT 
			CASE 
				WHEN age < 18 THEN '< 18'
				WHEN age <= 35 THEN '18–35'
				WHEN age <= 50 THEN '36–50'
				WHEN age <= 65 THEN '51–65'
				ELSE '65+'
			END as cohort_label,
			COUNT(*) as count,
			AVG(length_of_stay) as avg_los,
			SUM(billing_amount) as total_cost
		FROM clinical_encounters
		GROUP BY 1
	`, &pyResp.AgeCohorts)

	wg.Wait()

	if len(errs) > 0 {
		log.Printf("⚠️ Snowflake queries failed, falling back to DuckDB. Error: %v", errs[0])
		return nil, fmt.Errorf("snowflake queries failed: %v", errs[0])
	}

	resp := s.engine.FormatDuckDBOverview(datasets, filter, pyResp)
	return &resp, nil
}
