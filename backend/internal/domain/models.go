package domain

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Role string

const (
	RoleSuperAdmin Role = "SUPER_ADMIN"
	RoleOrgAdmin   Role = "ORG_ADMIN"
	RoleDataAnalyst Role = "DATA_ANALYST"
	RoleViewer     Role = "VIEWER"
)

type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PlatformSettings struct {
	ID                  string    `json:"id"`
	PlatformName        string    `json:"platformName"`
	SupportEmail        string    `json:"supportEmail"`
	MaintenanceMode     bool      `json:"maintenanceMode"`
	Enforce2FAGlobally  bool      `json:"enforce2FAGlobally"`
	SessionTimeoutMins  int       `json:"sessionTimeoutMins"`
	GeminiAPIKey        string    `json:"geminiAPIKey"`
	DefaultLLMModel     string    `json:"defaultLLMModel"`
	LLMTemperature      float64   `json:"llmTemperature"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type User struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	Email          string    `json:"email"`
	PasswordHash   string    `json:"-"`
	TOTPSecret     string    `json:"-"`
	TOTPEnabled    bool      `json:"totpEnabled"`
	FullName       string    `json:"fullName"`
	JobTitle       string    `json:"jobTitle"`
	Department     string    `json:"department"`
	NPINumber      string    `json:"npiNumber"`
	Phone          string    `json:"phone"`
	Role           Role      `json:"role"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type AuditLog struct {
	ID             string                 `json:"id"`
	OrganizationID string                 `json:"organizationId"`
	UserID         string                 `json:"userId"`
	UserEmail      string                 `json:"userEmail"`
	Action         string                 `json:"action"`
	Resource       string                 `json:"resource"`
	Severity       string                 `json:"severity,omitempty"` // INFO, WARNING, SECURITY, CRITICAL
	Module         string                 `json:"module,omitempty"`   // AUTH, DATASET, QUALITY, DEDUPE, ANALYTICS, ML, AI, PIPELINE, SYSTEM
	Status         string                 `json:"status,omitempty"`   // SUCCESS, FAILED, DENIED, ANOMALY
	Details        string                 `json:"details"`
	IPAddress      string                 `json:"ipAddress"`
	IntegrityHash  string                 `json:"integrityHash,omitempty"`
	PreviousHash   string                 `json:"previousHash,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
}

type AuthClaims struct {
	UserID         string `json:"userId"`
	OrganizationID string `json:"organizationId"`
	Email          string `json:"email"`
	FullName       string `json:"fullName"`
	Role           Role   `json:"role"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	OrganizationName string `json:"organizationName"`
	FullName         string `json:"fullName"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	JobTitle         string `json:"jobTitle"`
	Department       string `json:"department"`
	NPINumber        string `json:"npiNumber"`
	Phone            string `json:"phone"`
	Role             Role   `json:"role,omitempty"` // Default ORG_ADMIN
}

type RegisterUserRequest struct {
	OrganizationID string `json:"organizationId"`
	InviteCode     string `json:"inviteCode,omitempty"`
	FullName       string `json:"fullName"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	JobTitle       string `json:"jobTitle"`
	Department     string `json:"department"`
	NPINumber      string `json:"npiNumber"`
	Phone          string `json:"phone"`
	Role           Role   `json:"role"`
}

type CreateUserRequest struct {
	FullName   string `json:"fullName"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	JobTitle   string `json:"jobTitle"`
	Department string `json:"department"`
	NPINumber  string `json:"npiNumber"`
	Phone      string `json:"phone"`
	Role       Role   `json:"role"`
}

type AuthResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	User         UserResponse `json:"user"`
}

type UserResponse struct {
	ID             string        `json:"id"`
	Email          string        `json:"email"`
	FullName       string        `json:"fullName"`
	JobTitle       string        `json:"jobTitle"`
	Department     string        `json:"department"`
	NPINumber      string        `json:"npiNumber"`
	Phone          string        `json:"phone"`
	Role           Role          `json:"role"`
	IsActive       bool          `json:"isActive"`
	OrganizationID string        `json:"organizationId"`
	Organization   *Organization `json:"organization,omitempty"`
}

// Dataset Lifecycle Statuses
type DatasetStatus string

const (
	DatasetStatusPending    DatasetStatus = "PENDING"
	DatasetStatusProcessing DatasetStatus = "PROCESSING"
	DatasetStatusReady      DatasetStatus = "READY"
	DatasetStatusFailed     DatasetStatus = "FAILED"
)

type DatasetColumn struct {
	Name         string   `json:"name"`
	DataType     string   `json:"dataType"` // INTEGER, FLOAT, STRING, BOOLEAN, TIMESTAMP
	Nullable     bool     `json:"nullable"`
	SampleValues []string `json:"sampleValues,omitempty"`
}

type Dataset struct {
	ID             string        `json:"id"`
	OrganizationID string        `json:"organizationId"`
	UploadedBy     string        `json:"uploadedBy"`
	Name           string        `json:"name"`
	FileName       string        `json:"fileName"`
	FileSize       int64         `json:"fileSize"`
	MimeType       string        `json:"mimeType"`
	FileType       string        `json:"fileType"` // csv, json, parquet, ndjson
	StoragePath    string        `json:"storagePath"`
	ParquetPath    string        `json:"parquetPath,omitempty"`
	Status         DatasetStatus `json:"status"`
	TotalRecords   int64         `json:"totalRecords"`
	ColumnsCount   int           `json:"columnsCount"`
	SchemaJSON     string        `json:"schemaJson,omitempty"`
	PreviewJSON    string        `json:"previewJson,omitempty"`
	QualityScore   float64       `json:"qualityScore"`
	ErrorMessage   string        `json:"errorMessage,omitempty"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

type DatasetResponse struct {
	ID             string                   `json:"id"`
	OrganizationID string                   `json:"organizationId"`
	UploadedBy     string                   `json:"uploadedBy"`
	UploaderEmail  string                   `json:"uploaderEmail,omitempty"`
	Name           string                   `json:"name"`
	FileName       string                   `json:"fileName"`
	FileSize       int64                    `json:"fileSize"`
	MimeType       string                   `json:"mimeType"`
	FileType       string                   `json:"fileType"`
	StoragePath    string                   `json:"storagePath"`
	Status         DatasetStatus            `json:"status"`
	TotalRecords   int64                    `json:"totalRecords"`
	ColumnsCount   int                      `json:"columnsCount"`
	Schema         []DatasetColumn          `json:"schema,omitempty"`
	Preview        []map[string]interface{} `json:"preview,omitempty"`
	QualityScore   float64                  `json:"qualityScore"`
	ErrorMessage   string                   `json:"errorMessage,omitempty"`
	CreatedAt      time.Time                `json:"createdAt"`
	UpdatedAt      time.Time                `json:"updatedAt"`
}

type DatasetStatsResponse struct {
	TotalDatasets           int64 `json:"totalDatasets"`
	TotalRecords            int64 `json:"totalRecords"`
	TotalSizeBytes          int64 `json:"totalSizeBytes"`
	ReadyDatasetsCount      int64 `json:"readyDatasetsCount"`
	ProcessingDatasetsCount int64 `json:"processingDatasetsCount"`
}

type DatasetFilterParams struct {
	OrganizationID string
	Status         string
	Search         string
	Limit          int
	Offset         int
}

// -------------------------------------------------------------
// Phase 3: Data Quality, Validation Rules & Profiling Models
// -------------------------------------------------------------

type RuleType string

const (
	RuleTypeRequiredField    RuleType = "REQUIRED_FIELD"
	RuleTypeRangeCheck       RuleType = "RANGE_CHECK"
	RuleTypeRegexFormat      RuleType = "REGEX_FORMAT"
	RuleTypeEnumSet          RuleType = "ENUM_SET"
	RuleTypeDateOrder        RuleType = "DATE_ORDER"
	RuleTypeHealthcareICD10  RuleType = "HEALTHCARE_ICD10"
	RuleTypeHealthcareNPI    RuleType = "HEALTHCARE_NPI"
	RuleTypeHealthcareDOB    RuleType = "HEALTHCARE_DOB"
	RuleTypeClinicalVitals   RuleType = "CLINICAL_VITALS"
)

type RuleSeverity string

const (
	SeverityCritical RuleSeverity = "CRITICAL"
	SeverityWarning  RuleSeverity = "WARNING"
	SeverityInfo     RuleSeverity = "INFO"
)

type ValidationRule struct {
	ID             string       `json:"id"`
	DatasetID      string       `json:"datasetId"` // Empty for default org-wide rules
	OrganizationID string       `json:"organizationId"`
	FieldName      string       `json:"fieldName"`
	RuleType       RuleType     `json:"ruleType"`
	Severity       RuleSeverity `json:"severity"`
	Parameters     string       `json:"parameters"` // JSON string for ranges, regex, options
	IsActive       bool         `json:"isActive"`
	Description    string       `json:"description"`
	CreatedAt      time.Time    `json:"createdAt"`
	UpdatedAt      time.Time    `json:"updatedAt"`
}

type CreateValidationRuleRequest struct {
	FieldName   string       `json:"fieldName"`
	RuleType    RuleType     `json:"ruleType"`
	Severity    RuleSeverity `json:"severity"`
	Parameters  string       `json:"parameters"`
	IsActive    bool         `json:"isActive"`
	Description string       `json:"description"`
}

type UpdateValidationRuleRequest struct {
	FieldName   string       `json:"fieldName"`
	RuleType    RuleType     `json:"ruleType"`
	Severity    RuleSeverity `json:"severity"`
	Parameters  string       `json:"parameters"`
	IsActive    bool         `json:"isActive"`
	Description string       `json:"description"`
}

type HistogramBin struct {
	BinLabel string  `json:"binLabel"`
	MinVal   float64 `json:"minVal"`
	MaxVal   float64 `json:"maxVal"`
	Count    int     `json:"count"`
}

type ValueFrequency struct {
	Value string `json:"value"`
	Count int    `json:"count"`
	Pct   float64 `json:"pct"`
}

type ColumnProfile struct {
	ColumnName     string           `json:"columnName"`
	DataType       string           `json:"dataType"`
	TotalCount     int64            `json:"totalCount"`
	NullCount      int64            `json:"nullCount"`
	NullPercentage float64          `json:"nullPercentage"`
	DistinctCount  int64            `json:"distinctCount"`
	UniquePct      float64          `json:"uniquePct"`
	Min            interface{}      `json:"min,omitempty"`
	Max            interface{}      `json:"max,omitempty"`
	Mean           float64          `json:"mean,omitempty"`
	StdDev         float64          `json:"stdDev,omitempty"`
	Median         float64          `json:"median,omitempty"`
	Q25            float64          `json:"q25,omitempty"`
	Q75            float64          `json:"q75,omitempty"`
	TopValues      []ValueFrequency `json:"topValues,omitempty"`
	Histogram      []HistogramBin   `json:"histogram,omitempty"`
	HealthScore    float64          `json:"healthScore"` // 0-100
}

type QualityViolation struct {
	ID              string       `json:"id"`
	QualityReportID string       `json:"qualityReportId"`
	DatasetID       string       `json:"datasetId"`
	RowNumber       int64        `json:"rowNumber"`
	FieldName       string       `json:"fieldName"`
	RuleType        RuleType     `json:"ruleType"`
	Severity        RuleSeverity `json:"severity"`
	InvalidValue    string       `json:"invalidValue"`
	Message         string       `json:"message"`
	CreatedAt       time.Time    `json:"createdAt"`
}

type QualityReport struct {
	ID                 string            `json:"id"`
	DatasetID          string            `json:"datasetId"`
	DatasetName        string            `json:"datasetName,omitempty"`
	OrganizationID     string            `json:"organizationId"`
	OverallScore       float64           `json:"overallScore"`
	CompletenessScore  float64           `json:"completenessScore"`
	ValidityScore      float64           `json:"validityScore"`
	UniquenessScore    float64           `json:"uniquenessScore"`
	ConsistencyScore   float64           `json:"consistencyScore"`
	TotalChecks        int64             `json:"totalChecks"`
	PassedChecks       int64             `json:"passedChecks"`
	FailedChecks       int64             `json:"failedChecks"`
	TotalViolations    int64             `json:"totalViolations"`
	CriticalCount      int64             `json:"criticalCount"`
	WarningCount       int64             `json:"warningCount"`
	InfoCount          int64             `json:"infoCount"`
	ProfilingJSON      string            `json:"-"`
	ColumnProfiles     []ColumnProfile   `json:"columnProfiles,omitempty"`
	Violations         []QualityViolation `json:"violations,omitempty"`
	CreatedAt          time.Time         `json:"createdAt"`
}

type QualityOverview struct {
	AverageQualityScore float64         `json:"averageQualityScore"`
	TotalDatasetsAudited int64          `json:"totalDatasetsAudited"`
	TotalViolations     int64           `json:"totalViolations"`
	CriticalViolations  int64           `json:"criticalViolations"`
	WarningViolations   int64           `json:"warningViolations"`
	InfoViolations      int64           `json:"infoViolations"`
	PillarAverages      PillarScores    `json:"pillarAverages"`
	DatasetScores       []DatasetSummary `json:"datasetScores"`
}

type PillarScores struct {
	Completeness float64 `json:"completeness"`
	Validity     float64 `json:"validity"`
	Uniqueness   float64 `json:"uniqueness"`
	Consistency  float64 `json:"consistency"`
}

type DatasetSummary struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	TotalRecords int64     `json:"totalRecords"`
	QualityScore float64   `json:"qualityScore"`
	Violations   int64     `json:"violations"`
	AuditedAt    time.Time `json:"auditedAt"`
}

// -------------------------------------------------------------
// Phase 4: Duplicate Record Detection & Patient Resolution Models
// -------------------------------------------------------------

type DuplicateStatus string

const (
	DuplicateStatusPending  DuplicateStatus = "PENDING"
	DuplicateStatusMerged   DuplicateStatus = "MERGED"
	DuplicateStatusDistinct DuplicateStatus = "DISTINCT"
)

type FieldSimilarityScore struct {
	FieldName string  `json:"fieldName"`
	Score     float64 `json:"score"` // 0.0 to 1.0 (or 0-100%)
	Match     bool    `json:"match"`
	ValA      string  `json:"valA"`
	ValB      string  `json:"valB"`
}

type DemographicWeights struct {
	FirstNameWeight float64 `json:"firstNameWeight"`
	LastNameWeight  float64 `json:"lastNameWeight"`
	DOBWeight       float64 `json:"dobWeight"`
	PhoneWeight     float64 `json:"phoneWeight"`
	AddressWeight   float64 `json:"addressWeight"`
	MRNWeight       float64 `json:"mrnWeight"`
	GenderWeight    float64 `json:"genderWeight"`
	EmailWeight     float64 `json:"emailWeight"`
}

type DeduplicationConfig struct {
	ConfidenceThreshold float64            `json:"confidenceThreshold"` // e.g. 0.70
	BlockingStrategy    string             `json:"blockingStrategy"`    // SOUNDEX_LASTNAME, BIRTH_YEAR, FIRST_INITIAL_ZIP, ALL
	Weights             DemographicWeights `json:"weights"`
}

type DuplicatePair struct {
	ID               string                 `json:"id"`
	DatasetID        string                 `json:"datasetId"`
	DatasetName      string                 `json:"datasetName,omitempty"`
	OrganizationID   string                 `json:"organizationId"`
	RecordAID        string                 `json:"recordAId"`
	RecordBID        string                 `json:"recordBId"`
	RecordAData      map[string]interface{} `json:"recordAData"`
	RecordBData      map[string]interface{} `json:"recordBData"`
	ConfidenceScore  float64                `json:"confidenceScore"` // 0.00 to 1.00
	FieldScores      []FieldSimilarityScore `json:"fieldScores"`
	Status           DuplicateStatus        `json:"status"`
	ResolutionNotes  string                 `json:"resolutionNotes,omitempty"`
	ResolvedBy       string                 `json:"resolvedBy,omitempty"`
	ResolvedByEmail  string                 `json:"resolvedByEmail,omitempty"`
	ResolvedAt       *time.Time             `json:"resolvedAt,omitempty"`
	SurvivorRecordID string                 `json:"survivorRecordId,omitempty"`
	GoldenRecordData map[string]interface{} `json:"goldenRecordData,omitempty"`
	CreatedAt        time.Time              `json:"createdAt"`
	UpdatedAt        time.Time              `json:"updatedAt"`
}

type ResolveDuplicateRequest struct {
	Action           DuplicateStatus        `json:"action"` // MERGED or DISTINCT
	SurvivorRecordID string                 `json:"survivorRecordId,omitempty"` // recordA or recordB
	GoldenRecordData map[string]interface{} `json:"goldenRecordData,omitempty"`
	ResolutionNotes  string                 `json:"resolutionNotes,omitempty"`
}

type BulkResolveRequest struct {
	MinConfidence    float64         `json:"minConfidence"` // e.g. 0.90
	Action           DuplicateStatus `json:"action"`        // MERGED or DISTINCT
	AutoSurvivorRule string          `json:"autoSurvivorRule,omitempty"` // RECENT, COMPLETE, RECORD_A
	ResolutionNotes  string          `json:"resolutionNotes,omitempty"`
}

type GoldenRecord struct {
	ID             string                 `json:"id"`
	OrganizationID string                 `json:"organizationId"`
	DatasetID      string                 `json:"datasetId"`
	MasterPatientID string                `json:"masterPatientId"`
	ConsolidatedData map[string]interface{} `json:"consolidatedData"`
	SourceRecordIDs []string              `json:"sourceRecordIds"`
	DuplicatePairIDs []string             `json:"duplicatePairIds"`
	CreatedBy      string                 `json:"createdBy"`
	CreatedAt      time.Time              `json:"createdAt"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

type DeduplicationStats struct {
	TotalCandidatePairs int64   `json:"totalCandidatePairs"`
	PendingReviewCount  int64   `json:"pendingReviewCount"`
	MergedCount         int64   `json:"mergedCount"`
	DistinctCount       int64   `json:"distinctCount"`
	AvgConfidence       float64 `json:"avgConfidence"`
	HighConfidenceCount int64   `json:"highConfidenceCount"` // >= 90%
	MedConfidenceCount  int64   `json:"medConfidenceCount"`  // 75% - 89%
	LowConfidenceCount  int64   `json:"lowConfidenceCount"`  // < 75%
}

type DuplicateFilterParams struct {
	DatasetID      string
	OrganizationID string
	Status         string
	MinConfidence  float64
	MaxConfidence  float64
	Search         string
	Limit          int
	Offset         int
}

// -------------------------------------------------------------
// Phase 5: Healthcare Analytics, OLAP Query Engine & Snowflake
// -------------------------------------------------------------

type ClinicalKPIOverview struct {
	TotalEncounters     int64   `json:"totalEncounters"`
	ActivePatients      int64   `json:"activePatients"`
	UniqueProviders     int64   `json:"uniqueProviders"`
	AverageLOSDays      float64 `json:"averageLosDays"`
	ReadmissionRatePct  float64 `json:"readmissionRatePct"`
	EmergencyRatioPct   float64 `json:"emergencyRatioPct"`
	TotalIncurredCost   float64 `json:"totalIncurredCost"`
	AverageCostPerVisit float64 `json:"averageCostPerVisit"`
	DatasetsCount       int64   `json:"datasetsCount"`

	// Comparison Deltas (vs previous period/baseline)
	EncountersGrowthPct float64 `json:"encountersGrowthPct"`
	LOSDeltaDays        float64 `json:"losDeltaDays"`
	ReadmissionDeltaPct float64 `json:"readmissionDeltaPct"`
	CostGrowthPct       float64 `json:"costGrowthPct"`
}

type VolumeTrendPoint struct {
	Period      string `json:"period"` // e.g. "2024-01" or "2024-Q1"
	Admissions  int64  `json:"admissions"`
	Discharges  int64  `json:"discharges"`
	Inpatient   int64  `json:"inpatient"`
	Outpatient  int64  `json:"outpatient"`
	Emergency   int64  `json:"emergency"`
	TotalVolume int64  `json:"totalVolume"`
}

type DepartmentMetric struct {
	Department        string  `json:"department"`
	EncounterCount    int64   `json:"encounterCount"`
	AverageLOSDays    float64 `json:"averageLosDays"`
	BedOccupancyPct   float64 `json:"bedOccupancyPct"`
	AverageCost       float64 `json:"averageCost"`
	TotalCost         float64 `json:"totalCost"`
	ReadmissionRate   float64 `json:"readmissionRate"`
	ActiveStaffCount  int64   `json:"activeStaffCount"`
}

type DiagnosisDistribution struct {
	ICD10Code       string  `json:"icd10Code"`
	DiagnosisName   string  `json:"diagnosisName"`
	Category        string  `json:"category"`
	PatientCount    int64   `json:"patientCount"`
	Percentage      float64 `json:"percentage"`
	AvgLOSDays      float64 `json:"avgLosDays"`
	ReadmissionRate float64 `json:"readmissionRate"`
	AvgCost         float64 `json:"avgCost"`
}

type DemographicCohort struct {
	CohortLabel  string  `json:"cohortLabel"` // "<18", "18-35", "36-50", "51-65", "65+"
	PatientCount int64   `json:"patientCount"`
	Percentage   float64 `json:"percentage"`
	AvgLOSDays   float64 `json:"avgLosDays"`
	TotalCost    float64 `json:"totalCost"`
}

type PayerMixDistribution struct {
	PayerName    string  `json:"payerName"` // "Medicare", "Medicaid", "Commercial BlueCross", "UnitedHealth", "Self-Pay"
	PatientCount int64   `json:"patientCount"`
	Percentage   float64 `json:"percentage"`
	TotalBilled  float64 `json:"totalBilled"`
}

type AnalyticsOverviewResponse struct {
	KPIs            ClinicalKPIOverview     `json:"kpis"`
	VolumeTrends    []VolumeTrendPoint      `json:"volumeTrends"`
	TopDiagnoses    []DiagnosisDistribution `json:"topDiagnoses"`
	Departments     []DepartmentMetric      `json:"departments"`
	AgeCohorts      []DemographicCohort     `json:"ageCohorts"`
	PayerMix        []PayerMixDistribution  `json:"payerMix"`
	GenderBreakdown map[string]int64        `json:"genderBreakdown"`
	AvailableFilterOptions struct {
		Datasets    []DatasetSummary `json:"datasets"`
		Departments []string         `json:"departments"`
		DateRanges  []string         `json:"dateRanges"`
	} `json:"availableFilterOptions"`
	CalculatedAt time.Time `json:"calculatedAt"`
}

type AnalyticsFilterParams struct {
	DatasetID      string `json:"datasetId,omitempty"`
	OrganizationID string `json:"organizationId,omitempty"`
	DateRange      string `json:"dateRange,omitempty"` // "30d", "90d", "1y", "all"
	Department     string `json:"department,omitempty"`
	AdmissionType  string `json:"admissionType,omitempty"` // "Inpatient", "Outpatient", "Emergency"
	AgeCohort      string `json:"ageCohort,omitempty"`
	Gender         string `json:"gender,omitempty"`
}

type SQLQueryRequest struct {
	DatasetID string `json:"datasetId,omitempty"`
	Query     string `json:"query"`
	Limit     int    `json:"limit,omitempty"`
}

type SQLQueryColumn struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"`
}

type SQLQueryResponse struct {
	Query           string                   `json:"query"`
	Columns         []SQLQueryColumn         `json:"columns"`
	Rows            []map[string]interface{} `json:"rows"`
	TotalRows       int64                    `json:"totalRows"`
	ExecutionTimeMs float64                  `json:"executionTimeMs"`
	Engine          string                   `json:"engine"` // "DuckDB / In-Memory Columnar OLAP"
	ScannedBytes    int64                    `json:"scannedBytes"`
	Cached          bool                     `json:"cached"`
	Error           string                   `json:"error,omitempty"`
}

type SnowflakeConfig struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	Account        string    `json:"account"`
	Warehouse      string    `json:"warehouse"`
	Database       string    `json:"database"`
	Schema         string    `json:"schema"`
	Role           string    `json:"role"`
	Username       string    `json:"username"`
	IsConnected    bool      `json:"isConnected"`
	AutoSync       bool      `json:"autoSync"`
	SyncInterval   string    `json:"syncInterval"` // "HOURLY", "DAILY", "MANUAL"
	LastSyncAt     *time.Time `json:"lastSyncAt,omitempty"`
	LastSyncStatus string    `json:"lastSyncStatus,omitempty"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type SnowflakeSyncRecord struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	DatasetID      string    `json:"datasetId,omitempty"`
	DatasetName    string    `json:"datasetName,omitempty"`
	TargetTable    string    `json:"targetTable"`
	RecordsSynced  int64     `json:"recordsSynced"`
	DurationMs     int64     `json:"durationMs"`
	Status         string    `json:"status"` // "SUCCESS", "FAILED", "RUNNING"
	ErrorMessage   string    `json:"errorMessage,omitempty"`
	TriggeredBy    string    `json:"triggeredBy"`
	CreatedAt      time.Time `json:"createdAt"`
}

type SnowflakeStatusResponse struct {
	Config      *SnowflakeConfig      `json:"config"`
	RecentSyncs []SnowflakeSyncRecord `json:"recentSyncs"`
	TotalSyncs  int64                 `json:"totalSyncs"`
	LastSuccess *time.Time            `json:"lastSuccess,omitempty"`
}

// Phase 6: Machine Learning Pipeline Models

type MLModelStatus string

const (
	MLModelStatusIdle      MLModelStatus = "IDLE"
	MLModelStatusTraining  MLModelStatus = "TRAINING"
	MLModelStatusCompleted MLModelStatus = "COMPLETED"
	MLModelStatusFailed    MLModelStatus = "FAILED"
)

type MLAnomalySeverity string

const (
	MLAnomalySeverityCritical MLAnomalySeverity = "CRITICAL"
	MLAnomalySeverityWarning  MLAnomalySeverity = "WARNING"
	MLAnomalySeverityLow      MLAnomalySeverity = "LOW"
)

type MLAnomalyCategory string

const (
	MLAnomalyCategoryClinicalVitals   MLAnomalyCategory = "CLINICAL_VITALS"
	MLAnomalyCategoryBillingCharges  MLAnomalyCategory = "BILLING_CHARGES"
	MLAnomalyCategoryStayDuration     MLAnomalyCategory = "STAY_DURATION"
	MLAnomalyCategoryMedicationDosage MLAnomalyCategory = "MEDICATION_DOSAGE"
)

type MLAnomalyStatus string

const (
	MLAnomalyStatusPendingReview    MLAnomalyStatus = "PENDING_REVIEW"
	MLAnomalyStatusConfirmedAnomaly MLAnomalyStatus = "CONFIRMED_ANOMALY"
	MLAnomalyStatusFalsePositive    MLAnomalyStatus = "FALSE_POSITIVE"
	MLAnomalyStatusResolved         MLAnomalyStatus = "RESOLVED"
)

type MLRiskTier string

const (
	MLRiskTierHigh     MLRiskTier = "HIGH"
	MLRiskTierModerate MLRiskTier = "MODERATE"
	MLRiskTierLow      MLRiskTier = "LOW"
)

type MLFeatureImportance struct {
	FeatureName      string  `json:"featureName"`
	ImportanceWeight float64 `json:"importanceWeight"`
	Category         string  `json:"category"`
	Direction        string  `json:"direction"`
}

type MLModelRun struct {
	ID                 string                 `json:"id"`
	OrganizationID     string                 `json:"organizationId"`
	DatasetID          string                 `json:"datasetId"`
	DatasetName        string                 `json:"datasetName,omitempty"`
	ModelName          string                 `json:"modelName"`
	ModelType          string                 `json:"modelType"`
	Status             MLModelStatus          `json:"status"`
	Accuracy           float64                `json:"accuracy"`
	F1Score            float64                `json:"f1Score"`
	AucRoc             float64                `json:"aucRoc"`
	Contamination      float64                `json:"contamination"`
	NEstimators        int                    `json:"nEstimators"`
	AnomalyCount       int64                  `json:"anomalyCount"`
	TotalRecords       int64                  `json:"totalRecords"`
	Hyperparameters    map[string]interface{} `json:"hyperparameters"`
	FeatureImportances []MLFeatureImportance  `json:"featureImportances"`
	ErrorMessage       string                 `json:"errorMessage,omitempty"`
	CreatedAt          time.Time              `json:"createdAt"`
	CompletedAt        *time.Time             `json:"completedAt,omitempty"`
}

type MLAnomaly struct {
	ID               string                 `json:"id"`
	ModelRunID       string                 `json:"modelRunId"`
	DatasetID        string                 `json:"datasetId"`
	DatasetName      string                 `json:"datasetName,omitempty"`
	OrganizationID   string                 `json:"organizationId"`
	RecordID         string                 `json:"recordId"`
	RowNumber        int                    `json:"rowNumber"`
	PatientID        string                 `json:"patientId"`
	EncounterID      string                 `json:"encounterId"`
	PatientName      string                 `json:"patientName"`
	AnomalyScore     float64                `json:"anomalyScore"`
	Severity         MLAnomalySeverity      `json:"severity"`
	Category         MLAnomalyCategory      `json:"category"`
	Description      string                 `json:"description"`
	ExplanationFlags []string               `json:"explanationFlags"`
	RecordData       map[string]interface{} `json:"recordData"`
	Status           MLAnomalyStatus        `json:"status"`
	ResolutionNotes  string                 `json:"resolutionNotes,omitempty"`
	ResolvedBy       string                 `json:"resolvedBy,omitempty"`
	ResolvedAt       *time.Time             `json:"resolvedAt,omitempty"`
	CreatedAt        time.Time              `json:"createdAt"`
}

type MLRiskDriver struct {
	Feature   string  `json:"feature"`
	Impact    float64 `json:"impact"`
	Direction string  `json:"direction"`
}

type MLRiskScore struct {
	ID                       string                 `json:"id"`
	ModelRunID               string                 `json:"modelRunId"`
	DatasetID                string                 `json:"datasetId"`
	DatasetName              string                 `json:"datasetName,omitempty"`
	OrganizationID           string                 `json:"organizationId"`
	PatientID                string                 `json:"patientId"`
	EncounterID              string                 `json:"encounterId"`
	PatientName              string                 `json:"patientName"`
	Age                      int                    `json:"age"`
	Gender                   string                 `json:"gender"`
	PrimaryDiagnosis         string                 `json:"primaryDiagnosis"`
	RiskScore                float64                `json:"riskScore"`
	RiskTier                 MLRiskTier             `json:"riskTier"`
	ReadmissionProbability   float64                `json:"readmissionProbability"`
	PredictedLOSDays         float64                `json:"predictedLosDays"`
	TopDrivers               []MLRiskDriver         `json:"topDrivers"`
	ClinicalRecommendations  []string               `json:"clinicalRecommendations"`
	RecordData               map[string]interface{} `json:"recordData"`
	CreatedAt                time.Time              `json:"createdAt"`
}

type MLSeverityStat struct {
	Severity MLAnomalySeverity `json:"severity"`
	Count    int64             `json:"count"`
	Color    string            `json:"color"`
}

type MLCategoryStat struct {
	Category MLAnomalyCategory `json:"category"`
	Count    int64             `json:"count"`
}

type MLRiskTierStat struct {
	Tier       MLRiskTier `json:"tier"`
	Count      int64      `json:"count"`
	Percentage float64    `json:"percentage"`
	Color      string     `json:"color"`
}

type MLOverviewResponse struct {
	TotalInferences         int64                 `json:"totalInferences"`
	TotalAnomalies          int64                 `json:"totalAnomalies"`
	AnomalyRatePct          float64               `json:"anomalyRatePct"`
	CriticalAnomaliesCount  int64                 `json:"criticalAnomaliesCount"`
	WarningAnomaliesCount   int64                 `json:"warningAnomaliesCount"`
	LowAnomaliesCount       int64                 `json:"lowAnomaliesCount"`
	HighRiskPatientCount    int64                 `json:"highRiskPatientCount"`
	ModerateRiskPatientCount int64                `json:"moderateRiskPatientCount"`
	LowRiskPatientCount     int64                 `json:"lowRiskPatientCount"`
	AverageRiskScore        float64               `json:"averageRiskScore"`
	ModelAccuracy           float64               `json:"modelAccuracy"`
	ModelAucRoc             float64               `json:"modelAucRoc"`
	SeverityBreakdown       []MLSeverityStat      `json:"severityBreakdown"`
	CategoryBreakdown       []MLCategoryStat      `json:"categoryBreakdown"`
	RiskTierBreakdown       []MLRiskTierStat      `json:"riskTierBreakdown"`
	GlobalFeatureImportance []MLFeatureImportance `json:"globalFeatureImportance"`
	AvailableFilterOptions  struct {
		Datasets []DatasetSummary `json:"datasets"`
	} `json:"availableFilterOptions"`
	LatestRun    *MLModelRun `json:"latestRun,omitempty"`
	CalculatedAt time.Time   `json:"calculatedAt"`
}

type MLFilterParams struct {
	DatasetID      string `json:"datasetId,omitempty"`
	OrganizationID string `json:"organizationId,omitempty"`
	Severity       string `json:"severity,omitempty"`
	Category       string `json:"category,omitempty"`
	Status         string `json:"status,omitempty"`
	RiskTier       string `json:"riskTier,omitempty"`
	Search         string `json:"search,omitempty"`
	Limit          int    `json:"limit,omitempty"`
	Offset         int    `json:"offset,omitempty"`
}

type MLTrainRequest struct {
	DatasetID     string  `json:"datasetId"`
	Contamination float64 `json:"contamination,omitempty"`
	NEstimators   int     `json:"nEstimators,omitempty"`
	Algorithm     string  `json:"algorithm,omitempty"`
}

type MLResolveAnomalyRequest struct {
	Status          MLAnomalyStatus `json:"status"`
	ResolutionNotes string          `json:"resolutionNotes,omitempty"`
}

// -------------------------------------------------------------
// Phase 7: Local AI, Natural Language Analytics & Smart Reporting
// -------------------------------------------------------------

type AIChatRole string

const (
	AIChatRoleUser      AIChatRole = "user"
	AIChatRoleAssistant AIChatRole = "assistant"
	AIChatRoleSystem    AIChatRole = "system"
)

type AIChatMessage struct {
	ID              string                   `json:"id"`
	SessionID       string                   `json:"sessionId"`
	Role            AIChatRole               `json:"role"`
	Content         string                   `json:"content"`
	GeneratedSQL    string                   `json:"generatedSql,omitempty"`
	Columns         []SQLQueryColumn         `json:"columns,omitempty"`
	Rows            []map[string]interface{} `json:"rows,omitempty"`
	RowCount        int64                    `json:"rowCount,omitempty"`
	ExecutionTimeMs float64                  `json:"executionTimeMs,omitempty"`
	Engine          string                   `json:"engine,omitempty"`
	Model           string                   `json:"model,omitempty"`
	Metadata        map[string]interface{}   `json:"metadata,omitempty"`
	CreatedAt       time.Time                `json:"createdAt"`
}

type AIChatSession struct {
	ID             string          `json:"id"`
	OrganizationID string          `json:"organizationId"`
	UserID         string          `json:"userId"`
	Title          string          `json:"title"`
	DatasetID      string          `json:"datasetId,omitempty"`
	DatasetName    string          `json:"datasetName,omitempty"`
	ActiveModel    string          `json:"activeModel"`
	Messages       []AIChatMessage `json:"messages"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

type AIChatRequest struct {
	SessionID string `json:"sessionId,omitempty"`
	DatasetID string `json:"datasetId,omitempty"`
	Question  string `json:"question"`
	Model     string `json:"model,omitempty"`
}

type AIChatResponse struct {
	SessionID        string        `json:"sessionId"`
	UserMessage      AIChatMessage `json:"userMessage"`
	AssistantMessage AIChatMessage `json:"assistantMessage"`
}

type AINarrativeInsight struct {
	DatasetID          string    `json:"datasetId,omitempty"`
	DatasetName        string    `json:"datasetName"`
	ExecutiveSummary   string    `json:"executiveSummary"`
	KeyFindings        []string  `json:"keyFindings"`
	StrategicRisks     []string  `json:"strategicRisks"`
	RecommendedActions []string  `json:"recommendedActions"`
	GeneratedAt        time.Time `json:"generatedAt"`
}

type AIClinicalReport struct {
	ID                 string    `json:"id"`
	OrganizationID     string    `json:"organizationId"`
	Title              string    `json:"title"`
	DatasetID          string    `json:"datasetId,omitempty"`
	DatasetName        string    `json:"datasetName"`
	ExecutiveSummary   string    `json:"executiveSummary"`
	KeyFindings        []string  `json:"keyFindings"`
	StrategicRisks     []string  `json:"strategicRisks"`
	RecommendedActions []string  `json:"recommendedActions"`
	MarkdownContent    string    `json:"markdownContent"`
	GeneratedBy        string    `json:"generatedBy"`
	CreatedAt          time.Time `json:"createdAt"`
}

type AIReportRequest struct {
	Title     string   `json:"title,omitempty"`
	DatasetID string   `json:"datasetId,omitempty"`
	Sections  []string `json:"sections,omitempty"`
}

type GeminiStatusResponse struct {
	Connected       bool     `json:"connected"`
	URL             string   `json:"url"`
	ActiveModel     string   `json:"activeModel"`
	AvailableModels []string `json:"availableModels"`
	FallbackEngine  string   `json:"fallbackEngine,omitempty"`
}

// -------------------------------------------------------------
// Phase 8: Pipeline Orchestration & Enterprise Governance Models
// -------------------------------------------------------------

type PipelineStatus string

const (
	PipelineStatusPending   PipelineStatus = "PENDING"
	PipelineStatusRunning   PipelineStatus = "RUNNING"
	PipelineStatusCompleted PipelineStatus = "COMPLETED"
	PipelineStatusFailed    PipelineStatus = "FAILED"
	PipelineStatusCancelled PipelineStatus = "CANCELLED"
)

type PipelineStageKey string

const (
	StageIngestion     PipelineStageKey = "INGESTION"
	StageProfiling     PipelineStageKey = "PROFILING"
	StageValidation    PipelineStageKey = "VALIDATION"
	StageDeduplication PipelineStageKey = "DEDUPLICATION"
	StageMLInference   PipelineStageKey = "ML_INFERENCE"
	StageAISynthesis   PipelineStageKey = "AI_SYNTHESIS"
)

type PipelineStageStatus string

const (
	StageStatusPending   PipelineStageStatus = "PENDING"
	StageStatusRunning   PipelineStageStatus = "RUNNING"
	StageStatusCompleted PipelineStageStatus = "COMPLETED"
	StageStatusFailed    PipelineStageStatus = "FAILED"
	StageStatusSkipped   PipelineStageStatus = "SKIPPED"
)

type PipelineStage struct {
	Key              PipelineStageKey       `json:"key"`
	Name             string                 `json:"name"`
	Description      string                 `json:"description"`
	Status           PipelineStageStatus    `json:"status"`
	Progress         int                    `json:"progress"` // 0-100
	StartedAt        *time.Time             `json:"startedAt,omitempty"`
	CompletedAt      *time.Time             `json:"completedAt,omitempty"`
	DurationMs       int64                  `json:"durationMs"`
	RecordsProcessed int64                  `json:"recordsProcessed"`
	RecordsPassed    int64                  `json:"recordsPassed"`
	RecordsFlagged   int64                  `json:"recordsFlagged"`
	Summary          string                 `json:"summary,omitempty"`
	Error            string                 `json:"error,omitempty"`
	OutputArtifacts  map[string]interface{} `json:"outputArtifacts,omitempty"`
}

type PipelineExecutionLog struct {
	ID         string                 `json:"id"`
	PipelineID string                 `json:"pipelineId"`
	StageKey   PipelineStageKey       `json:"stageKey"`
	Level      string                 `json:"level"` // INFO, WARN, ERROR, SUCCESS
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	Timestamp  time.Time              `json:"timestamp"`
}

type PipelineJob struct {
	ID                string                 `json:"id"`
	OrganizationID    string                 `json:"organizationId"`
	DatasetID         string                 `json:"datasetId"`
	DatasetName       string                 `json:"datasetName"`
	InitiatedBy       string                 `json:"initiatedBy"`
	InitiatedByName   string                 `json:"initiatedByName"`
	Status            PipelineStatus         `json:"status"`
	CurrentStage      PipelineStageKey       `json:"currentStage"`
	OverallProgress   int                    `json:"overallProgress"` // 0-100
	TriggerType       string                 `json:"triggerType"`     // MANUAL, AUTOMATED_INGEST, SCHEDULED, RETRY
	Stages            []PipelineStage        `json:"stages"`
	TotalRecords      int64                  `json:"totalRecords"`
	QualityScore      float64                `json:"qualityScore"`
	DuplicatesFound   int                    `json:"duplicatesFound"`
	AnomaliesDetected int                    `json:"anomaliesDetected"`
	HighRiskPatients  int                    `json:"highRiskPatients"`
	ErrorMessage      string                 `json:"errorMessage,omitempty"`
	Metadata          map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt         time.Time              `json:"createdAt"`
	StartedAt         *time.Time             `json:"startedAt,omitempty"`
	CompletedAt       *time.Time             `json:"completedAt,omitempty"`
	DurationMs        int64                  `json:"durationMs"`
}

type PipelineRunRequest struct {
	DatasetID   string                 `json:"datasetId"`
	Stages      []PipelineStageKey     `json:"stages,omitempty"` // If empty, all stages
	TriggerType string                 `json:"triggerType,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty"`
}

type PipelineStageBottleneck struct {
	StageKey      PipelineStageKey `json:"stageKey"`
	StageName     string           `json:"stageName"`
	AvgDurationMs float64          `json:"avgDurationMs"`
	FailureRate   float64          `json:"failureRate"`
	TotalRuns     int              `json:"totalRuns"`
}

type PipelineStats struct {
	TotalRuns              int                       `json:"totalRuns"`
	ActiveRuns             int                       `json:"activeRuns"`
	CompletedRuns          int                       `json:"completedRuns"`
	FailedRuns             int                       `json:"failedRuns"`
	SuccessRate            float64                   `json:"successRate"`
	AvgDurationMs          float64                   `json:"avgDurationMs"`
	TotalRecordsProcessed  int64                     `json:"totalRecordsProcessed"`
	StageBottlenecks       []PipelineStageBottleneck `json:"stageBottlenecks"`
	RecentRuns             []PipelineJob             `json:"recentRuns"`
	CalculatedAt           time.Time                 `json:"calculatedAt"`
}

type PipelineFilterParams struct {
	DatasetID      string         `json:"datasetId,omitempty"`
	OrganizationID string         `json:"organizationId,omitempty"`
	Status         PipelineStatus `json:"status,omitempty"`
	TriggerType    string         `json:"triggerType,omitempty"`
	Limit          int            `json:"limit,omitempty"`
	Offset         int            `json:"offset,omitempty"`
}


