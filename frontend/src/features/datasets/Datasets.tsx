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
import { cn } from '../../lib/utils';

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

  const getFormatBadgeTone = (type: string) => {
    switch (type.toLowerCase()) {
      case 'csv':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'json':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'parquet':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'ndjson':
      case 'jsonl':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-cyan-600">
            Phase 2 Active
          </p>
          <h1 className="text-[30px] font-bold tracking-[-.045em] text-slate-950 sm:text-[36px]">
            Datasets & Raw Lakehouse
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Ingest, parse, and catalog clinical datasets into object storage with automated schema detection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* 1-Click Sample Dataset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
              disabled={generatingSample}
              className="flex items-center space-x-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm border border-slate-200/80 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Sparkles className="size-3.5 text-cyan-500" />
              <span>{generatingSample ? 'Generating EHR...' : 'Load sample EHR'}</span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>

            {sampleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/80 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-20 py-2 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Synthetic Benchmarks
                </div>
                <button
                  onClick={() => handleGenerateSample('encounters')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-cyan-600 transition flex items-center space-x-2"
                >
                  <FileSpreadsheet className="size-4 text-cyan-500 shrink-0" />
                  <div>
                    <div className="font-bold">Clinical Encounters (CSV)</div>
                    <div className="text-[10px] text-slate-400 font-medium">250 inpatient visits & vitals</div>
                  </div>
                </button>
                <button
                  onClick={() => handleGenerateSample('demographics')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-cyan-600 transition flex items-center space-x-2"
                >
                  <Activity className="size-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold">Patient Demographics (CSV)</div>
                    <div className="text-[10px] text-slate-400 font-medium">250 patients with duplicate pairs</div>
                  </div>
                </button>
                <button
                  onClick={() => handleGenerateSample('labs')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-cyan-600 transition flex items-center space-x-2"
                >
                  <Database className="size-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold">Laboratory Vitals Feed (JSON)</div>
                    <div className="text-[10px] text-slate-400 font-medium">300 metabolic & lipid tests</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:from-cyan-600 hover:to-blue-600"
          >
            <UploadCloud className="size-3.5" />
            <span>Upload dataset</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Datasets
            </p>
            <div className="grid size-9 place-items-center rounded-xl bg-cyan-100 text-cyan-600">
              <Layers className="size-4" />
            </div>
          </div>
          <h3 className="mt-4 text-[25px] font-bold tracking-[-.04em] text-slate-900">
            {stats ? stats.totalDatasets : 0}
          </h3>
          <div className="mt-1 flex items-center space-x-2 text-[10px] font-semibold text-slate-400">
            <span className="text-emerald-500">{stats?.readyDatasetsCount || 0} Ready</span>
            <span>•</span>
            <span className="text-amber-500">{stats?.processingDatasetsCount || 0} Ingestion queue</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Indexed Records
            </p>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <Database className="size-4" />
            </div>
          </div>
          <h3 className="mt-4 text-[25px] font-bold tracking-[-.04em] text-slate-900">
            {stats ? stats.totalRecords.toLocaleString() : 0}
          </h3>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            Rows available for OLAP & AI queries
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Lakehouse Volume
            </p>
            <div className="grid size-9 place-items-center rounded-xl bg-purple-100 text-purple-600">
              <HardDrive className="size-4" />
            </div>
          </div>
          <h3 className="mt-4 text-[25px] font-bold tracking-[-.04em] text-slate-900">
            {stats ? formatFileSize(stats.totalSizeBytes) : '0 B'}
          </h3>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            Stored in MinIO object buckets
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Ingestion Health
            </p>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-600">
              <Activity className="size-4" />
            </div>
          </div>
          <h3 className="mt-4 text-[25px] font-bold tracking-[-.04em] text-cyan-600">
            {stats && stats.totalDatasets > 0
              ? `${Math.round((stats.readyDatasetsCount / stats.totalDatasets) * 100)}%`
              : '100%'}
          </h3>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            Automated schema inference operational
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets or filenames..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 relative">
            <Filter className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            >
              <option value="">All statuses</option>
              <option value="READY">Ready</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition disabled:opacity-50"
            title="Refresh datasets list"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        {loading && datasets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs font-semibold text-slate-500">Loading datasets catalog...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100">
              <Database className="size-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No datasets ingested yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                Upload your first healthcare file (CSV, JSON, Parquet) or generate an instant clinical benchmark dataset.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-200 transition hover:-translate-y-0.5"
              >
                Upload file
              </button>
              <button
                onClick={() => handleGenerateSample('encounters')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Load sample EHR
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Dataset Name</th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">Records & Size</th>
                  <th className="px-6 py-4">Schema Columns</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Ingested Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {datasets.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDataset(d)}
                    className="group cursor-pointer transition hover:bg-slate-50/80"
                  >
                    {/* Name & File */}
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                        {d.name}
                      </div>
                      <div className="mt-0.5 max-w-xs truncate text-[11px] font-medium text-slate-500">
                        {d.fileName}
                      </div>
                    </td>

                    {/* Format Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", getFormatBadgeTone(d.fileType))}
                      >
                        {d.fileType}
                      </span>
                    </td>

                    {/* Records & Size */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">
                        {d.totalRecords.toLocaleString()} <span className="font-medium text-slate-400">rows</span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {formatFileSize(d.fileSize)}
                      </div>
                    </td>

                    {/* Columns Count */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">
                        {d.columnsCount} <span className="font-medium text-slate-400">cols</span>
                      </div>
                      {d.qualityScore > 0 && (
                        <div className="mt-0.5 text-[10px] font-bold text-cyan-600">
                          {d.qualityScore}% complete
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {d.status === 'READY' ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>READY</span>
                        </div>
                      ) : d.status === 'FAILED' ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                          <AlertTriangle className="size-3" />
                          <span>FAILED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                          <Clock className="size-3 animate-spin" />
                          <span>{d.status}</span>
                        </div>
                      )}
                    </td>

                    {/* Ingested Date */}
                    <td className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedDataset(d)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-cyan-600 hover:shadow-sm"
                          title="Explore schema & preview"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(d, e)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
                          title="Download raw file"
                        >
                          <Download className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm"
                          title="Delete dataset"
                        >
                          <Trash2 className="size-4" />
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
