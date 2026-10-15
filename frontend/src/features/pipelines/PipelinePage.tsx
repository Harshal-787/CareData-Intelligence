import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  RotateCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Search,
  ShieldCheck,
  Brain,
  Sparkles,
  Users,
  Layers,
  Terminal,
  Check,
  Flame,
  Trash2,
} from 'lucide-react';
import { pipelineApi } from '../../api/pipelineApi';
import { fetchDatasets } from '../../api/datasets';
import {
  PipelineJob,
  PipelineStats,
  PipelineExecutionLog,
  PipelineStageKey,
} from '../../types/pipeline';
import { Dataset } from '../../types/dataset';

export const PipelinePage: React.FC = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [pipelines, setPipelines] = useState<PipelineJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null);
  const [logs, setLogs] = useState<PipelineExecutionLog[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggerModalOpen, setTriggerModalOpen] = useState<boolean>(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stages' | 'logs' | 'bottlenecks'>('stages');

  const logTerminalRef = useRef<HTMLDivElement>(null);

  const fetchPipelinesAndStats = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        pipelineApi.getStats(),
        pipelineApi.list(),
      ]);
      setStats(statsRes);
      const pipelinesList = listRes.pipelines || [];
      setPipelines(pipelinesList);

      // Keep selected job updated
      if (selectedJob) {
        const updated = pipelinesList.find((p) => p.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
      } else if (pipelinesList.length > 0) {
        setSelectedJob(pipelinesList[0]);
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err);
    } finally {
      if (!isPoll) setLoading(false);
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
    fetchPipelinesAndStats();
    loadDatasets();
  }, []);

  // Poll when active runs exist
  useEffect(() => {
    const hasActive = pipelines.some((p) => p.status === 'RUNNING' || p.status === 'PENDING');
    if (!hasActive) return;

    const interval = setInterval(() => {
      fetchPipelinesAndStats(true);
      if (selectedJob) {
        fetchLogs(selectedJob.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pipelines, selectedJob]);

  // Fetch logs whenever selected job changes
  const fetchLogs = async (jobId: string) => {
    try {
      const res = await pipelineApi.getLogs(jobId);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      fetchLogs(selectedJob.id);
    }
  }, [selectedJob?.id]);

  // Scroll logs to bottom on update
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleTriggerRun = async () => {
    if (!selectedDatasetId) return;
    try {
      setIsSubmitting(true);
      const res = await pipelineApi.run({
        datasetId: selectedDatasetId,
        triggerType: 'MANUAL',
      });
      setTriggerModalOpen(false);
      await fetchPipelinesAndStats();
      setSelectedJob(res.pipeline);
      setActiveTab('stages');
    } catch (err) {
      console.error('Trigger pipeline failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRun = async (jobId: string) => {
    try {
      await pipelineApi.cancel(jobId);
      await fetchPipelinesAndStats();
    } catch (err) {
      console.error('Cancel run failed:', err);
    }
  };

  const handleDeleteRun = async (jobId: string) => {
    try {
      await pipelineApi.delete(jobId);
      await fetchPipelinesAndStats();
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
    } catch (err) {
      console.error('Delete run failed:', err);
    }
  };

  const handleRetryRun = async (jobId: string) => {
    try {
      const res = await pipelineApi.retry(jobId);
      await fetchPipelinesAndStats();
      setSelectedJob(res.pipeline);
      setActiveTab('stages');
    } catch (err) {
      console.error('Retry run failed:', err);
    }
  };

  const getStageIcon = (key: PipelineStageKey) => {
    switch (key) {
      case 'INGESTION':
        return <Database className="w-5 h-5 text-cyan-600" />;
      case 'PROFILING':
        return <Search className="w-5 h-5 text-blue-600" />;
      case 'VALIDATION':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'DEDUPLICATION':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'ML_INFERENCE':
        return <Brain className="w-5 h-5 text-purple-600" />;
      case 'AI_SYNTHESIS':
        return <Sparkles className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-600 border border-cyan-200 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-600 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-600 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const filteredPipelines = pipelines.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
  });

  const filteredLogs = logs.filter((l) => {
    if (logLevelFilter !== 'ALL' && l.level !== logLevelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-100 text-cyan-600 border border-cyan-200">
              Phase 8 • Production Engine
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">

            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Pipeline Orchestration & Monitoring
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time execution monitoring, automated stage progression, and fault-tolerant orchestration across all 6 intelligence stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPipelinesAndStats()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200 transition"
          >
            <RotateCw className="w-4 h-4 text-slate-400" />
            Refresh
          </button>
          <button
            onClick={() => setTriggerModalOpen(true)}
            className="btn-primary"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Trigger Pipeline Run
          </button>
        </div>
      </div>

      {/* Metric Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 relative overflow-hidden group hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Executions</span>
            <Layers className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats?.totalRuns ?? pipelines.length}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-cyan-600 font-medium">{stats?.activeRuns ?? 0} active</span> currently running
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 relative overflow-hidden group hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats ? `${stats.successRate.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="text-emerald-600 font-medium">{stats?.completedRuns ?? 0}</span> successful completions
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 relative overflow-hidden group hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Average Duration</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '38.5s'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across 6 parallel/async stages</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 relative overflow-hidden group hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Records Processed</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats ? stats.totalRecordsProcessed.toLocaleString() : '21,370'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Ingested to Parquet Lake</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 relative overflow-hidden group hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Failed / Retried</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats?.failedRuns ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">0 unrecoverable deadlocks</div>
        </div>
      </div>

      {/* Main Execution View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pipeline Runs Catalog (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col h-[680px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                Pipeline Execution History
              </h2>
              <div className="flex items-center gap-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RUNNING">Running</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto text-cyan-600 mb-2" />
                  Loading pipeline executions...
                </div>
              ) : filteredPipelines.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No pipeline execution runs found.
                </div>
              ) : (
                filteredPipelines.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition relative ${
                        isSelected
                          ? 'bg-slate-50 border-cyan-300 shadow-sm shadow-cyan-500/5'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-semibold text-cyan-600">
                          {job.id}
                        </span>
                        {getStatusBadge(job.status)}
                      </div>

                      <div className="text-sm font-medium text-slate-700 truncate">
                        {job.datasetName}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                        <span>{job.totalRecords?.toLocaleString()} records</span>
                        <span>{job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : 'in progress'}</span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-slate-50 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-400'
                              : job.status === 'FAILED'
                              ? 'bg-rose-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${job.overallProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>{job.triggerType}</span>
                        <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Pipeline Detail & Stage Flow (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedJob ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-5">
              {/* Header Details */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-cyan-600">
                      {selectedJob.id}
                    </span>
                    {getStatusBadge(selectedJob.status)}
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-600">
                      {selectedJob.triggerType}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedJob.datasetName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Initiated by {selectedJob.initiatedByName} • Started{' '}
                    {new Date(selectedJob.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedJob.status === 'RUNNING' && (
                    <button
                      onClick={() => handleCancelRun(selectedJob.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-500/20 text-rose-600 text-xs font-semibold border border-rose-200 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel Execution
                    </button>
                  )}
                  {selectedJob.status !== 'RUNNING' && (
                    <>
                      <button
                        onClick={() => handleRetryRun(selectedJob.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-cyan-600" /> Re-run Pipeline
                      </button>
                      <button
                        onClick={() => handleDeleteRun(selectedJob.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold border border-rose-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <button
                  onClick={() => setActiveTab('stages')}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-1 ${
                    activeTab === 'stages'
                      ? 'border-cyan-400 text-cyan-600 bg-cyan-100'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  6-Stage Execution Stepper ({selectedJob.stages.length})
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-1 ${
                    activeTab === 'logs'
                      ? 'border-cyan-400 text-cyan-600 bg-cyan-100'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Execution Logs ({logs.length})
                </button>
                <button
                  onClick={() => setActiveTab('bottlenecks')}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-1 ${
                    activeTab === 'bottlenecks'
                      ? 'border-cyan-400 text-cyan-600 bg-cyan-100'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  Stage Bottlenecks & Latency
                </button>
              </div>

              {/* Tab 1: 6-Stage Stepper View */}
              {activeTab === 'stages' && (
                <div className="space-y-4">
                  {/* Overall Progress Banner */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-400">
                        Overall Pipeline Progress
                      </div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{selectedJob.overallProgress}% Complete</span>
                        {selectedJob.durationMs > 0 && (
                          <span className="text-xs text-slate-400 font-normal">
                            (Elapsed: {(selectedJob.durationMs / 1000).toFixed(1)}s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-48 bg-slate-50 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${selectedJob.overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* 6 Stage Cards Stepper Flow */}
                  <div className="space-y-3">
                    {selectedJob.stages.map((stage, idx) => {
                      const isRunning = stage.status === 'RUNNING';
                      const isCompleted = stage.status === 'COMPLETED';
                      const isFailed = stage.status === 'FAILED';

                      return (
                        <div
                          key={stage.key}
                          className={`p-4 rounded-2xl border transition ${
                            isRunning
                              ? 'bg-white border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                              : isCompleted
                              ? 'bg-white border-slate-200'
                              : isFailed
                              ? 'bg-rose-950/20 border-rose-200'
                              : 'bg-slate-50 border-slate-200 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                                  isCompleted
                                    ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                                    : isRunning
                                    ? 'bg-cyan-100 border-cyan-500/40 text-cyan-600 animate-pulse'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  getStageIcon(stage.key)
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-slate-400">
                                    Stage {idx + 1}/6
                                  </span>
                                  <h3 className="text-sm font-bold text-slate-900">
                                    {stage.name}
                                  </h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {stage.description}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {getStatusBadge(stage.status)}
                              {stage.durationMs > 0 && (
                                <div className="text-xs text-slate-400 font-mono mt-1">
                                  {(stage.durationMs / 1000).toFixed(1)}s
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stage summary text */}
                          {stage.summary && (
                            <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                              <span>{stage.summary}</span>
                              {stage.recordsFlagged > 0 && (
                                <span className="text-amber-600 font-medium ml-2">
                                  {stage.recordsFlagged} flagged
                                </span>
                              )}
                            </div>
                          )}

                          {/* Progress bar if running */}
                          {isRunning && (
                            <div className="w-full bg-slate-50 rounded-full h-1.5 mt-3 overflow-hidden">
                              <div
                                className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300 animate-pulse"
                                style={{ width: `${stage.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Live Execution Log Terminal */}
              {activeTab === 'logs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Filter Level:</span>
                      {['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setLogLevelFilter(lvl)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                            logLevelFilter === lvl
                              ? 'bg-cyan-100 text-cyan-600 border border-cyan-200'
                              : 'bg-slate-50 text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {filteredLogs.length} entries
                    </span>
                  </div>

                  <div
                    ref={logTerminalRef}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 h-[450px] overflow-y-auto space-y-2 shadow-inner"
                  >
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-600">
                        No logs recorded for this filter.
                      </div>
                    ) : (
                      filteredLogs.map((log) => {
                        let levelColor = 'text-cyan-600';
                        if (log.level === 'SUCCESS') levelColor = 'text-emerald-600 font-semibold';
                        if (log.level === 'WARN') levelColor = 'text-amber-600';
                        if (log.level === 'ERROR') levelColor = 'text-rose-600 font-semibold';

                        return (
                          <div key={log.id} className="flex items-start gap-2 hover:bg-white p-1 rounded">
                            <span className="text-slate-400 text-[11px] shrink-0">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${levelColor} bg-white border border-slate-200`}>
                              {log.level}
                            </span>
                            <span className="text-slate-400 shrink-0">
                              [{log.stageKey}]
                            </span>
                            <span className="text-slate-700 break-all">{log.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Bottlenecks & Latency View */}
              {activeTab === 'bottlenecks' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-600" />
                      Stage Execution Latencies & Profiling
                    </h3>
                    <p className="text-xs text-slate-400">
                      Average stage completion time across all pipeline executions. Use this breakdown to optimize DuckDB query indexes and ML batch sizes.
                    </p>

                    <div className="space-y-3 pt-2">
                      {stats?.stageBottlenecks?.map((b) => {
                        const maxMs = 12000;
                        const pct = Math.min(100, (b.avgDurationMs / maxMs) * 100);

                        return (
                          <div key={b.stageKey} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 flex items-center gap-2">
                                {getStageIcon(b.stageKey)}
                                {b.stageName}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-cyan-600 font-bold">
                                  {(b.avgDurationMs / 1000).toFixed(2)}s
                                </span>
                                <span className="text-slate-400">
                                  ({b.totalRuns} runs)
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-400">
              Select a pipeline execution to view detailed stages and logs.
            </div>
          )}
        </div>
      </div>

      {/* Trigger Pipeline Modal */}
      {triggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600 border border-cyan-200">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Trigger Pipeline Run</h3>
                  <p className="text-xs text-slate-400">Launch 6-stage clinical intelligence workflow</p>
                </div>
              </div>
              <button
                onClick={() => setTriggerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Select Healthcare Dataset
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
                        {d.name} ({d.totalRecords?.toLocaleString()} rows)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-600">
                  Stages to be Executed in Sequence:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> 1. Parquet Ingestion
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> 2. DuckDB Profiler
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> 3. Healthcare Rules
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> 4. RapidFuzz Dedupe
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> 5. ML Anomaly & Risk
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> 6. Gemini AI Synthesis
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTriggerModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerRun}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Execution Run
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
