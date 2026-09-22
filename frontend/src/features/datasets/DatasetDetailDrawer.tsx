import React, { useState } from 'react';
import {
  X,
  Database,
  Columns,
  Table,
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Dataset, DatasetColumn } from '../../types/dataset';
import { downloadDatasetFile } from '../../api/datasets';
import { cn } from '../../lib/utils';

interface DatasetDetailDrawerProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const DatasetDetailDrawer: React.FC<DatasetDetailDrawerProps> = ({
  dataset,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'preview' | 'metadata'>('schema');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !dataset) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadDatasetFile(dataset.id, dataset.fileName);
    } catch (err) {
      console.error('Failed to download dataset:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getTypeBadgeTone = (type: string) => {
    switch (type.toUpperCase()) {
      case 'INTEGER':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FLOAT':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'TIMESTAMP':
      case 'DATE':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'BOOLEAN':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="grid size-10 place-items-center rounded-xl bg-cyan-100 text-cyan-600 border border-cyan-200/50 flex-shrink-0">
              <Database className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate tracking-tight">{dataset.name}</h2>
              <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500 mt-0.5">
                <span className="font-mono text-slate-600">{dataset.fileName}</span>
                <span>•</span>
                <span>{formatFileSize(dataset.fileSize)}</span>
                <span>•</span>
                <span className="uppercase">{dataset.fileType} format</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 border border-slate-200 transition shadow-sm disabled:opacity-50"
              title="Download original file"
            >
              <Download className="size-3.5" />
              <span>{downloading ? 'Downloading...' : 'Export raw'}</span>
            </button>

            <button
              onClick={() => onDelete(dataset.id)}
              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 transition shadow-sm"
              title="Delete dataset"
            >
              <Trash2 className="size-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-white border-b border-slate-200 text-xs shadow-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ingestion Status</div>
            <div className="mt-1 flex items-center space-x-1.5">
              {dataset.status === 'READY' ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span className="font-bold text-emerald-600">READY</span>
                </>
              ) : dataset.status === 'FAILED' ? (
                <>
                  <AlertTriangle className="size-3.5 text-rose-500" />
                  <span className="font-bold text-rose-600">FAILED</span>
                </>
              ) : (
                <>
                  <Clock className="size-3.5 text-amber-500 animate-spin" />
                  <span className="font-bold text-amber-600">{dataset.status}</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Records</div>
            <div className="mt-1 font-bold text-slate-700">
              {dataset.totalRecords.toLocaleString()} rows
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inferred Columns</div>
            <div className="mt-1 font-bold text-slate-700">
              {dataset.columnsCount} attributes
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quality Completeness</div>
            <div className="mt-1 font-bold text-cyan-600">
              {dataset.qualityScore > 0 ? `${dataset.qualityScore}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            onClick={() => setActiveTab('schema')}
            className={cn(
              "flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors",
              activeTab === 'schema'
                ? "border-cyan-500 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <Columns className="size-4" />
            <span>Inferred Schema ({dataset.schema?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors",
              activeTab === 'preview'
                ? "border-cyan-500 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <Table className="size-4" />
            <span>Data Preview ({dataset.preview?.length || 0} rows)</span>
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={cn(
              "flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors",
              activeTab === 'metadata'
                ? "border-cyan-500 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <HardDrive className="size-4" />
            <span>Lakehouse Storage</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {/* TAB 1: SCHEMA */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500">
                Automated schema inferred during file ingestion with clinical type casting.
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Column Name</th>
                      <th className="py-3 px-4">Inferred Type</th>
                      <th className="py-3 px-4">Nullable</th>
                      <th className="py-3 px-4">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dataset.schema && dataset.schema.length > 0 ? (
                      dataset.schema.map((col: DatasetColumn, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{col.name}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                getTypeBadgeTone(col.dataType)
                              )}
                            >
                              {col.dataType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={cn(
                                "text-[11px] font-bold",
                                col.nullable ? 'text-amber-600' : 'text-slate-500'
                              )}
                            >
                              {col.nullable ? 'Yes (Nulls)' : 'No (Required)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                            {col.sampleValues && col.sampleValues.length > 0 ? (
                              <div className="flex gap-1 overflow-hidden">
                                {col.sampleValues.slice(0, 3).map((v, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 truncate max-w-[100px] border border-slate-200"
                                  >
                                    {String(v)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                          No schema metadata available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500">
                Sample preview of the first {dataset.preview?.length || 0} records extracted during ingestion.
              </div>

              {dataset.preview && dataset.preview.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-[11px] whitespace-nowrap font-mono">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        {Object.keys(dataset.preview[0]).map((key, kIdx) => (
                          <th key={kIdx} className="py-2.5 px-4 border-r border-slate-200 last:border-r-0">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {dataset.preview.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition">
                          {Object.keys(dataset.preview![0]).map((key, cIdx) => (
                            <td
                              key={cIdx}
                              className="py-2 px-4 text-slate-600 border-r border-slate-100 last:border-r-0"
                            >
                              {row[key] === null || row[key] === undefined ? (
                                <span className="text-slate-400 italic">null</span>
                              ) : (
                                String(row[key])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl font-medium shadow-sm">
                  No preview records available.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: METADATA */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Dataset Identifier</div>
                  <div className="text-xs font-mono font-medium text-cyan-600">{dataset.id}</div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">MIME Content-Type</div>
                  <div className="text-xs font-mono font-medium text-slate-700">{dataset.mimeType}</div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 col-span-2 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Lakehouse Storage Path</div>
                  <div className="text-[11px] font-mono font-medium text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {dataset.storagePath}
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Ingested At</div>
                  <div className="text-xs font-bold text-slate-900">
                    {new Date(dataset.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Last Modified</div>
                  <div className="text-xs font-bold text-slate-900">
                    {new Date(dataset.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {dataset.errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs shadow-sm">
                  <div className="font-bold text-rose-600 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="size-4" /> Ingestion Error Diagnostic
                  </div>
                  <div className="font-medium">{dataset.errorMessage}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
