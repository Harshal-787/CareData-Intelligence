import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Sparkles,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Printer,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { fetchAIReports, generateAIReport } from '../../api/aiApi';
import { fetchDatasets } from '../../api/datasets';
import { AIClinicalReport } from '../../types/ai';
import { Dataset } from '../../types/dataset';
import { ClinicalMessageRenderer } from '../ai/ClinicalMessageRenderer';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<AIClinicalReport[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedReport, setSelectedReport] = useState<AIClinicalReport | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generateModalOpen, setGenerateModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Q2 Clinical Quality & Population Health Intelligence Brief');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  const loadReports = async () => {
    try {
      const data = await fetchAIReports();
      setReports(data || []);
      if (data && data.length > 0) {
        setSelectedReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const loadDatasets = async () => {
    try {
      const data = await fetchDatasets();
      setDatasets(data || []);
      if (data && data.length > 0) {
        setSelectedDatasetId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  useEffect(() => {
    loadReports();
    loadDatasets();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const report = await generateAIReport({
        title,
        datasetId: selectedDatasetId,
        sections: ['Executive Summary', 'Data Quality', 'Anomalies', 'AI Recommendations'],
      });
      setGenerateModalOpen(false);
      await loadReports();
      setSelectedReport(report);
    } catch (err) {
      console.error('Generate report failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportMarkdown = (report: AIClinicalReport) => {
    const blob = new Blob([report.markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-100 text-cyan-600 border border-cyan-200">
              Phase 8 • Executive Reporting
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Automated AI Clinical Synthesis
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Automated Clinical Reports & Intelligence Briefs
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Export comprehensive healthcare intelligence briefs synthesizing quality scorecards, anomaly findings, and Gemini AI recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate New Brief
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reports Catalog (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col h-[700px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Intelligence Briefs Catalog
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {reports.length} reports
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
              {reports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No generated briefs found. Click "Generate New Brief" to create one.
                </div>
              ) : (
                reports.map((r) => {
                  const isSelected = selectedReport?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReport(r)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-slate-50 border-cyan-300 shadow-sm shadow-cyan-500/5'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-mono text-[11px] text-cyan-600">
                          {r.datasetName || 'MIMIC-IV Synthea'}
                        </span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {r.title}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {r.executiveSummary}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-200">
                        <span>Generated by {r.generatedBy}</span>
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Report Viewer & Print Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedReport ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6">
              {/* Document Header & Actions */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-100 text-cyan-600 border border-cyan-200">
                      CONFIDENTIAL • HEALTHCARE EXECUTIVE BRIEF
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">
                    {selectedReport.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dataset: {selectedReport.datasetName} • Generated on{' '}
                    {new Date(selectedReport.createdAt).toLocaleString()} by{' '}
                    {selectedReport.generatedBy}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportMarkdown(selectedReport)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-600" /> Export MD
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm shadow-cyan-600/20 transition active:scale-[0.98]"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </button>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> 1. Executive Summary
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedReport.executiveSummary}
                </p>
              </div>

              {/* Key Findings */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> 2. Clinical & Data Quality Findings
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedReport.keyFindings?.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 text-[11px] font-bold">
                        {idx + 1}
                      </div>
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Risks & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" /> Strategic Clinical Risks
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {selectedReport.strategicRisks?.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" /> Recommended Actions
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {selectedReport.recommendedActions?.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Full Markdown Document Content Preview */}
              {selectedReport.markdownContent && (
                <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                        Executive Intelligence Briefing (Full Structured Audit)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-200/70 p-0.5 rounded-lg text-xs">
                      <button
                        onClick={() => setViewMode('rendered')}
                        className={`px-3 py-1 rounded-md font-medium transition ${
                          viewMode === 'rendered'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Formatted Brief
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-3 py-1 rounded-md font-medium transition ${
                          viewMode === 'raw'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Raw Markdown
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {viewMode === 'rendered' ? (
                      <ClinicalMessageRenderer content={selectedReport.markdownContent} />
                    ) : (
                      <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {selectedReport.markdownContent}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-400">
              Select a clinical brief from the catalog or generate a new one.
            </div>
          )}
        </div>
      </div>

      {/* Generate New Brief Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600 border border-cyan-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generate Intelligence Brief</h3>
                  <p className="text-xs text-slate-400">Synthesize dataset health into executive report</p>
                </div>
              </div>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Report Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Target Clinical Dataset
                </label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-cyan-500 transition"
                >
                  {datasets.length === 0 ? (
                    <option value="sample-clinical-encounters">
                      MIMIC-IV Synthea Hospital Encounters (Demo)
                    </option>
                  ) : (
                    datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="btn-primary"
              >
                {generating ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    Synthesizing with Gemini...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    Compile Brief
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
