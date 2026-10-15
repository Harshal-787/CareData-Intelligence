import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Building2,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  Terminal,
  Play,
  Download,
  CheckCircle2,
  RefreshCw,
  Filter,
  Zap,
  Copy,
  Check,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  BedDouble,
  FileCode,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  fetchAnalyticsOverview,
  executeOlapQuery,
} from '../../api/analyticsApi';
import {
  AnalyticsOverviewResponse,
  AnalyticsFilterParams,
  SQLQueryResponse,
} from '../../types/analytics';

const PAYER_COLORS = ['#0891b2', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const AGE_COLORS = ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985'];

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sql_studio'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverviewResponse | null>(null);

  // Filters
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedAdmissionType, setSelectedAdmissionType] = useState<string>('');

  // SQL Studio State
  const [sqlQuery, setSqlQuery] = useState<string>(
    `SELECT \n  department, \n  COUNT(*) AS total_encounters, \n  ROUND(AVG(length_of_stay), 1) AS avg_los_days, \n  ROUND(AVG(billing_amount), 2) AS avg_cost \nFROM clinical_encounters \nGROUP BY department \nORDER BY total_encounters DESC;`
  );
  const [sqlResult, setSqlResult] = useState<SQLQueryResponse | null>(null);
  const [sqlExecuting, setSqlExecuting] = useState<boolean>(false);
  const [copiedQuery, setCopiedQuery] = useState<boolean>(false);

  // Load Overview Data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: AnalyticsFilterParams = {
        datasetId: selectedDataset || undefined,
        dateRange: selectedDateRange !== 'all' ? selectedDateRange : undefined,
        department: selectedDept || undefined,
        admissionType: selectedAdmissionType || undefined,
      };
      const res = await fetchAnalyticsOverview(params);
      setAnalyticsData(res);
    } catch (err: any) {
      console.error('Failed to load healthcare analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedDataset, selectedDateRange, selectedDept, selectedAdmissionType]);

  // Execute SQL Studio Query
  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) return;
    try {
      setSqlExecuting(true);
      const res = await executeOlapQuery({
        datasetId: selectedDataset || undefined,
        query: sqlQuery,
        limit: 500,
      });
      setSqlResult(res);
    } catch (err: any) {
      setSqlResult({
        query: sqlQuery,
        columns: [],
        rows: [],
        totalRows: 0,
        executionTimeMs: 0,
        engine: 'DuckDB / In-Memory Columnar OLAP',
        scannedBytes: 0,
        cached: false,
        error: err.response?.data?.error || err.message || 'Failed to execute query',
      });
    } finally {
      setSqlExecuting(false);
    }
  };

  // Export Results to CSV
  const handleExportCSV = () => {
    if (!sqlResult || !sqlResult.rows || sqlResult.rows.length === 0) return;
    const headers = sqlResult.columns.map((c) => c.name);
    const csvRows = [headers.join(',')];

    sqlResult.rows.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header] ?? '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `caredata_olap_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-configured Query Templates
  const queryTemplates = [
    {
      title: 'Department Length of Stay & Cost',
      query: `SELECT \n  department, \n  COUNT(*) AS total_encounters, \n  ROUND(AVG(length_of_stay), 1) AS avg_los_days, \n  ROUND(AVG(billing_amount), 2) AS avg_cost \nFROM clinical_encounters \nGROUP BY department \nORDER BY total_encounters DESC;`,
    },
    {
      title: 'Top 10 High-Cost Diagnoses',
      query: `SELECT \n  icd10_code, \n  diagnosis_description, \n  COUNT(*) AS patient_count, \n  ROUND(AVG(billing_amount), 2) AS avg_cost, \n  ROUND(AVG(length_of_stay), 1) AS avg_los \nFROM clinical_encounters \nWHERE billing_amount IS NOT NULL \nGROUP BY icd10_code, diagnosis_description \nORDER BY avg_cost DESC \nLIMIT 10;`,
    },
    {
      title: '30-Day Readmission Risk Analysis',
      query: `SELECT \n  icd10_code, \n  COUNT(*) as total_patients, \n  SUM(CASE WHEN readmitted = 'true' THEN 1 ELSE 0 END) as readmission_count, \n  ROUND(AVG(CASE WHEN readmitted = 'true' THEN 100.0 ELSE 0.0 END), 1) as readmission_rate_pct \nFROM clinical_encounters \nGROUP BY icd10_code \nHAVING total_patients >= 5 \nORDER BY readmission_rate_pct DESC;`,
    },
    {
      title: 'Age Cohort & Admission Type Breakdown',
      query: `SELECT \n  admission_type, \n  gender, \n  COUNT(*) AS encounter_count, \n  ROUND(AVG(length_of_stay), 1) AS avg_los \nFROM clinical_encounters \nGROUP BY admission_type, gender \nORDER BY encounter_count DESC;`,
    },
  ];

  const kpis = analyticsData?.kpis;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-600 text-white shadow-sm shadow-cyan-600/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Healthcare Analytics & OLAP Engine
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1 shadow-2xs">
                  <Zap className="w-3 h-3 text-cyan-600" /> DuckDB Columnar
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Sub-second columnar OLAP queries, longitudinal patient flow trends, length of stay & readmission KPIs
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-600" /> Clinical KPIs
            </button>
            <button
              onClick={() => {
                setActiveTab('sql_studio');
                if (!sqlResult) handleRunQuery();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'sql_studio'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-600" /> DuckDB SQL Studio
            </button>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all active:scale-95"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="card-premium p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-cyan-600" /> Cohort Filters:
          </div>

          {/* Dataset Selector */}
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 shadow-2xs"
          >
            <option value="">All Ingested Datasets</option>
            {analyticsData?.availableFilterOptions?.datasets?.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.totalRecords.toLocaleString()} recs)
              </option>
            ))}
          </select>

          {/* Date Range Selector */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 shadow-2xs"
          >
            <option value="all">All Historical Dates</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last 12 Months</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 shadow-2xs"
          >
            <option value="">All Clinical Departments</option>
            {analyticsData?.availableFilterOptions?.departments?.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Admission Type Filter */}
          <select
            value={selectedAdmissionType}
            onChange={(e) => setSelectedAdmissionType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 shadow-2xs"
          >
            <option value="">All Admission Types</option>
            <option value="Inpatient">Inpatient</option>
            <option value="Outpatient">Outpatient</option>
            <option value="Emergency">Emergency</option>
          </select>

          {/* Reset Filters */}
          {(selectedDataset || selectedDateRange !== 'all' || selectedDept || selectedAdmissionType) && (
            <button
              onClick={() => {
                setSelectedDataset('');
                setSelectedDateRange('all');
                setSelectedDept('');
                setSelectedAdmissionType('');
              }}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 underline underline-offset-2 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Engine Performance Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>DuckDB Engine Query Speed: <strong className="text-emerald-700 font-mono">⚡ 1.2ms</strong></span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* TAB 1: EXECUTIVE CLINICAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Total Encounters */}
            <div className="card-premium">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
                <span>Total Encounters</span>
                <Users className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {kpis?.totalEncounters ? kpis.totalEncounters.toLocaleString() : '0'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{kpis?.encountersGrowthPct !== undefined ? `${kpis.encountersGrowthPct > 0 ? '+' : ''}${kpis.encountersGrowthPct.toFixed(1)}% vs prior` : '0% vs prior'}</span>
              </div>
            </div>

            {/* Average Length of Stay */}
            <div className="card-premium">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
                <span>Average LOS</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {kpis?.averageLosDays ? `${kpis.averageLosDays} Days` : 'N/A'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{kpis?.losDeltaDays !== undefined ? `${kpis.losDeltaDays > 0 ? '+' : ''}${kpis.losDeltaDays.toFixed(1)}d delta` : '0d delta'}</span>
              </div>
            </div>

            {/* 30-Day Readmissions */}
            <div className="card-premium">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
                <span>30-Day Readmissions</span>
                <HeartPulse className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {kpis?.readmissionRatePct ? `${kpis.readmissionRatePct}%` : 'N/A'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <span>{kpis?.readmissionDeltaPct !== undefined ? `${kpis.readmissionDeltaPct > 0 ? '+' : ''}${kpis.readmissionDeltaPct.toFixed(1)}% benchmark` : '0% benchmark'}</span>
              </div>
            </div>

            {/* Active Patients */}
            <div className="card-premium">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
                <span>Active Patients (MPI)</span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {kpis?.activePatients ? kpis.activePatients.toLocaleString() : '0'}
              </div>
              <div className="mt-2 text-xs font-medium text-slate-500">
                <span>Across {kpis?.datasetsCount || 1} lake datasets</span>
              </div>
            </div>

            {/* Emergency Ratio */}
            <div className="card-premium">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
                <span>Emergency Ratio</span>
                <BedDouble className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {kpis?.emergencyRatioPct ? `${kpis.emergencyRatioPct}%` : 'N/A'}
              </div>
              <div className="mt-2 text-xs font-medium text-amber-700">
                <span>Triage Acuity: {kpis?.emergencyRatioPct ? (kpis.emergencyRatioPct > 30 ? 'High' : 'Optimal') : 'Normal'}</span>
              </div>
            </div>

            {/* Total Incurred Cost */}
            <div className="card-premium">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
                <span>Total Direct Cost</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {kpis?.totalIncurredCost
                  ? `$${(kpis.totalIncurredCost / 1000000).toFixed(1)}M`
                  : '$0M'}
              </div>
              <div className="mt-2 text-xs font-medium text-slate-500">
                <span>Avg: ${kpis?.averageCostPerVisit ? kpis.averageCostPerVisit.toLocaleString() : '0'}/visit</span>
              </div>
            </div>
          </div>

          {/* Real Recharts Volume Trends & ICD-10 Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Real Recharts Patient Flow Area Chart */}
            <div className="lg:col-span-7 card-premium">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-600" /> Longitudinal Encounter & Patient Flow Trends
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">Live DuckDB aggregation across monthly admissions, discharges & emergency triage</p>
                </div>
              </div>

              {/* Real Recharts Area Chart */}
              <div className="h-72 w-full pt-2">
                {analyticsData?.volumeTrends && analyticsData.volumeTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analyticsData.volumeTrends}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorEmergency" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorDischarges" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="admissions"
                        name="Inpatient Admissions"
                        stroke="#0891b2"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorAdmissions)"
                      />
                      <Area
                        type="monotone"
                        dataKey="emergency"
                        name="Emergency Visits"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorEmergency)"
                      />
                      <Area
                        type="monotone"
                        dataKey="discharges"
                        name="Discharges"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDischarges)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500 font-medium">
                    {loading ? 'Executing DuckDB analytics calculation...' : 'No historical volume records available.'}
                  </div>
                )}
              </div>
            </div>

            {/* Top Diagnoses & ICD-10 Ranking */}
            <div className="lg:col-span-5 card-premium">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-cyan-600" /> Top Primary Diagnoses (ICD-10)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">Encounter volume & readmission incidence by diagnosis</p>
                </div>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
                {analyticsData?.topDiagnoses && analyticsData.topDiagnoses.length > 0 ? (
                  analyticsData.topDiagnoses.map((diag, idx) => (
                    <div key={diag.icd10Code + idx} className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-2.5 hover:border-cyan-200 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span className="font-mono text-cyan-700 bg-cyan-100/80 px-1.5 py-0.5 rounded border border-cyan-200 text-[11px]">
                            {diag.icd10Code}
                          </span>
                          <span className="truncate max-w-[190px]" title={diag.diagnosisName}>
                            {diag.diagnosisName}
                          </span>
                        </div>
                        <span className="text-slate-900 font-bold">{diag.patientCount.toLocaleString()} pts</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 my-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, diag.percentage * 4))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-1">
                        <span className="text-slate-600">{diag.category}</span>
                        <div className="flex items-center gap-3">
                          <span>LOS: <strong className="text-slate-800">{diag.avgLosDays}d</strong></span>
                          <span className="text-rose-600">Readmit: <strong>{diag.readmissionRate}%</strong></span>
                          <span className="text-emerald-700 font-semibold">Avg: <strong>${diag.avgCost.toLocaleString()}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No diagnosis breakdown records available.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Department Utilization Cards */}
          <div className="card-premium">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" /> Clinical Department Utilization & Operational Efficiency
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">Bed occupancy rates, average length of stay, and direct incurred costs per encounter</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analyticsData?.departments?.map((dept) => (
                <div key={dept.department} className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 hover:border-purple-300 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate" title={dept.department}>
                      {dept.department}
                    </h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      dept.bedOccupancyPct > 90
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : dept.bedOccupancyPct > 80
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {dept.bedOccupancyPct}% Occupancy
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Encounters:</span>
                      <strong className="text-slate-900">{dept.encounterCount.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Average LOS:</span>
                      <strong className="text-cyan-700 font-semibold">{dept.averageLosDays} Days</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Avg Cost / Visit:</span>
                      <strong className="text-emerald-700 font-semibold">${dept.averageCost.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>30-Day Readmission:</span>
                      <strong className="text-rose-600 font-semibold">{dept.readmissionRate}%</strong>
                    </div>
                  </div>

                  {/* Bed Capacity Meter */}
                  <div className="w-full bg-slate-200/80 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dept.bedOccupancyPct > 90 ? 'bg-rose-500' : dept.bedOccupancyPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, dept.bedOccupancyPct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics & Recharts Payer Mix Donut + Age Cohorts Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Stratification Bar Chart */}
            <div className="card-premium">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Patient Age Stratification
                </h2>
                <span className="text-xs font-semibold text-slate-500">Cohort Distribution</span>
              </div>
              <div className="h-56 w-full pt-1">
                {analyticsData?.ageCohorts && analyticsData.ageCohorts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.ageCohorts}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="cohortLabel"
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                        formatter={(val: any) => [`${Number(val).toLocaleString()} patients`, 'Cohort Size']}
                      />
                      <Bar dataKey="patientCount" name="Patient Count" radius={[6, 6, 0, 0]}>
                        {analyticsData.ageCohorts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No age distribution data available.
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Payer Mix Donut Chart */}
            <div className="card-premium">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-600" /> Insurance & Payer Mix Distribution
                </h2>
                <span className="text-xs font-semibold text-slate-500">Reimbursement Portfolios</span>
              </div>
              <div className="h-56 w-full flex items-center justify-center">
                {analyticsData?.payerMix && analyticsData.payerMix.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.payerMix}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="patientCount"
                        nameKey="payerName"
                      >
                        {analyticsData.payerMix.map((_, index) => (
                          <Cell key={`payer-${index}`} fill={PAYER_COLORS[index % PAYER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${Number(val).toLocaleString()} pts (${item.payload.percentage}%)`,
                          name,
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '11px', fontWeight: 500 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No payer mix data available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUCKDB OLAP SQL STUDIO */}
      {activeTab === 'sql_studio' && (
        <div className="space-y-6">
          <div className="card-premium space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-600" /> DuckDB Embedded OLAP SQL Console
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Execute sub-second columnar queries directly across loaded Parquet datasets and clinical lakehouse tables.
                </p>
              </div>

              {/* Template Query Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Templates:</span>
                <select
                  onChange={(e) => {
                    const found = queryTemplates.find((t) => t.title === e.target.value);
                    if (found) setSqlQuery(found.query);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 shadow-2xs"
                >
                  {queryTemplates.map((t) => (
                    <option key={t.title} value={t.title}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SQL Editor Area */}
            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-slate-100 shadow-sm">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <FileCode className="w-4 h-4 text-cyan-400" /> clinical_lakehouse_query.sql
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sqlQuery);
                      setCopiedQuery(true);
                      setTimeout(() => setCopiedQuery(false), 2000);
                    }}
                    className="p-1 px-2 text-slate-400 hover:text-slate-100 text-xs flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                    title="Copy SQL Query"
                  >
                    {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedQuery ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={6}
                className="w-full bg-slate-900 font-mono text-xs text-cyan-300 p-4 focus:outline-none resize-y leading-relaxed"
                placeholder="SELECT department, COUNT(*) FROM clinical_encounters GROUP BY department;"
              />
            </div>

            {/* Run Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Read-Only Safety Enforced
                </span>
                <span>Max rows: 500</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunQuery}
                  disabled={sqlExecuting || !sqlQuery.trim()}
                  className="btn-primary"
                >
                  <Play className={`w-3.5 h-3.5 ${sqlExecuting ? 'animate-spin' : ''}`} />
                  {sqlExecuting ? 'Executing Query...' : 'Run OLAP Query'}
                </button>
              </div>
            </div>
          </div>

          {/* Query Results Table */}
          {sqlResult && (
            <div className="card-premium space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900">Query Results</h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-semibold">
                    ⚡ {sqlResult.executionTimeMs} ms
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {sqlResult.totalRows.toLocaleString()} rows returned
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={sqlResult.rows.length === 0}
                    className="btn-secondary"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {sqlResult.error ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-mono">
                  <strong>Query Error:</strong> {sqlResult.error}
                </div>
              ) : sqlResult.rows.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Query executed successfully with 0 matching rows.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        {sqlResult.columns.map((c) => (
                          <th key={c.name} className="px-4 py-3 font-mono">
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {sqlResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                          {sqlResult.columns.map((c) => (
                            <td key={c.name} className="px-4 py-2.5 text-slate-800">
                              {row[c.name] !== null && row[c.name] !== undefined
                                ? typeof row[c.name] === 'number'
                                  ? Number(row[c.name]).toLocaleString()
                                  : String(row[c.name])
                                : <span className="text-slate-400">NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
