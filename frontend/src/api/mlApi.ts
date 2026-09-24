import api from './client';
import {
  MLOverviewResponse,
  MLAnomaly,
  MLRiskScore,
  MLModelRun,
  MLFilterParams,
  MLTrainRequest,
  MLResolveAnomalyRequest,
} from '../types/ml';

export const fetchMLOverview = async (datasetId?: string): Promise<MLOverviewResponse> => {
  const response = await api.get<MLOverviewResponse>('/ml/overview', {
    params: { datasetId },
  });
  return response.data;
};

export const fetchMLAnomalies = async (
  params?: MLFilterParams
): Promise<{ anomalies: MLAnomaly[]; total: number; limit: number; offset: number }> => {
  const response = await api.get('/ml/anomalies', { params });
  return response.data;
};

export const fetchMLAnomalyById = async (id: string): Promise<MLAnomaly> => {
  const response = await api.get<MLAnomaly>(`/ml/anomalies/${id}`);
  return response.data;
};

export const resolveMLAnomaly = async (
  id: string,
  req: MLResolveAnomalyRequest
): Promise<{ message: string; id: string; status: string }> => {
  const response = await api.post(`/ml/anomalies/${id}/resolve`, req);
  return response.data;
};

export const fetchMLRiskScores = async (
  params?: MLFilterParams
): Promise<{ riskScores: MLRiskScore[]; total: number; limit: number; offset: number }> => {
  const response = await api.get('/ml/risk-scores', { params });
  return response.data;
};

export const fetchMLModels = async (datasetId?: string): Promise<{ models: MLModelRun[]; total: number }> => {
  const response = await api.get('/ml/models', { params: { datasetId } });
  return response.data;
};

export const triggerMLRun = async (
  datasetId: string,
  req: Partial<MLTrainRequest>
): Promise<{ message: string; modelRun: MLModelRun }> => {
  const response = await api.post(`/datasets/${datasetId}/ml/run`, req);
  return response.data;
};

export const clearMLData = async (
  datasetId: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/datasets/${datasetId}/ml/data`);
  return response.data;
};
