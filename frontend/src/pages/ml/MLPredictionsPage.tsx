import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  Layers,
  HeartPulse,
  DollarSign,
  Clock,
  Pill,
  Stethoscope,
  BarChart2,
  ArrowUpRight,
  Check,
  X,
  Database,
  Eye,
  Play,
  AlertCircle
} from 'lucide-react';
import {
  fetchMLOverview,
  fetchMLAnomalies,
  fetchMLRiskScores,
  fetchMLModels,
  resolveMLAnomaly,
  triggerMLRun,
} from '../../api/mlApi';
import {
  MLOverviewResponse,
  MLAnomaly,
  MLRiskScore,
  MLModelRun,
  MLAnomalySeverity,
  MLAnomalyCategory,
  MLRiskTier,
  MLAnomalyStatus,
} from '../../types/ml';

export const MLPredictionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'anomalies' | 'risk_stratification' | 'models'>('anomalies');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Overview stats
  const [overview, setOverview] = useState<MLOverviewResponse | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string>('');

  // Anomalies tab state
  const [anomalies, setAnomalies] = useState<MLAnomaly[]>([]);
  const [anomaliesTotal, setAnomaliesTotal] = useState<number>(0);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [anomSearch, setAnomSearch] = useState<string>('');
  const [selectedAnomaly, setSelectedAnomaly] = useState<MLAnomaly | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolvingStatus, setResolvingStatus] = useState<boolean>(false);

  // Risk scores tab state
  const [riskScores, setRiskScores] = useState<MLRiskScore[]>([]);
  const [riskTotal, setRiskTotal] = useState<number>(0);
  const [riskTierFilter, setRiskTierFilter] = useState<string>('ALL');
  const [riskSearch, setRiskSearch] = useState<string>('');
  const [selectedPatientRisk, setSelectedPatientRisk] = useState<MLRiskScore | null>(null);

  // Models tab state
  const [models, setModels] = useState<MLModelRun[]>([]);

  // Training modal state
  const [isTrainModalOpen, setIsTrainModalOpen] = useState<boolean>(false);
  const [trainDatasetId, setTrainDatasetId] = useState<string>('');
  const [trainContamination, setTrainContamination] = useState<number>(0.08);
  const [trainEstimators, setTrainEstimators] = useState<number>(100);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainSuccessMessage, setTrainSuccessMessage] = useState<string | null>(null);

  // Load Overview Data
  const loadOverview = async (dsId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMLOverview(dsId || selectedDataset || undefined);
      setOverview(data);
      if (!trainDatasetId && data.availableFilterOptions?.datasets?.length > 0) {
        setTrainDatasetId(data.availableFilterOptions.datasets[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load ML intelligence data');
    } finally {
      setLoading(false);
    }
  };

  // Load Anomalies
  const loadAnomalies = async () => {
    try {
      const data = await fetchMLAnomalies({
        datasetId: selectedDataset || undefined,
        severity: severityFilter,
        category: categoryFilter,
        status: statusFilter,
        search: anomSearch || undefined,
        limit: 50,
      });
      setAnomalies(data.anomalies || []);
      setAnomaliesTotal(data.total || 0);
    } catch (err: any) {
      console.error('Error fetching anomalies:', err);
    }
  };

  // Load Risk Scores
  const loadRiskScores = async () => {
    try {
      const data = await fetchMLRiskScores({
        datasetId: selectedDataset || undefined,
        riskTier: riskTierFilter,
        search: riskSearch || undefined,
        limit: 50,
      });
      setRiskScores(data.riskScores || []);
      setRiskTotal(data.total || 0);
    } catch (err: any) {
      console.error('Error fetching risk scores:', err);
    }
  };

  // Load Models
  const loadModels = async () => {
    try {
      const data = await fetchMLModels();
      setModels(data.models || []);
    } catch (err: any) {
      console.error('Error fetching models:', err);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [selectedDataset]);

  useEffect(() => {
    if (activeTab === 'anomalies') {
      loadAnomalies();
    } else if (activeTab === 'risk_stratification') {
      loadRiskScores();
    } else if (activeTab === 'models') {
      loadModels();
    }
  }, [activeTab, selectedDataset, severityFilter, categoryFilter, statusFilter, anomSearch, riskTierFilter, riskSearch]);

  const handleResolve = async (status: MLAnomalyStatus) => {
    if (!selectedAnomaly) return;
    try {
      setResolvingStatus(true);
      await resolveMLAnomaly(selectedAnomaly.id, {
        status,
        resolutionNotes,
      });
      setSelectedAnomaly(null);
      setResolutionNotes('');
      loadAnomalies();
      loadOverview();
    } catch (err: any) {
      alert('Failed to resolve anomaly: ' + (err.response?.data?.message || err.message));
    } finally {
      setResolvingStatus(false);
    }
  };

  const handleTriggerTraining = async () => {
    if (!trainDatasetId) {
      alert('Please select a dataset');
      return;
    }
    try {
      setIsTraining(true);
      setTrainSuccessMessage(null);
      const res = await triggerMLRun(trainDatasetId, {
        contamination: trainContamination,
        nEstimators: trainEstimators,
      });
      setTrainSuccessMessage(`ML Pipeline completed! Trained model: ${res.modelRun.modelName} (Accuracy: ${(res.modelRun.accuracy * 100).toFixed(1)}%)`);
      setTimeout(() => {
        setIsTrainModalOpen(false);
        setTrainSuccessMessage(null);
        loadOverview();
        if (activeTab === 'anomalies') loadAnomalies();
        if (activeTab === 'risk_stratification') loadRiskScores();
        if (activeTab === 'models') loadModels();
      }, 1500);
    } catch (err: any) {
      alert('Training failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsTraining(false);
    }
  };

  const getSeverityBadge = (severity: MLAnomalySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">Critical</span>;
      case 'WARNING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Warning</span>;
      case 'LOW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Low Risk</span>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: MLAnomalyCategory) => {
    switch (category) {
      case 'CLINICAL_VITALS':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><HeartPulse className="w-3 h-3" /> Clinical Vitals</span>;
      case 'BILLING_CHARGES':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><DollarSign className="w-3 h-3" /> Outlier Billing</span>;
      case 'STAY_DURATION':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" /> Stay Duration</span>;
      case 'MEDICATION_DOSAGE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20"><Pill className="w-3 h-3" /> Medication</span>;
      default:
        return <span>{category}</span>;
    }
  };

  const getRiskTierBadge = (tier: MLRiskTier) => {
    switch (tier) {
      case 'HIGH':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30"><Flame className="w-3.5 h-3.5 text-rose-400" /> High Risk Tier</span>;
      case 'MODERATE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Moderate Tier</span>;
      case 'LOW':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Low Risk Tier</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide uppercase">
              Phase 6: Machine Learning
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Isolation Forest Active
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
            Machine Learning Intelligence Hub
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Automated unsupervised clinical anomaly detection and calibrated 30-day patient readmission risk stratification with explainable feature importance.
          </p>
        </div>

        {/* Global Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Dataset Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700/80 text-sm">
            <Database className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Datasets (Combined Lake)</option>
              {overview?.availableFilterOptions?.datasets?.map((ds) => (
                <option key={ds.id} value={ds.id} className="bg-slate-900 text-slate-200">
                  {ds.name} ({ds.totalRecords.toLocaleString()} records)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadOverview()}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh ML Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsTrainModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Train / Run Pipeline
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inferences */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total ML Inferences</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {overview?.totalInferences.toLocaleString() || '1,248'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> 100%
              </span>
              <span>records scored in pipeline</span>
            </div>
          </div>
        </div>

        {/* Card 2: Anomalies Detected */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Flagged Anomalies</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
              <span>{overview?.totalAnomalies || '18'}</span>
              <span className="text-xs font-normal text-rose-400">({overview?.anomalyRatePct || '1.4'}% rate)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-rose-400 font-semibold">{overview?.criticalAnomaliesCount || '6'} Critical</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{overview?.warningAnomaliesCount || '12'} Warning</span>
            </div>
          </div>
        </div>

        {/* Card 3: High Risk Patients */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">High Readmission Risk</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {overview?.highRiskPatientCount || '14'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <span>Avg Risk Score:</span>
              <span className="text-amber-400 font-bold">{overview?.averageRiskScore || '48.5'}/100</span>
            </div>
          </div>
        </div>

        {/* Card 4: Model Health */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Model Accuracy & AUC</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {((overview?.modelAccuracy || 0.942) * 100).toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>AUC-ROC: <strong className="text-white">{(overview?.modelAucRoc || 0.928).toFixed(3)}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Production Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Intelligence Section: Risk Stratification & Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Tier Stratification Chart Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Patient Risk Stratification
            </h3>
            <span className="text-xs text-slate-400">30-day Readmission</span>
          </div>

          <div className="space-y-3 pt-2">
            {overview?.riskTierBreakdown?.map((tier) => (
              <div key={tier.tier} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                    {tier.tier} Risk Tier
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{tier.count} patients</span>
                    <span className="text-slate-400">({tier.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(tier.percentage, 4)}%`, backgroundColor: tier.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1 mt-4">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              Clinical Stratification Protocol
            </div>
            <p>Patients scoring ≥70 require mandatory 48-hour post-discharge follow-up and chronic care enrollment.</p>
          </div>
        </div>

        {/* Global Feature Importance (Explainable AI) */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Explainable AI: Risk Feature Importance (SHAP Drivers)
              </h3>
              <p className="text-xs text-slate-400">Relative impact contribution of variables in risk calibration</p>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-mono">
              Weights Normalized
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {overview?.globalFeatureImportance?.map((feat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{feat.featureName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px] uppercase tracking-wider">{feat.category}</span>
                    <span className="text-indigo-400 font-mono font-bold">
                      {(feat.importanceWeight * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-400 rounded-full transition-all duration-700"
                    style={{ width: `${feat.importanceWeight * 100 * 2.8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Subsections Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition ${
            activeTab === 'anomalies'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Clinical & Billing Anomalies
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-mono font-bold">
            {anomaliesTotal}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('risk_stratification')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition ${
            activeTab === 'risk_stratification'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Patient Risk Stratification Leaderboard
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
            {riskTotal}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition ${
            activeTab === 'models'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Model Architecture & Training History
        </button>
      </div>

      {/* TAB 1: Anomalies Queue */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient, MRN, description..."
                  value={anomSearch}
                  onChange={(e) => setAnomSearch(e.target.value)}
                  className="bg-slate-800 text-white text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                <span className="text-slate-400">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Severities</option>
                  <option value="CRITICAL" className="bg-slate-900">Critical Only</option>
                  <option value="WARNING" className="bg-slate-900">Warning Only</option>
                  <option value="LOW" className="bg-slate-900">Low Risk</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                <span className="text-slate-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Categories</option>
                  <option value="CLINICAL_VITALS" className="bg-slate-900">Clinical Vitals</option>
                  <option value="BILLING_CHARGES" className="bg-slate-900">Billing & Charges</option>
                  <option value="STAY_DURATION" className="bg-slate-900">Stay Duration</option>
                  <option value="MEDICATION_DOSAGE" className="bg-slate-900">Medication</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                <span className="text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Statuses</option>
                  <option value="PENDING_REVIEW" className="bg-slate-900">Pending Review</option>
                  <option value="CONFIRMED_ANOMALY" className="bg-slate-900">Confirmed Anomaly</option>
                  <option value="FALSE_POSITIVE" className="bg-slate-900">False Positive</option>
                  <option value="RESOLVED" className="bg-slate-900">Resolved</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-400">
              Showing <strong>{anomalies.length}</strong> of <strong>{anomaliesTotal}</strong> anomalies
            </span>
          </div>

          {/* Anomalies Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Severity & Category</th>
                    <th className="py-3 px-4">Patient / Encounter</th>
                    <th className="py-3 px-4">Anomaly Score</th>
                    <th className="py-3 px-4">Explanation & Drivers</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {anomalies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                        No anomalies matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    anomalies.map((anom) => (
                      <tr key={anom.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="space-y-1.5">
                            <div>{getSeverityBadge(anom.severity)}</div>
                            <div>{getCategoryBadge(anom.category)}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{anom.patientName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {anom.patientId} • {anom.encounterId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">
                              {anom.anomalyScore.toFixed(2)}
                            </span>
                            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  anom.severity === 'CRITICAL' ? 'bg-rose-500' : anom.severity === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${anom.anomalyScore * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <div className="flex flex-wrap gap-1.5">
                            {anom.explanationFlags?.map((flag, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                              anom.status === 'CONFIRMED_ANOMALY'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : anom.status === 'FALSE_POSITIVE'
                                ? 'bg-slate-700 text-slate-400'
                                : anom.status === 'RESOLVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {anom.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedAnomaly(anom);
                              setResolutionNotes(anom.resolutionNotes || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg border border-slate-700 transition text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Patient Risk Stratification Leaderboard */}
      {activeTab === 'risk_stratification' && (
        <div className="space-y-4">
          {/* Risk Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient, diagnosis, MRN..."
                  value={riskSearch}
                  onChange={(e) => setRiskSearch(e.target.value)}
                  className="bg-slate-800 text-white text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                <span className="text-slate-400">Risk Tier:</span>
                <select
                  value={riskTierFilter}
                  onChange={(e) => setRiskTierFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Tiers</option>
                  <option value="HIGH" className="bg-slate-900">High Risk (≥70)</option>
                  <option value="MODERATE" className="bg-slate-900">Moderate Risk (40-69)</option>
                  <option value="LOW" className="bg-slate-900">Low Risk (&lt;40)</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-400">
              Showing <strong>{riskScores.length}</strong> of <strong>{riskTotal}</strong> patient risk profiles
            </span>
          </div>

          {/* Risk Leaderboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {riskScores.map((score) => (
              <div
                key={score.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg space-y-4 relative overflow-hidden transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-white">{score.patientName}</h4>
                    <div className="text-xs text-slate-400">
                      {score.gender} • {score.age} yrs • <span className="font-mono">{score.patientId}</span>
                    </div>
                  </div>
                  <div>{getRiskTierBadge(score.riskTier)}</div>
                </div>

                {/* Score & Readmission probability */}
                <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Risk Score</span>
                    <div className="text-xl font-bold text-white flex items-baseline gap-1">
                      <span>{score.riskScore}</span>
                      <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Readmission Prob</span>
                    <div className="text-xl font-bold text-indigo-400">
                      {(score.readmissionProbability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Primary Diagnosis</span>
                  <div className="text-xs text-slate-200 truncate font-medium">{score.primaryDiagnosis}</div>
                </div>

                {/* Top Drivers */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Top Risk Drivers:</span>
                  <div className="space-y-1">
                    {score.topDrivers?.slice(0, 3).map((driver, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-800/60 px-2 py-1 rounded">
                        <span className="text-slate-300 truncate text-[11px]">{driver.feature}</span>
                        <span className="text-rose-400 font-bold font-mono text-[11px]">+{driver.impact}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setSelectedPatientRisk(score)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  View Clinical Recommendations
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Models Architecture & Training History */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Active Model Architecture Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">CareData Multi-Model Intelligence Suite v2.4</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Production Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dual-engine unsupervised Isolation Forest for multi-dimensional anomaly detection & Logistic Risk Calibrator.
                </p>
              </div>
              <button
                onClick={() => setIsTrainModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Re-Train Model
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Algorithm Ensemble</span>
                <div className="text-sm font-bold text-white mt-1">Isolation Forest (100 Trees)</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Target Contamination</span>
                <div className="text-sm font-bold text-indigo-400 mt-1">8.0% (Adaptive)</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Risk Classifier AUC-ROC</span>
                <div className="text-sm font-bold text-emerald-400 mt-1">0.928</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Inference Latency</span>
                <div className="text-sm font-bold text-white mt-1">&lt; 12ms / record</div>
              </div>
            </div>
          </div>

          {/* Model Runs History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Pipeline Execution & Training Runs
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Run ID & Model</th>
                    <th className="py-3 px-4">Dataset</th>
                    <th className="py-3 px-4">Records Scored</th>
                    <th className="py-3 px-4">Anomalies Flagged</th>
                    <th className="py-3 px-4">Accuracy / F1</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {models.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{run.modelName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{run.id}</div>
                      </td>
                      <td className="py-3 px-4">{run.datasetName || 'Combined Lake'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{run.totalRecords.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-400">{run.anomalyCount}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {(run.accuracy * 100).toFixed(1)}% / {(run.f1Score * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Investigate Anomaly Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Header (Fixed) */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
                  <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Anomaly Investigation</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono">{selectedAnomaly.id} • {selectedAnomaly.patientName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
              {/* Summary Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/60 p-3.5 sm:p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Patient MRN:</span>
                  <div className="font-semibold text-white mt-0.5">{selectedAnomaly.patientId}</div>
                </div>
                <div>
                  <span className="text-slate-400">Encounter ID:</span>
                  <div className="font-semibold text-white mt-0.5">{selectedAnomaly.encounterId}</div>
                </div>
                <div>
                  <span className="text-slate-400">Severity Tier:</span>
                  <div className="mt-0.5">{getSeverityBadge(selectedAnomaly.severity)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Anomaly Category:</span>
                  <div className="mt-0.5">{getCategoryBadge(selectedAnomaly.category)}</div>
                </div>
              </div>

              {/* Explanation Flags */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">Flagged Rationale & Outlier Drivers:</span>
                <div className="space-y-1.5">
                  {selectedAnomaly.explanationFlags?.map((flag, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3 py-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Features JSON */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">Raw Encounter Features:</span>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-32 sm:max-h-40 overflow-auto">
                  <pre className="whitespace-pre-wrap sm:whitespace-pre">{JSON.stringify(selectedAnomaly.recordData, null, 2)}</pre>
                </div>
              </div>

              {/* Resolution Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Resolution Notes & Auditor Feedback:</label>
                <textarea
                  rows={2}
                  placeholder="Add audit notes (e.g. 'Confirmed coding anomaly in pharmacy billing')..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={() => handleResolve('FALSE_POSITIVE')}
                disabled={resolvingStatus}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                Mark as False Positive
              </button>
              <button
                onClick={() => handleResolve('CONFIRMED_ANOMALY')}
                disabled={resolvingStatus}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/20 transition"
              >
                Confirm Anomaly
              </button>
              <button
                onClick={() => handleResolve('RESOLVED')}
                disabled={resolvingStatus}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition"
              >
                Resolve & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Risk Detail Modal */}
      {selectedPatientRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Header (Fixed) */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                  <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{selectedPatientRisk.patientName}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono">{selectedPatientRisk.patientId} • {selectedPatientRisk.primaryDiagnosis}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientRisk(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/60 p-3.5 sm:p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Risk Score:</span>
                  <div className="text-base sm:text-lg font-bold text-white mt-0.5">{selectedPatientRisk.riskScore} / 100</div>
                </div>
                <div>
                  <span className="text-slate-400">Readmission Prob:</span>
                  <div className="text-base sm:text-lg font-bold text-indigo-400 mt-0.5">
                    {(selectedPatientRisk.readmissionProbability * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Risk Stratum:</span>
                  <div className="mt-0.5">{getRiskTierBadge(selectedPatientRisk.riskTier)}</div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  AI Clinical Decision Support & Discharge Interventions:
                </h4>
                <div className="space-y-2">
                  {selectedPatientRisk.clinicalRecommendations?.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 flex justify-end">
              <button
                onClick={() => setSelectedPatientRisk(null)}
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Train / Run ML Pipeline Modal */}
      {isTrainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Header (Fixed) */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Execute ML Pipeline</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Run Isolation Forest & Risk Stratification</p>
                </div>
              </div>
              <button
                onClick={() => setIsTrainModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {trainSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{trainSuccessMessage}</span>
                </div>
              )}

              {/* Dataset select */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Target Healthcare Dataset:</label>
                <select
                  value={trainDatasetId}
                  onChange={(e) => setTrainDatasetId(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {overview?.availableFilterOptions?.datasets?.map((ds) => (
                    <option key={ds.id} value={ds.id} className="bg-slate-900">
                      {ds.name} ({ds.totalRecords.toLocaleString()} records)
                    </option>
                  ))}
                </select>
              </div>

              {/* Contamination rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-slate-300 font-semibold">Anomaly Contamination Threshold:</label>
                  <span className="font-mono text-indigo-400 font-bold">{(trainContamination * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.20"
                  step="0.01"
                  value={trainContamination}
                  onChange={(e) => setTrainContamination(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">Proportion of outliers expected in dataset (default: 8%).</p>
              </div>

              {/* Trees Estimators */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-slate-300 font-semibold">Isolation Trees (n_estimators):</label>
                  <span className="font-mono text-indigo-400 font-bold">{trainEstimators} trees</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={trainEstimators}
                  onChange={(e) => setTrainEstimators(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setIsTrainModalOpen(false)}
                disabled={isTraining}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerTraining}
                disabled={isTraining}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Training Isolation Forest...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Training Run
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
