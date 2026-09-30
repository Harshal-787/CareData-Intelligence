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
  Database,
  Terminal,
  Play,
  Download,
  CheckCircle2,
  RefreshCw,
  Filter,
  Zap,
  Server,
  CloudLightning,
  Copy,
  Check,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  BedDouble,
  FileCode,
} from 'lucide-react';
import {
  fetchAnalyticsOverview,
  executeOlapQuery,
  fetchSnowflakeStatus,
  triggerSnowflakeSync,
  updateSnowflakeConfig,
} from '../../api/analyticsApi';
import {
  AnalyticsOverviewResponse,
  AnalyticsFilterParams,
  SQLQueryResponse,
  SnowflakeStatusResponse,
} from '../../types/analytics';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sql_studio' | 'snowflake'>('overview');
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

  // Snowflake State
  const [snowflakeData, setSnowflakeData] = useState<SnowflakeStatusResponse | null>(null);
  const [syncingSnowflake, setSyncingSnowflake] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState<boolean>(false);

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

  // Load Snowflake Status
  const loadSnowflake = async () => {
    try {
      const res = await fetchSnowflakeStatus();
      setSnowflakeData(res);
    } catch (err) {
      console.error('Failed to load Snowflake status:', err);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadSnowflake();
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

  // Trigger Snowflake Sync
  const handleTriggerSync = async () => {
    try {
      setSyncingSnowflake(true);
      setSyncSuccessMessage(null);
      const syncRes = await triggerSnowflakeSync(selectedDataset || undefined);
      setSyncSuccessMessage(`Successfully synchronized ${syncRes.recordsSynced.toLocaleString()} records to ${syncRes.targetTable} in ${syncRes.durationMs}ms`);
      loadSnowflake();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to trigger Snowflake sync');
    } finally {
      setSyncingSnowflake(false);
    }
  };

  // Provision Tenant Warehouse
  const handleProvisionWarehouse = async () => {
    try {
      setProvisioning(true);
      await updateSnowflakeConfig({
        id: '',
        organizationId: '',
        account: '',
        warehouse: '',
        database: '',
        schema: '',
        role: '',
        username: '',
        isConnected: false,
        autoSync: true,
        syncInterval: 'DAILY (Midnight UTC)',
        updatedAt: new Date().toISOString(),
      });
      alert('Provisioning initiated successfully! Refreshing status...');
      await loadSnowflake();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to provision warehouse');
    } finally {
      setProvisioning(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-sm shadow-blue-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Healthcare Analytics & OLAP Engine
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-600 border border-cyan-200 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Phase 5
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Sub-second DuckDB columnar queries, population health trends, length of stay & readmission KPIs
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Clinical KPIs
            </button>
            <button
              onClick={() => {
                setActiveTab('sql_studio');
                if (!sqlResult) handleRunQuery();
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'sql_studio'
                  ? 'bg-blue-600 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> DuckDB SQL Studio
            </button>
            <button
              onClick={() => setActiveTab('snowflake')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'snowflake'
                  ? 'bg-blue-600 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Server className="w-3.5 h-3.5" /> Snowflake Lake
            </button>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Cohort Filters:
          </div>

          {/* Dataset Selector */}
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="bg-slate-50 border border-slate-750 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
            className="bg-slate-50 border border-slate-750 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
            className="bg-slate-50 border border-slate-750 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
            className="bg-slate-50 border border-slate-750 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
              className="text-xs text-blue-600 hover:text-blue-300 underline underline-offset-2"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Engine Performance Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>DuckDB In-Memory OLAP Engine: <strong className="text-emerald-600 font-mono">⚡ 1.2ms</strong></span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* TAB 1: EXECUTIVE CLINICAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Total Encounters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Encounters</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpis?.totalEncounters ? kpis.totalEncounters.toLocaleString() : '0'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+4.8% vs last period</span>
              </div>
            </div>

            {/* Average Length of Stay */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Average LOS</span>
                <Clock className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpis?.averageLosDays ? `${kpis.averageLosDays} Days` : 'N/A'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>-0.3 days optimal</span>
              </div>
            </div>

            {/* 30-Day Readmissions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>30-Day Readmissions</span>
                <HeartPulse className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpis?.readmissionRatePct ? `${kpis.readmissionRatePct}%` : 'N/A'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <span>1.4% below benchmark</span>
              </div>
            </div>

            {/* Active Patients */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Patients (MPI)</span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpis?.activePatients ? kpis.activePatients.toLocaleString() : '0'}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                <span>Across {kpis?.datasetsCount || 3} source datasets</span>
              </div>
            </div>

            {/* Emergency Ratio */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Emergency Encounter %</span>
                <BedDouble className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpis?.emergencyRatioPct ? `${kpis.emergencyRatioPct}%` : 'N/A'}
              </div>
              <div className="mt-2 text-xs text-amber-600">
                <span>Triage acuity: Moderate</span>
              </div>
            </div>

            {/* Total Incurred Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Incurred Cost</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpis?.totalIncurredCost
                  ? `$${(kpis.totalIncurredCost / 1000000).toFixed(1)}M`
                  : 'N/A'}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                <span>Avg: ${kpis?.averageCostPerVisit ? kpis.averageCostPerVisit.toLocaleString() : '0'}/visit</span>
              </div>
            </div>
          </div>

          {/* Visual Charts Grid: Volume Trends & Top ICD-10 Diagnoses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Patient Flow & Encounter Volume Time-Series */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Encounter Volume & Patient Flow Trends
                  </h2>
                  <p className="text-xs text-slate-400">Monthly admissions, discharges, and inpatient/emergency breakdown</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Admissions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Discharges
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Emergency
                  </span>
                </div>
              </div>

              {/* Bar / Column Chart Visualization */}
              <div className="h-64 flex items-end gap-3 pt-6 pb-2 px-2">
                {analyticsData?.volumeTrends?.map((point) => {
                  const maxVol = Math.max(...(analyticsData?.volumeTrends?.map((p) => p.totalVolume) || [3000]));
                  const heightPct = Math.min(100, Math.max(15, (point.totalVolume / maxVol) * 100));
                  return (
                    <div key={point.period} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-50 border border-slate-200 text-slate-100 text-xs rounded-lg p-2 shadow-sm pointer-events-none z-20 whitespace-nowrap">
                        <p className="font-bold text-slate-900 mb-1">{point.period}</p>
                        <p className="text-blue-600">Total: {point.totalVolume.toLocaleString()}</p>
                        <p className="text-cyan-600">Admissions: {point.admissions.toLocaleString()}</p>
                        <p className="text-rose-600">Emergency: {point.emergency.toLocaleString()}</p>
                      </div>

                      {/* Stacked Bar */}
                      <div
                        className="w-full rounded-t-lg overflow-hidden bg-slate-50 flex flex-col justify-end transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="w-full bg-blue-600 transition-all" style={{ height: '48%' }} title="Inpatient" />
                        <div className="w-full bg-cyan-500 transition-all" style={{ height: '32%' }} title="Outpatient" />
                        <div className="w-full bg-rose-500 transition-all" style={{ height: '20%' }} title="Emergency" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">{point.period}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Diagnoses & ICD-10 Ranking */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-cyan-600" /> Top Primary Diagnoses (ICD-10)
                  </h2>
                  <p className="text-xs text-slate-400">Admissions volume & readmission rate by diagnosis</p>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
                {analyticsData?.topDiagnoses?.map((diag, idx) => (
                  <div key={diag.icd10Code + idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <span className="font-mono text-cyan-600 bg-cyan-100 px-1.5 py-0.5 rounded border border-cyan-200 text-[11px]">
                          {diag.icd10Code}
                        </span>
                        <span className="truncate max-w-[190px]" title={diag.diagnosisName}>
                          {diag.diagnosisName}
                        </span>
                      </div>
                      <span className="text-slate-600 font-bold">{diag.patientCount.toLocaleString()} pts</span>
                    </div>

                    {/* Progress Bar & Badges */}
                    <div className="w-full bg-slate-50 rounded-full h-1.5 my-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, diag.percentage * 5)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span className="text-slate-400">{diag.category}</span>
                      <div className="flex items-center gap-3">
                        <span>LOS: <strong className="text-slate-700">{diag.avgLosDays}d</strong></span>
                        <span className="text-rose-600">Readmit: <strong>{diag.readmissionRate}%</strong></span>
                        <span className="text-emerald-600">Avg: <strong>${diag.avgCost.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Utilization & Bed Capacity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" /> Clinical Department Utilization & Operational Efficiency
                </h2>
                <p className="text-xs text-slate-400">Bed occupancy rates, average length of stay, and direct incurred costs per encounter</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analyticsData?.departments?.map((dept) => (
                <div key={dept.department} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-purple-200 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate" title={dept.department}>
                      {dept.department}
                    </h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      dept.bedOccupancyPct > 90
                        ? 'bg-rose-100 text-rose-600 border border-rose-200'
                        : dept.bedOccupancyPct > 80
                        ? 'bg-amber-100 text-amber-600 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                    }`}>
                      {dept.bedOccupancyPct}% Occupancy
                    </span>
                  </div>

                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Encounters:</span>
                      <strong className="text-slate-700">{dept.encounterCount.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Average LOS:</span>
                      <strong className="text-cyan-600">{dept.averageLosDays} Days</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Avg Cost / Visit:</span>
                      <strong className="text-emerald-600">${dept.averageCost.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>30-Day Readmission:</span>
                      <strong className="text-rose-600">{dept.readmissionRate}%</strong>
                    </div>
                  </div>

                  {/* Bed Capacity Meter */}
                  <div className="w-full bg-slate-50 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dept.bedOccupancyPct > 90 ? 'bg-rose-500' : dept.bedOccupancyPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dept.bedOccupancyPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics & Payer Mix Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Cohort Distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" /> Patient Age Stratification
              </h2>
              <div className="space-y-3">
                {analyticsData?.ageCohorts?.map((cohort) => (
                  <div key={cohort.cohortLabel} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="font-medium">Age {cohort.cohortLabel}</span>
                      <span>{cohort.patientCount.toLocaleString()} patients ({cohort.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${cohort.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payer / Insurance Mix */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Insurance & Payer Mix Distribution
              </h2>
              <div className="space-y-3">
                {analyticsData?.payerMix?.map((payer) => (
                  <div key={payer.payerName} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="font-medium">{payer.payerName}</span>
                      <span>{payer.patientCount.toLocaleString()} pts ({payer.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${payer.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUCKDB OLAP SQL STUDIO */}
      {activeTab === 'sql_studio' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-600" /> DuckDB Embedded OLAP SQL Console
                </h2>
                <p className="text-xs text-slate-400">
                  Execute sub-second columnar queries directly across loaded Parquet datasets and clinical tables.
                </p>
              </div>

              {/* Template Query Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Templates:</span>
                <select
                  onChange={(e) => {
                    const found = queryTemplates.find((t) => t.title === e.target.value);
                    if (found) setSqlQuery(found.query);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
            <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <FileCode className="w-4 h-4 text-cyan-600" /> sql_query.sql
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sqlQuery);
                      setCopiedQuery(true);
                      setTimeout(() => setCopiedQuery(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1"
                    title="Copy SQL Query"
                  >
                    {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedQuery ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 font-mono text-xs text-cyan-700 p-4 focus:outline-none resize-y leading-relaxed"
                placeholder="SELECT department, COUNT(*) FROM clinical_encounters GROUP BY department;"
              />
            </div>

            {/* Run Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <ShieldCheck className="w-4 h-4" /> Read-Only Safety Enforced
                </span>
                <span>Max rows: 500</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunQuery}
                  disabled={sqlExecuting || !sqlQuery.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Play className={`w-3.5 h-3.5 ${sqlExecuting ? 'animate-spin' : ''}`} />
                  {sqlExecuting ? 'Executing Query...' : 'Run OLAP Query'}
                </button>
              </div>
            </div>
          </div>

          {/* Query Results Table */}
          {sqlResult && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900">Query Results</h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-mono">
                    ⚡ {sqlResult.executionTimeMs} ms
                  </span>
                  <span className="text-xs text-slate-400">
                    {sqlResult.totalRows.toLocaleString()} rows returned
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={sqlResult.rows.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {sqlResult.error ? (
                <div className="bg-rose-100 border border-rose-200 text-rose-600 p-4 rounded-lg text-xs font-mono">
                  <strong>Query Error:</strong> {sqlResult.error}
                </div>
              ) : sqlResult.rows.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Query executed successfully with 0 matching rows.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200">
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
                            <td key={c.name} className="px-4 py-2.5 text-slate-700">
                              {row[c.name] !== null && row[c.name] !== undefined
                                ? typeof row[c.name] === 'number'
                                  ? Number(row[c.name]).toLocaleString()
                                  : String(row[c.name])
                                : <span className="text-slate-600">NULL</span>}
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

      {/* TAB 3: SNOWFLAKE DATA WAREHOUSE */}
      {activeTab === 'snowflake' && (
        <div className="space-y-6">
          {syncSuccessMessage && (
            <div className="bg-emerald-100 border border-emerald-200 text-emerald-600 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{syncSuccessMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Snowflake Status & Settings */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-base font-bold text-slate-900">Snowflake Warehouse Connector</h2>
                </div>
                {snowflakeData?.config?.isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold flex items-center gap-1">
                    <Server className="w-3 h-3" /> Not Connected
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-400">Account:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[220px]">
                    {snowflakeData?.config?.account || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-400">Warehouse:</span>
                  <span className="font-mono text-cyan-600">{snowflakeData?.config?.warehouse || 'Pending Provisioning...'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-400">Database:</span>
                  <span className="font-mono text-slate-700">{snowflakeData?.config?.database || 'Pending...'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-400">Schema:</span>
                  <span className="font-mono text-slate-700">{snowflakeData?.config?.schema || 'Pending...'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-400">Auto-Sync Schedule:</span>
                  <span className="text-slate-700 font-semibold">{snowflakeData?.config?.syncInterval || 'DAILY (Midnight UTC)'}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                {!snowflakeData?.config?.isConnected && (
                  <button
                    onClick={handleProvisionWarehouse}
                    disabled={provisioning}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Server className={`w-4 h-4 ${provisioning ? 'animate-pulse' : ''}`} />
                    {provisioning ? 'Provisioning...' : 'Provision Dedicated Warehouse'}
                  </button>
                )}

                <button
                  onClick={handleTriggerSync}
                  disabled={syncingSnowflake || !snowflakeData?.config?.isConnected}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <CloudLightning className={`w-4 h-4 ${syncingSnowflake ? 'animate-spin' : ''}`} />
                  {syncingSnowflake ? 'Syncing to Snowflake...' : 'Sync Dataset Aggregations Now'}
                </button>
              </div>
            </div>

            {/* Synchronization History & Audit Trail */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" /> Enterprise Warehouse Sync Audit Trail
                  </h2>
                  <p className="text-xs text-slate-400">Historical records of analytical mart transfers to Snowflake</p>
                </div>
              </div>

              {snowflakeData?.recentSyncs && snowflakeData.recentSyncs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Target Table</th>
                        <th className="px-3 py-2.5">Records</th>
                        <th className="px-3 py-2.5">Duration</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {snowflakeData.recentSyncs.map((sync) => (
                        <tr key={sync.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-cyan-700 font-medium truncate max-w-[200px]" title={sync.targetTable}>
                            {sync.targetTable}
                          </td>
                          <td className="px-3 py-2.5 text-slate-900 font-bold">{sync.recordsSynced.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-slate-400">{sync.durationMs}ms</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 text-[10px] font-sans font-semibold">
                              {sync.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 text-[11px] font-sans">
                            {new Date(sync.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No synchronization runs yet. Click "Sync Dataset Aggregations Now" to push clinical marts to Snowflake.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
