import api from './client';
import { Dataset, DatasetStats } from '../types/dataset';

export interface DatasetFilterOptions {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const fetchDatasets = async (params?: DatasetFilterOptions): Promise<Dataset[]> => {
  const response = await api.get<Dataset[]>('/datasets', { params });
  return response.data || [];
};

export const fetchDatasetStats = async (): Promise<DatasetStats> => {
  const response = await api.get<DatasetStats>('/datasets/stats');
  return response.data;
};

export const fetchDatasetById = async (id: string): Promise<Dataset> => {
  const response = await api.get<Dataset>(`/datasets/${id}`);
  return response.data;
};

export const uploadDataset = async (
  formData: FormData,
  onProgress?: (progressPercent: number) => void
): Promise<Dataset> => {
  const response = await api.post<Dataset>('/datasets/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
};

export const generateSampleDataset = async (
  type: 'encounters' | 'demographics' | 'labs'
): Promise<Dataset> => {
  const response = await api.post<Dataset>('/datasets/sample', { type });
  return response.data;
};

export const downloadDatasetFile = async (id: string, filename: string): Promise<void> => {
  const response = await api.get(`/datasets/${id}/download`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteDataset = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/datasets/${id}`);
  return response.data;
};
