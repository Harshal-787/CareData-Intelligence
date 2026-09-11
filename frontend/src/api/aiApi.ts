import api from './client';
import {
  OllamaStatusResponse,
  AIChatRequest,
  AIChatResponse,
  AIChatSession,
  AINarrativeInsight,
  AIClinicalReport,
  AIReportRequest,
} from '../types/ai';

export const fetchOllamaStatus = async (): Promise<OllamaStatusResponse> => {
  const response = await api.get<OllamaStatusResponse>('/ai/status');
  return response.data;
};

export const selectAIModel = async (model: string): Promise<{ message: string; activeModel: string }> => {
  const response = await api.post('/ai/models/select', { model });
  return response.data;
};

export const sendAIChat = async (req: AIChatRequest): Promise<AIChatResponse> => {
  const response = await api.post<AIChatResponse>('/ai/chat', req);
  return response.data;
};

export const fetchChatHistory = async (sessionId?: string): Promise<AIChatSession> => {
  const response = await api.get<AIChatSession>('/ai/chat/history', {
    params: { sessionId },
  });
  return response.data;
};

export const fetchChatSessions = async (): Promise<AIChatSession[]> => {
  const response = await api.get<AIChatSession[]>('/ai/chat/sessions');
  return response.data;
};

export const deleteChatSession = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/ai/chat/sessions/${id}`);
  return response.data;
};

export const fetchAINarrative = async (datasetId?: string): Promise<AINarrativeInsight> => {
  const response = await api.get<AINarrativeInsight>('/ai/narrative', {
    params: { datasetId },
  });
  return response.data;
};

export const generateAIReport = async (req: AIReportRequest): Promise<AIClinicalReport> => {
  const response = await api.post<AIClinicalReport>('/ai/reports/generate', req);
  return response.data;
};

export const fetchAIReports = async (): Promise<AIClinicalReport[]> => {
  const response = await api.get<AIClinicalReport[]>('/ai/reports');
  return response.data;
};

export const fetchAIReportById = async (id: string): Promise<AIClinicalReport> => {
  const response = await api.get<AIClinicalReport>(`/ai/reports/${id}`);
  return response.data;
};
