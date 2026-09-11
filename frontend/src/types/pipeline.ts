// Phase 8: Pipeline Orchestration & Governance Types

export type PipelineStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type PipelineStageKey = 
  | 'INGESTION' 
  | 'PROFILING' 
  | 'VALIDATION' 
  | 'DEDUPLICATION' 
  | 'ML_INFERENCE' 
  | 'AI_SYNTHESIS';

export type PipelineStageStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface PipelineStage {
  key: PipelineStageKey;
  name: string;
  description: string;
  status: PipelineStageStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  durationMs: number;
  recordsProcessed: number;
  recordsPassed: number;
  recordsFlagged: number;
  summary?: string;
  error?: string;
  outputArtifacts?: Record<string, any>;
}

export interface PipelineExecutionLog {
  id: string;
  pipelineId: string;
  stageKey: PipelineStageKey;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface PipelineJob {
  id: string;
  organizationId: string;
  datasetId: string;
  datasetName: string;
  initiatedBy: string;
  initiatedByName: string;
  status: PipelineStatus;
  currentStage: PipelineStageKey;
  overallProgress: number;
  triggerType: 'MANUAL' | 'AUTOMATED_INGEST' | 'SCHEDULED' | 'RETRY';
  stages: PipelineStage[];
  totalRecords: number;
  qualityScore: number;
  duplicatesFound: number;
  anomaliesDetected: number;
  highRiskPatients: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs: number;
}

export interface PipelineStageBottleneck {
  stageKey: PipelineStageKey;
  stageName: string;
  avgDurationMs: number;
  failureRate: number;
  totalRuns: number;
}

export interface PipelineStats {
  totalRuns: number;
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number;
  avgDurationMs: number;
  totalRecordsProcessed: number;
  stageBottlenecks: PipelineStageBottleneck[];
  recentRuns: PipelineJob[];
  calculatedAt: string;
}

export interface PipelineRunRequest {
  datasetId: string;
  stages?: PipelineStageKey[];
  triggerType?: string;
  config?: Record<string, any>;
}

export interface PipelineFilterParams {
  datasetId?: string;
  status?: PipelineStatus;
  triggerType?: string;
  limit?: number;
  offset?: number;
}
