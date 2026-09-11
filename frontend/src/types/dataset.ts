export type DatasetStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface DatasetColumn {
  name: string;
  dataType: 'INTEGER' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'TIMESTAMP' | string;
  nullable: boolean;
  sampleValues?: string[];
}

export interface Dataset {
  id: string;
  organizationId: string;
  uploadedBy: string;
  uploaderEmail?: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  storagePath: string;
  status: DatasetStatus;
  totalRecords: number;
  columnsCount: number;
  schema?: DatasetColumn[];
  preview?: Record<string, any>[];
  qualityScore: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetStats {
  totalDatasets: number;
  totalRecords: number;
  totalSizeBytes: number;
  readyDatasetsCount: number;
  processingDatasetsCount: number;
}
