import api from './client';
import {
  DuplicatePair,
  DuplicateFilterParams,
  ResolveDuplicateRequest,
  BulkResolveRequest,
  DeduplicationStats,
  GoldenRecord,
  DeduplicationConfig,
} from '../types/dedupe';

export const fetchDuplicateStats = async (datasetId?: string): Promise<DeduplicationStats> => {
  const response = await api.get<DeduplicationStats>('/duplicates/stats', {
    params: datasetId ? { datasetId } : undefined,
  });
  return response.data || {
    totalCandidatePairs: 0,
    pendingReviewCount: 0,
    mergedCount: 0,
    distinctCount: 0,
    avgConfidence: 0,
    highConfidenceCount: 0,
    medConfidenceCount: 0,
    lowConfidenceCount: 0,
  };
};

export const fetchDuplicatePairs = async (
  params?: DuplicateFilterParams
): Promise<{ pairs: DuplicatePair[]; total: number; limit: number; offset: number }> => {
  const response = await api.get<{ pairs: DuplicatePair[]; total: number; limit: number; offset: number }>(
    '/duplicates',
    { params }
  );
  const rawPairs = response.data?.pairs || [];
  const sanitizedPairs = rawPairs.map((p) => ({
    ...p,
    recordAData: p.recordAData || {},
    recordBData: p.recordBData || {},
    fieldScores: p.fieldScores || [],
    goldenRecordData: p.goldenRecordData || {},
  }));
  return {
    pairs: sanitizedPairs,
    total: response.data?.total || 0,
    limit: response.data?.limit || 50,
    offset: response.data?.offset || 0,
  };
};

export const fetchDuplicatePairById = async (id: string): Promise<DuplicatePair> => {
  const response = await api.get<DuplicatePair>(`/duplicates/${id}`);
  const p = response.data;
  return {
    ...p,
    recordAData: p.recordAData || {},
    recordBData: p.recordBData || {},
    fieldScores: p.fieldScores || [],
    goldenRecordData: p.goldenRecordData || {},
  };
};

export const runDeduplicationAudit = async (
  datasetId: string,
  config?: Partial<DeduplicationConfig>
): Promise<{ message: string; total: number; pairs: DuplicatePair[]; stats: DeduplicationStats }> => {
  const response = await api.post<{ message: string; total: number; pairs: DuplicatePair[]; stats: DeduplicationStats }>(
    `/datasets/${datasetId}/deduplicate`,
    config || {}
  );
  const rawPairs = response.data?.pairs || [];
  const sanitizedPairs = rawPairs.map((p) => ({
    ...p,
    recordAData: p.recordAData || {},
    recordBData: p.recordBData || {},
    fieldScores: p.fieldScores || [],
    goldenRecordData: p.goldenRecordData || {},
  }));
  return {
    message: response.data?.message || '',
    total: response.data?.total || 0,
    pairs: sanitizedPairs,
    stats: response.data?.stats || {
      totalCandidatePairs: 0,
      pendingReviewCount: 0,
      mergedCount: 0,
      distinctCount: 0,
      avgConfidence: 0,
      highConfidenceCount: 0,
      medConfidenceCount: 0,
      lowConfidenceCount: 0,
    },
  };
};

export const resolveDuplicatePair = async (
  id: string,
  data: ResolveDuplicateRequest
): Promise<DuplicatePair> => {
  const response = await api.post<DuplicatePair>(`/duplicates/${id}/resolve`, data);
  const p = response.data;
  return {
    ...p,
    recordAData: p?.recordAData || {},
    recordBData: p?.recordBData || {},
    fieldScores: p?.fieldScores || [],
    goldenRecordData: p?.goldenRecordData || {},
  };
};

export const unresolveDuplicatePair = async (id: string): Promise<DuplicatePair> => {
  const response = await api.post<DuplicatePair>(`/duplicates/${id}/unresolve`);
  const p = response.data;
  return {
    ...p,
    recordAData: p?.recordAData || {},
    recordBData: p?.recordBData || {},
    fieldScores: p?.fieldScores || [],
    goldenRecordData: p?.goldenRecordData || {},
  };
};

export const bulkResolveDuplicates = async (
  data: BulkResolveRequest
): Promise<{ message: string; resolvedCount: number; action: string }> => {
  const response = await api.post<{ message: string; resolvedCount: number; action: string }>(
    '/duplicates/bulk-resolve',
    data
  );
  return response.data;
};

export const fetchMPIRecords = async (
  datasetId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ records: GoldenRecord[]; total: number; limit: number; offset: number }> => {
  const response = await api.get<{ records: GoldenRecord[]; total: number; limit: number; offset: number }>(
    '/duplicates/mpi',
    { params: { datasetId, limit, offset } }
  );
  const rawRecords = response.data?.records || [];
  const sanitizedRecords = rawRecords.map((r) => ({
    ...r,
    consolidatedData: r.consolidatedData || {},
    sourceRecordIds: r.sourceRecordIds || [],
    duplicatePairIds: r.duplicatePairIds || [],
  }));
  return {
    records: sanitizedRecords,
    total: response.data?.total || 0,
    limit: response.data?.limit || 50,
    offset: response.data?.offset || 0,
  };
};
