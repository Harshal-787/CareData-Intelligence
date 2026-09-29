import api from './client';
import {
  PipelineJob,
  PipelineStats,
  PipelineExecutionLog,
  PipelineFilterParams,
  PipelineRunRequest,
} from '../types/pipeline';

export const pipelineApi = {
  // List all pipeline executions
  list: async (params?: PipelineFilterParams): Promise<{ pipelines: PipelineJob[]; total: number }> => {
    const res = await api.get('/pipelines', { params });
    return res.data;
  },

  // Get a pipeline execution by ID
  getById: async (id: string): Promise<PipelineJob> => {
    const res = await api.get(`/pipelines/${id}`);
    return res.data;
  },

  // Get aggregated pipeline statistics
  getStats: async (): Promise<PipelineStats> => {
    const res = await api.get('/pipelines/stats');
    return res.data;
  },

  // Trigger a new pipeline execution run
  run: async (req: PipelineRunRequest): Promise<{ message: string; pipeline: PipelineJob }> => {
    const res = await api.post('/pipelines/run', req);
    return res.data;
  },

  // Retry an existing pipeline run
  retry: async (id: string): Promise<{ message: string; pipeline: PipelineJob }> => {
    const res = await api.post(`/pipelines/${id}/retry`);
    return res.data;
  },

  // Cancel an in-progress pipeline run
  cancel: async (id: string): Promise<{ message: string; pipeline: PipelineJob }> => {
    const res = await api.post(`/pipelines/${id}/cancel`);
    return res.data;
  },

  // Get live logs for a pipeline
  getLogs: async (id: string): Promise<{ pipelineId: string; logs: PipelineExecutionLog[]; count: number }> => {
    const res = await api.get(`/pipelines/${id}/logs`);
    return res.data;
  },

  // Delete a pipeline execution run
  delete: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/pipelines/${id}`);
    return res.data;
  },
};
