// Phase 6: Machine Learning Pipeline Types

export type MLModelStatus = 'IDLE' | 'TRAINING' | 'COMPLETED' | 'FAILED';

export type MLAnomalySeverity = 'CRITICAL' | 'WARNING' | 'LOW';

export type MLAnomalyCategory =
  | 'CLINICAL_VITALS'
  | 'BILLING_CHARGES'
  | 'STAY_DURATION'
  | 'MEDICATION_DOSAGE';

export type MLAnomalyStatus =
  | 'PENDING_REVIEW'
  | 'CONFIRMED_ANOMALY'
  | 'FALSE_POSITIVE'
  | 'RESOLVED';

export type MLRiskTier = 'HIGH' | 'MODERATE' | 'LOW';

export interface MLFeatureImportance {
  featureName: string;
  importanceWeight: number;
  category: string;
  direction: string;
}

export interface MLModelRun {
  id: string;
  organizationId: string;
  datasetId: string;
  datasetName?: string;
  modelName: string;
  modelType: string;
  status: MLModelStatus;
  accuracy: number;
  f1Score: number;
  aucRoc: number;
  contamination: number;
  nEstimators: number;
  anomalyCount: number;
  totalRecords: number;
  hyperparameters: Record<string, any>;
  featureImportances: MLFeatureImportance[];
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  driftReport?: {
    dataset_drift_detected: boolean;
    drifted_features_count: number;
    total_features: number;
    drift_share: number;
    tests_passed: boolean;
    feature_details: Array<{
      feature: string;
      drift_score: number;
      stat_test: string;
    }>;
  };
}

export interface MLAnomaly {
  id: string;
  modelRunId: string;
  datasetId: string;
  datasetName?: string;
  organizationId: string;
  recordId: string;
  rowNumber: number;
  patientId: string;
  encounterId: string;
  patientName: string;
  anomalyScore: number;
  severity: MLAnomalySeverity;
  category: MLAnomalyCategory;
  description: string;
  explanationFlags: string[];
  recordData: Record<string, any>;
  status: MLAnomalyStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface MLRiskDriver {
  feature: string;
  impact: number;
  direction: string;
}

export interface MLRiskScore {
  id: string;
  modelRunId: string;
  datasetId: string;
  datasetName?: string;
  organizationId: string;
  patientId: string;
  encounterId: string;
  patientName: string;
  age: number;
  gender: string;
  primaryDiagnosis: string;
  riskScore: number;
  riskTier: MLRiskTier;
  readmissionProbability: number;
  predictedLosDays: number;
  topDrivers: MLRiskDriver[];
  clinicalRecommendations: string[];
  recordData: Record<string, any>;
  createdAt: string;
}

export interface MLSeverityStat {
  severity: MLAnomalySeverity;
  count: number;
  color: string;
}

export interface MLCategoryStat {
  category: MLAnomalyCategory;
  count: number;
}

export interface MLRiskTierStat {
  tier: MLRiskTier;
  count: number;
  percentage: number;
  color: string;
}

export interface MLOverviewResponse {
  totalInferences: number;
  totalAnomalies: number;
  anomalyRatePct: number;
  criticalAnomaliesCount: number;
  warningAnomaliesCount: number;
  lowAnomaliesCount: number;
  highRiskPatientCount: number;
  moderateRiskPatientCount: number;
  lowRiskPatientCount: number;
  averageRiskScore: number;
  modelAccuracy: number;
  modelAucRoc: number;
  severityBreakdown: MLSeverityStat[];
  categoryBreakdown: MLCategoryStat[];
  riskTierBreakdown: MLRiskTierStat[];
  globalFeatureImportance: MLFeatureImportance[];
  availableFilterOptions: {
    datasets: Array<{
      id: string;
      name: string;
      totalRecords: number;
      auditedAt: string;
    }>;
  };
  latestRun?: MLModelRun;
  calculatedAt: string;
}

export interface MLFilterParams {
  datasetId?: string;
  severity?: string;
  category?: string;
  status?: string;
  riskTier?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MLTrainRequest {
  datasetId: string;
  contamination?: number;
  nEstimators?: number;
  algorithm?: string;
}

export interface MLResolveAnomalyRequest {
  status: MLAnomalyStatus;
  resolutionNotes?: string;
}
