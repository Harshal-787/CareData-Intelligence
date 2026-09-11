export type DuplicateStatus = "PENDING" | "MERGED" | "DISTINCT";

export interface FieldSimilarityScore {
  fieldName: string;
  score: number; // 0-100%
  match: boolean;
  valA: string;
  valB: string;
}

export interface DemographicWeights {
  firstNameWeight: number;
  lastNameWeight: number;
  dobWeight: number;
  phoneWeight: number;
  addressWeight: number;
  mrnWeight: number;
  genderWeight: number;
  emailWeight: number;
}

export interface DeduplicationConfig {
  confidenceThreshold: number;
  blockingStrategy: string;
  weights: DemographicWeights;
}

export interface DuplicatePair {
  id: string;
  datasetId: string;
  datasetName?: string;
  organizationId: string;
  recordAId: string;
  recordBId: string;
  recordAData: Record<string, any>;
  recordBData: Record<string, any>;
  confidenceScore: number; // 0.00 to 1.00
  fieldScores: FieldSimilarityScore[];
  status: DuplicateStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedByEmail?: string;
  resolvedAt?: string;
  survivorRecordId?: string;
  goldenRecordData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveDuplicateRequest {
  action: DuplicateStatus;
  survivorRecordId?: string;
  goldenRecordData?: Record<string, any>;
  resolutionNotes?: string;
}

export interface BulkResolveRequest {
  minConfidence: number;
  action: DuplicateStatus;
  autoSurvivorRule?: string;
  resolutionNotes?: string;
}

export interface GoldenRecord {
  id: string;
  organizationId: string;
  datasetId: string;
  masterPatientId: string;
  consolidatedData: Record<string, any>;
  sourceRecordIds: string[];
  duplicatePairIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeduplicationStats {
  totalCandidatePairs: number;
  pendingReviewCount: number;
  mergedCount: number;
  distinctCount: number;
  avgConfidence: number;
  highConfidenceCount: number;
  medConfidenceCount: number;
  lowConfidenceCount: number;
}

export interface DuplicateFilterParams {
  datasetId?: string;
  status?: string;
  minConfidence?: number;
  maxConfidence?: number;
  search?: string;
  limit?: number;
  offset?: number;
}
