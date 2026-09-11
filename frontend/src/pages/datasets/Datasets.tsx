import React, { useState, useEffect } from 'react';
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  Clock,
  AlertTriangle,
  Layers,
  HardDrive,
  Activity,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  fetchDatasets,
  fetchDatasetStats,
  generateSampleDataset,
  deleteDataset,
  downloadDatasetFile,
} from '../../api/datasets';
import { Dataset, DatasetStats } from '../../types/dataset';
import { DatasetUploadModal } from './DatasetUploadModal';
import { DatasetDetailDrawer } from './DatasetDetailDrawer';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [generatingSample, setGeneratingSample] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [datasetList, statsData] = await Promise.all([
        fetchDatasets({ search, status: statusFilter }),
        fetchDatasetStats(),
      ]);
      setDatasets(datasetList);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleGenerateSample = async (type: 'encounters' | 'demographics' | 'labs') => {
    try {
      setGeneratingSample(true);
      setSampleMenuOpen(false);
      const newDataset = await generateSampleDataset(type);
      setDatasets((prev) => [newDataset, ...prev]);
      if (stats) {
        setStats({
          ...stats,
          totalDatasets: stats.totalDatasets + 1,
          totalRecords: stats.totalRecords + newDataset.totalRecords,
          totalSizeBytes: stats.totalSizeBytes + newDataset.fileSize,
          readyDatasetsCount: stats.readyDatasetsCount + 1,
        });
      }
    } catch (err) {
      console.error('Failed to generate sample dataset:', err);
    } finally {
      setGeneratingSample(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this dataset from the Lakehouse?')) {
      return;
    }

    try {
      await deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      if (selectedDataset?.id === id) {
        setSelectedDataset(null);
      }
      loadData();
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const handleDownload = async (d: Dataset, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadDatasetFile(d.id, d.fileName);
    } catch (err) {
      console.error('Failed to download dataset:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getFormatBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'csv':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'json':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'parquet':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'ndjson':
      case 'jsonl':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Datasets & Raw Lakehouse
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 2 Active
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Ingest, parse, and catalog clinical datasets into MinIO S3 object storage with automated schema detection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* 1-Click Sample Dataset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
              disabled={generatingSample}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{generatingSample ? 'Generating EHR...' : 'Load Sample EHR'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {sampleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Synthetic Healthcare Benchmarks
                </div>
                <button
                  onClick={() => handleGenerateSample('encounters')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-cyan-400 transition flex items-center space-x-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Clinical Encounters (CSV)</div>
                    <div className="text-[10px] text-slate-400">250 inpatient visits & vitals</div>
                  </div>
                </button>
                <button
                  onClick={() => handleGenerateSample('demographics')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-cyan-400 transition flex items-center space-x-2"
                >
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Patient Demographics (CSV)</div>
                    <div className="text-[10px] text-slate-400">250 patients with duplicate pairs</div>
                  </div>
                </button>
                <button
                  onClick={() => handleGenerateSample('labs')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-cyan-400 transition flex items-center space-x-2"
                >
                  <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Laboratory Vitals Feed (JSON)</div>
                    <div className="text-[10px] text-slate-400">300 metabolic & lipid tests</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-sm font-semibold hover:opacity-95 shadow-lg shadow-cyan-500/20 transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Datasets
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {stats ? stats.totalDatasets : 0}
              </h3>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{stats?.readyDatasetsCount || 0}</span> Ready
            <span>•</span>
            <span className="text-amber-400 font-semibold">{stats?.processingDatasetsCount || 0}</span> Ingestion queue
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Indexed Records
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {stats ? stats.totalRecords.toLocaleString() : 0}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Rows available for OLAP & AI queries
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Lakehouse Volume
              </p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                {stats ? formatFileSize(stats.totalSizeBytes) : '0 B'}
              </h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Stored in MinIO object buckets
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ingestion Health
              </p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
                {stats && stats.totalDatasets > 0
                  ? `${Math.round((stats.readyDatasetsCount / stats.totalDatasets) * 100)}%`
                  : '100%'}
              </h3>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Automated schema inference operational
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets or filenames..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 py-2 px-3 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="READY">Ready</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 disabled:opacity-50"
            title="Refresh datasets list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden shadow-lg">
        {loading && datasets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Loading datasets catalog...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-cyan-400 border border-slate-700">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">No datasets ingested yet</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Upload your first healthcare file (CSV, JSON, Parquet) or generate an instant clinical benchmark dataset.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-sm font-semibold rounded-xl hover:opacity-95 transition"
              >
                Upload File
              </button>
              <button
                onClick={() => handleGenerateSample('encounters')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
              >
                Load Sample EHR
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold text-xs border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-6">Dataset Name</th>
                  <th className="py-3.5 px-6">Format</th>
                  <th className="py-3.5 px-6">Records & Size</th>
                  <th className="py-3.5 px-6">Schema Columns</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Ingested Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                {datasets.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDataset(d)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    {/* Name & File */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white hover:text-cyan-400 transition truncate max-w-xs">
                        {d.name}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-xs">
                        {d.fileName}
                      </div>
                    </td>

                    {/* Format Badge */}
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${getFormatBadgeColor(
                          d.fileType
                        )}`}
                      >
                        {d.fileType.toUpperCase()}
                      </span>
                    </td>

                    {/* Records & Size */}
                    <td className="py-4 px-6 font-mono text-xs">
                      <div className="font-semibold text-slate-200">
                        {d.totalRecords.toLocaleString()} rows
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {formatFileSize(d.fileSize)}
                      </div>
                    </td>

                    {/* Columns Count */}
                    <td className="py-4 px-6 text-xs">
                      <span className="font-semibold text-slate-300 font-mono">
                        {d.columnsCount} columns
                      </span>
                      {d.qualityScore > 0 && (
                        <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                          {d.qualityScore}% complete
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      {d.status === 'READY' ? (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>READY</span>
                        </div>
                      ) : d.status === 'FAILED' ? (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>FAILED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>{d.status}</span>
                        </div>
                      )}
                    </td>

                    {/* Ingested Date */}
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div
                        className="flex items-center justify-end space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedDataset(d)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                          title="Explore Schema & Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(d, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Download Raw File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Upload Modal */}
      <DatasetUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newDs) => {
          setDatasets((prev) => [newDs, ...prev]);
          loadData();
        }}
      />

      {/* Dataset Detail Drawer */}
      <DatasetDetailDrawer
        dataset={selectedDataset}
        isOpen={!!selectedDataset}
        onClose={() => setSelectedDataset(null)}
        onDelete={(id) => handleDelete(id)}
      />
    </div>
  );
};
