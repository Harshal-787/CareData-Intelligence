import api from './client';
import {
  AnalyticsOverviewResponse,
  AnalyticsFilterParams,
  SQLQueryRequest,
  SQLQueryResponse,
  SnowflakeStatusResponse,
  SnowflakeConfig,
  SnowflakeSyncRecord,
} from '../types/analytics';

export const fetchAnalyticsOverview = async (
  params?: AnalyticsFilterParams
): Promise<AnalyticsOverviewResponse> => {
  const response = await api.get<AnalyticsOverviewResponse>('/analytics/overview', {
    params,
  });
  return response.data;
};

export const fetchClinicalMetrics = async (
  params?: AnalyticsFilterParams
): Promise<AnalyticsOverviewResponse> => {
  const response = await api.get<AnalyticsOverviewResponse>('/analytics/clinical-metrics', {
    params,
  });
  return response.data;
};

export const executeOlapQuery = async (
  queryReq: SQLQueryRequest
): Promise<SQLQueryResponse> => {
  const response = await api.post<SQLQueryResponse>('/analytics/query', queryReq);
  return response.data;
};

export const fetchSnowflakeStatus = async (): Promise<SnowflakeStatusResponse> => {
  const response = await api.get<SnowflakeStatusResponse>('/analytics/snowflake/status');
  return response.data;
};

export const updateSnowflakeConfig = async (
  config: SnowflakeConfig
): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>('/analytics/snowflake/config', config);
  return response.data;
};

export const triggerSnowflakeSync = async (
  datasetId?: string
): Promise<SnowflakeSyncRecord> => {
  const response = await api.post<SnowflakeSyncRecord>('/analytics/snowflake/sync', {
    datasetId,
  });
  return response.data;
};
