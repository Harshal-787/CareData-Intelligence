export type AIChatRole = 'user' | 'assistant' | 'system';

export interface SQLQueryColumn {
  name: string;
  dataType: string;
}

export interface AIChatMessage {
  id: string;
  sessionId: string;
  role: AIChatRole;
  content: string;
  generatedSql?: string;
  columns?: SQLQueryColumn[];
  rows?: Record<string, any>[];
  rowCount?: number;
  executionTimeMs?: number;
  engine?: string;
  model?: string;
  createdAt: string;
}

export interface AIChatSession {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  datasetId?: string;
  datasetName?: string;
  activeModel: string;
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIChatRequest {
  sessionId?: string;
  datasetId?: string;
  question: string;
  model?: string;
}

export interface AIChatResponse {
  sessionId: string;
  userMessage: AIChatMessage;
  assistantMessage: AIChatMessage;
}

export interface AINarrativeInsight {
  datasetId?: string;
  datasetName: string;
  executiveSummary: string;
  keyFindings: string[];
  strategicRisks: string[];
  recommendedActions: string[];
  generatedAt: string;
}

export interface AIClinicalReport {
  id: string;
  organizationId: string;
  title: string;
  datasetId?: string;
  datasetName: string;
  executiveSummary: string;
  keyFindings: string[];
  strategicRisks: string[];
  recommendedActions: string[];
  markdownContent: string;
  generatedBy: string;
  createdAt: string;
}

export interface AIReportRequest {
  title?: string;
  datasetId?: string;
  sections?: string[];
}

export interface OllamaStatusResponse {
  connected: boolean;
  url: string;
  activeModel: string;
  availableModels: string[];
  fallbackEngine?: string;
}
