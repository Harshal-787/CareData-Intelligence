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

  const getTypeBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'INTEGER':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'FLOAT':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'TIMESTAMP':
      case 'DATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'BOOLEAN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{dataset.name}</h2>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-slate-300">{dataset.fileName}</span>
                <span>•</span>
                <span>{formatFileSize(dataset.fileSize)}</span>
                <span>•</span>
                <span className="capitalize">{dataset.fileType.toUpperCase()} format</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Export Raw'}</span>
            </button>

            <button
              onClick={() => onDelete(dataset.id)}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
              title="Delete dataset"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-400">Ingestion Status</div>
            <div className="mt-1 flex items-center space-x-1.5">
              {dataset.status === 'READY' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">READY</span>
                </>
              ) : dataset.status === 'FAILED' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold text-rose-400">FAILED</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="font-semibold text-amber-400">{dataset.status}</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-slate-400">Total Records</div>
            <div className="mt-1 font-bold text-white font-mono">
              {dataset.totalRecords.toLocaleString()} rows
            </div>
          </div>

          <div>
            <div className="text-slate-400">Inferred Columns</div>
            <div className="mt-1 font-bold text-white font-mono">
              {dataset.columnsCount} attributes
            </div>
          </div>

          <div>
            <div className="text-slate-400">Quality Completeness</div>
            <div className="mt-1 font-bold text-cyan-400 font-mono">
              {dataset.qualityScore > 0 ? `${dataset.qualityScore}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'schema'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>Inferred Schema ({dataset.schema?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'preview'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Data Preview ({dataset.preview?.length || 0} rows)</span>
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'metadata'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Lakehouse Storage</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: SCHEMA */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Automated schema inferred during file ingestion with clinical type casting.
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Column Name</th>
                      <th className="py-3 px-4">Inferred Type</th>
                      <th className="py-3 px-4">Nullable</th>
                      <th className="py-3 px-4">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                    {dataset.schema && dataset.schema.length > 0 ? (
                      dataset.schema.map((col: DatasetColumn, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-200">{col.name}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getTypeBadgeColor(
                                col.dataType
                              )}`}
                            >
                              {col.dataType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`text-[11px] font-medium ${
                                col.nullable ? 'text-amber-400' : 'text-slate-400'
                              }`}
                            >
                              {col.nullable ? 'Yes (Nulls)' : 'No (Required)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                            {col.sampleValues && col.sampleValues.length > 0 ? (
                              <div className="flex gap-1 overflow-hidden">
                                {col.sampleValues.slice(0, 3).map((v, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 truncate max-w-[100px]"
                                  >
                                    {String(v)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
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
              <div className="text-xs text-slate-400">
                Sample preview of the first {dataset.preview?.length || 0} records extracted during ingestion.
              </div>

              {dataset.preview && dataset.preview.length > 0 ? (
                <div className="border border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 font-mono">
                      <tr>
                        {Object.keys(dataset.preview[0]).map((key, kIdx) => (
                          <th key={kIdx} className="py-3 px-4 border-r border-slate-800/80 last:border-r-0">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                      {dataset.preview.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30 transition">
                          {Object.keys(dataset.preview![0]).map((key, cIdx) => (
                            <td
                              key={cIdx}
                              className="py-2.5 px-4 text-slate-300 border-r border-slate-800/40 last:border-r-0"
                            >
                              {row[key] === null || row[key] === undefined ? (
                                <span className="text-slate-600 italic">null</span>
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
                <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl">
                  No preview records available.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: METADATA */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Dataset Identifier</div>
                  <div className="text-sm font-mono text-cyan-400">{dataset.id}</div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">MIME Content-Type</div>
                  <div className="text-sm font-mono text-slate-200">{dataset.mimeType}</div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 col-span-2">
                  <div className="text-xs text-slate-400 font-medium">Lakehouse Storage Path</div>
                  <div className="text-xs font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800 mt-1">
                    {dataset.storagePath}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Ingested At</div>
                  <div className="text-xs text-slate-200">
                    {new Date(dataset.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Last Modified</div>
                  <div className="text-xs text-slate-200">
                    {new Date(dataset.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {dataset.errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                  <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Ingestion Error Diagnostic
                  </div>
                  <div>{dataset.errorMessage}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
