export interface ClinicalKPIOverview {
  totalEncounters: number;
  activePatients: number;
  uniqueProviders: number;
  averageLosDays: number;
  readmissionRatePct: number;
  emergencyRatioPct: number;
  totalIncurredCost: number;
  averageCostPerVisit: number;
  datasetsCount: number;
  encountersGrowthPct: number;
  losDeltaDays: number;
  readmissionDeltaPct: number;
  costGrowthPct: number;
}

export interface VolumeTrendPoint {
  period: string;
  admissions: number;
  discharges: number;
  inpatient: number;
  outpatient: number;
  emergency: number;
  totalVolume: number;
}

export interface DepartmentMetric {
  department: string;
  encounterCount: number;
  averageLosDays: number;
  bedOccupancyPct: number;
  averageCost: number;
  totalCost: number;
  readmissionRate: number;
  activeStaffCount: number;
}

export interface DiagnosisDistribution {
  icd10Code: string;
  diagnosisName: string;
  category: string;
  patientCount: number;
  percentage: number;
  avgLosDays: number;
  readmissionRate: number;
  avgCost: number;
}

export interface DemographicCohort {
  cohortLabel: string;
  patientCount: number;
  percentage: number;
  avgLosDays: number;
  totalCost: number;
}

export interface PayerMixDistribution {
  payerName: string;
  patientCount: number;
  percentage: number;
  totalBilled: number;
}

export interface DatasetSummaryOption {
  id: string;
  name: string;
  totalRecords: number;
  qualityScore: number;
}

export interface AnalyticsOverviewResponse {
  kpis: ClinicalKPIOverview;
  volumeTrends: VolumeTrendPoint[];
  topDiagnoses: DiagnosisDistribution[];
  departments: DepartmentMetric[];
  ageCohorts: DemographicCohort[];
  payerMix: PayerMixDistribution[];
  genderBreakdown: Record<string, number>;
  availableFilterOptions: {
    datasets: DatasetSummaryOption[];
    departments: string[];
    dateRanges: string[];
  };
  calculatedAt: string;
}

export interface AnalyticsFilterParams {
  datasetId?: string;
  dateRange?: string;
  department?: string;
  admissionType?: string;
  ageCohort?: string;
  gender?: string;
}

export interface SQLQueryColumn {
  name: string;
  dataType: string;
}

export interface SQLQueryRequest {
  datasetId?: string;
  query: string;
  limit?: number;
}

export interface SQLQueryResponse {
  query: string;
  columns: SQLQueryColumn[];
  rows: Array<Record<string, any>>;
  totalRows: number;
  executionTimeMs: number;
  engine: string;
  scannedBytes: number;
  cached: boolean;
  error?: string;
}

export interface SnowflakeConfig {
  id: string;
  organizationId: string;
  account: string;
  warehouse: string;
  database: string;
  schema: string;
  role: string;
  username: string;
  password?: string;
  isConnected: boolean;
  autoSync: boolean;
  syncInterval: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  updatedAt: string;
}

export interface SnowflakeSyncRecord {
  id: string;
  organizationId: string;
  datasetId?: string;
  datasetName?: string;
  targetTable: string;
  recordsSynced: number;
  durationMs: number;
  status: string;
  errorMessage?: string;
  triggeredBy: string;
  createdAt: string;
}

export interface SnowflakeStatusResponse {
  config: SnowflakeConfig;
  recentSyncs: SnowflakeSyncRecord[];
  totalSyncs: number;
  lastSuccess?: string;
}
