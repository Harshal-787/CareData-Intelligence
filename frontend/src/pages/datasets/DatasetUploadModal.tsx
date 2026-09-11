import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { uploadDataset } from '../../api/datasets';
import { Dataset } from '../../types/dataset';

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDataset: Dataset) => void;
}

export const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExtensions = ['.csv', '.json', '.ndjson', '.jsonl', '.parquet'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload a supported healthcare dataset file: CSV, JSON, NDJSON, or Parquet.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File exceeds maximum upload size of 100 MB.');
      return;
    }

    setSelectedFile(file);
    if (!customName) {
      // Clean display name by stripping extension
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setCustomName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', customName.trim() || selectedFile.name);

    try {
      const dataset = await uploadDataset(formData, (progress) => {
        setUploadProgress(progress);
      });
      setUploading(false);
      onSuccess(dataset);
      handleClose();
    } catch (err: any) {
      setUploading(false);
      setError(err.response?.data?.error || err.message || 'Failed to upload dataset. Please try again.');
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    setCustomName('');
    setError(null);
    setUploadProgress(0);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ingest Raw Healthcare Dataset</h3>
              <p className="text-xs text-slate-400">Stores in MinIO Lakehouse with automatic schema inference</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".csv,.json,.ndjson,.jsonl,.parquet"
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="text-white font-medium text-sm">{selectedFile.name}</div>
                <div className="text-xs text-slate-400">
                  {formatFileSize(selectedFile.size)} • Ready for lakehouse ingestion
                </div>
                <span className="text-xs text-cyan-400 hover:underline mt-2">Click to replace file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3.5 bg-slate-800/80 text-cyan-400 rounded-full border border-slate-700 shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Drag and drop your file here, or <span className="text-cyan-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports <span className="text-slate-300 font-mono">CSV</span>, <span className="text-slate-300 font-mono">JSON</span>, <span className="text-slate-300 font-mono">NDJSON</span>, and <span className="text-slate-300 font-mono">Parquet</span> up to 100MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dataset Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dataset Name / Display Title
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Inpatient Encounters Q3 2026"
              disabled={uploading}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition disabled:opacity-50"
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting & inferring schema...
                </span>
                <span className="text-slate-300 font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-sm font-semibold hover:opacity-95 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Start Ingestion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
