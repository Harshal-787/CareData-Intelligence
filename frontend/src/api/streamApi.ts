import api from './client';
import { StreamStats, StreamEvent, HL7Message } from '../types/stream';

export const streamApi = {
  getStats: async (): Promise<StreamStats> => {
    const res = await api.get('/stream/stats');
    return res.data.data;
  },

  getEvents: async (limit: number = 50): Promise<StreamEvent[]> => {
    const res = await api.get(`/stream/events?limit=${limit}`);
    return res.data.data;
  },

  ingestRawHL7: async (rawHl7: string, source?: string): Promise<HL7Message> => {
    const res = await api.post('/stream/ingest', { rawHl7, source: source || 'MANUAL_WEB_INSPECTOR' });
    return res.data.data;
  },

  simulate: async (scenario: string, count?: number): Promise<{ success: boolean; data?: HL7Message; count?: number }> => {
    const res = await api.post('/stream/simulate', { scenario, count });
    return res.data;
  },
};
