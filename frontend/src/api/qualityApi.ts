import api from './client';
import {
  QualityOverview,
  QualityReport,
  QualityViolation,
  ValidationRule,
  CreateValidationRuleRequest,
  UpdateValidationRuleRequest,
} from '../types/quality';

export const fetchQualityOverview = async (): Promise<QualityOverview> => {
  const response = await api.get<QualityOverview>('/quality/overview');
  return response.data;
};

export const fetchQualityReport = async (datasetId: string): Promise<QualityReport> => {
  const response = await api.get<QualityReport>(`/datasets/${datasetId}/quality-report`);
  return response.data;
};

export const runQualityAudit = async (datasetId: string): Promise<QualityReport> => {
  const response = await api.post<QualityReport>(`/datasets/${datasetId}/audit`);
  return response.data;
};

export const fetchViolations = async (
  datasetId: string,
  params?: { severity?: string; limit?: number; offset?: number }
): Promise<{ violations: QualityViolation[]; total: number; limit: number; offset: number }> => {
  const response = await api.get<{ violations: QualityViolation[]; total: number; limit: number; offset: number }>(
    `/datasets/${datasetId}/violations`,
    { params }
  );
  return response.data;
};

export const fetchRules = async (datasetId: string): Promise<ValidationRule[]> => {
  const response = await api.get<ValidationRule[]>(`/datasets/${datasetId}/rules`);
  return response.data;
};

export const createValidationRule = async (
  datasetId: string,
  ruleData: CreateValidationRuleRequest
): Promise<ValidationRule> => {
  const response = await api.post<ValidationRule>(`/datasets/${datasetId}/rules`, ruleData);
  return response.data;
};

export const updateValidationRule = async (
  datasetId: string,
  ruleId: string,
  ruleData: UpdateValidationRuleRequest
): Promise<ValidationRule> => {
  const response = await api.put<ValidationRule>(`/datasets/${datasetId}/rules/${ruleId}`, ruleData);
  return response.data;
};

export const deleteValidationRule = async (
  datasetId: string,
  ruleId: string
): Promise<void> => {
  await api.delete(`/datasets/${datasetId}/rules/${ruleId}`);
};

export const resetDefaultRules = async (datasetId: string): Promise<ValidationRule[]> => {
  const response = await api.post<ValidationRule[]>(`/datasets/${datasetId}/rules/reset`);
  return response.data;
};
