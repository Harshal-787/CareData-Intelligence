export type RuleType =
  | 'REQUIRED_FIELD'
  | 'RANGE_CHECK'
  | 'REGEX_FORMAT'
  | 'ENUM_SET'
  | 'DATE_ORDER'
  | 'HEALTHCARE_ICD10'
  | 'HEALTHCARE_NPI'
  | 'HEALTHCARE_DOB'
  | 'CLINICAL_VITALS';

export type RuleSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ValidationRule {
  id: string;
  datasetId: string;
  organizationId: string;
  fieldName: string;
  ruleType: RuleType;
  severity: RuleSeverity;
  parameters: string;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateValidationRuleRequest {
  fieldName: string;
  ruleType: RuleType;
  severity: RuleSeverity;
  parameters: string;
  isActive: boolean;
  description: string;
}

export interface UpdateValidationRuleRequest {
  fieldName?: string;
  ruleType?: RuleType;
  severity?: RuleSeverity;
  parameters?: string;
  isActive: boolean;
  description?: string;
}

export interface HistogramBin {
  binLabel: string;
  minVal: number;
  maxVal: number;
  count: number;
}

export interface ValueFrequency {
  value: string;
  count: number;
  pct: number;
}

export interface ColumnProfile {
  columnName: string;
  dataType: string;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  uniquePct: number;
  min?: any;
  max?: any;
  mean?: number;
  stdDev?: number;
  median?: number;
  q25?: number;
  q75?: number;
  topValues?: ValueFrequency[];
  histogram?: HistogramBin[];
  healthScore: number;
}

export interface QualityViolation {
  id: string;
  qualityReportId: string;
  datasetId: string;
  rowNumber: number;
  fieldName: string;
  ruleType: RuleType;
  severity: RuleSeverity;
  invalidValue: string;
  message: string;
  createdAt: string;
}

export interface QualityReport {
  id: string;
  datasetId: string;
  datasetName?: string;
  organizationId: string;
  overallScore: number;
  completenessScore: number;
  validityScore: number;
  uniquenessScore: number;
  consistencyScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  totalViolations: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  columnProfiles?: ColumnProfile[];
  violations?: QualityViolation[];
  createdAt: string;
}

export interface PillarScores {
  completeness: number;
  validity: number;
  uniqueness: number;
  consistency: number;
}

export interface DatasetSummary {
  id: string;
  name: string;
  totalRecords: number;
  qualityScore: number;
  violations: number;
  auditedAt: string;
}

export interface QualityOverview {
  averageQualityScore: number;
  totalDatasetsAudited: number;
  totalViolations: number;
  criticalViolations: number;
  warningViolations: number;
  infoViolations: number;
  pillarAverages: PillarScores;
  datasetScores: DatasetSummary[];
}
