import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Activity,
  Play,
  RotateCcw,
  Download,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  ShieldCheck,
  Database,
  Calendar,
  Sliders,
  X,
  BarChart2,
} from "lucide-react";
import { fetchDatasets } from "../../api/datasets";
import {
  fetchQualityReport,
  runQualityAudit,
  fetchRules,
  createValidationRule,
  updateValidationRule,
  deleteValidationRule,
  resetDefaultRules,
  fetchViolations,
} from "../../api/qualityApi";
import { Dataset } from "../../types/dataset";
import {
  QualityReport,
  ValidationRule,
  QualityViolation,
  RuleType,
  RuleSeverity,
} from "../../types/quality";

export const QualityPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const [activeTab, setActiveTab] = useState<
    "overview" | "profiler" | "rules" | "violations"
  >("overview");
  const [report, setReport] = useState<QualityReport | null>(null);
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [violations, setViolations] = useState<QualityViolation[]>([]);
  const [violationsTotal, setViolationsTotal] = useState<number>(0);
  const [violationSeverityFilter, setViolationSeverityFilter] =
    useState<string>("");
  const [violationSearch, setViolationSearch] = useState<string>("");

  const [selectedColumnName, setSelectedColumnName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [auditing, setAuditing] = useState<boolean>(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState<boolean>(false);

  // New Rule Form State
  const [newRuleField, setNewRuleField] = useState<string>("");
  const [newRuleType, setNewRuleType] = useState<RuleType>("REQUIRED_FIELD");
  const [newRuleSeverity, setNewRuleSeverity] =
    useState<RuleSeverity>("WARNING");
  const [newRuleDesc, setNewRuleDesc] = useState<string>("");
  const [newRuleParams, setNewRuleParams] = useState<string>("{}");

  // Load initial dataset list
  useEffect(() => {
    const initDatasets = async () => {
      try {
        setLoading(true);
        const dsList = await fetchDatasets();
        const readyDatasets = dsList.filter((d) => d.status === "READY");
        setDatasets(readyDatasets);
        if (readyDatasets.length > 0) {
          setSelectedDatasetId(readyDatasets[0].id);
          setSelectedDataset(readyDatasets[0]);
        }
      } catch (err) {
        console.error("Failed to load datasets:", err);
      } finally {
        setLoading(false);
      }
    };
    initDatasets();
  }, []);

  // Load report, rules, and violations when selected dataset changes
  useEffect(() => {
    if (!selectedDatasetId) return;

    const currentDs = datasets.find((d) => d.id === selectedDatasetId) || null;
    setSelectedDataset(currentDs);

    loadQualityData(selectedDatasetId);
  }, [selectedDatasetId]);

  const loadQualityData = async (datasetId: string) => {
    try {
      setLoading(true);
      const [reportData, rulesData, violationsData] = await Promise.all([
        fetchQualityReport(datasetId),
        fetchRules(datasetId),
        fetchViolations(datasetId, { severity: violationSeverityFilter }),
      ]);
      setReport(reportData);
      setRules(rulesData);
      setViolations(violationsData.violations);
      setViolationsTotal(violationsData.total);

      if (reportData.columnProfiles && reportData.columnProfiles.length > 0) {
        setSelectedColumnName(reportData.columnProfiles[0].columnName);
      }
    } catch (err) {
      console.error("Failed to load quality data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!selectedDatasetId) return;
    try {
      setAuditing(true);
      const newReport = await runQualityAudit(selectedDatasetId);
      setReport(newReport);
      const [rulesData, violationsData] = await Promise.all([
        fetchRules(selectedDatasetId),
        fetchViolations(selectedDatasetId, {
          severity: violationSeverityFilter,
        }),
      ]);
      setRules(rulesData);
      setViolations(violationsData.violations);
      setViolationsTotal(violationsData.total);
    } catch (err) {
      console.error("Audit execution failed:", err);
    } finally {
      setAuditing(false);
    }
  };

  const handleToggleRule = async (rule: ValidationRule) => {
    try {
      const updated = await updateValidationRule(selectedDatasetId, rule.id, {
        isActive: !rule.isActive,
      });
      setRules(rules.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to remove this validation rule?"))
      return;
    try {
      await deleteValidationRule(selectedDatasetId, ruleId);
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Reset all validation rules to standard clinical healthcare defaults?",
      )
    )
      return;
    try {
      setLoading(true);
      const defaultRules = await resetDefaultRules(selectedDatasetId);
      setRules(defaultRules);
      await handleRunAudit();
    } catch (err) {
      console.error("Failed to reset rules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleField || !selectedDatasetId) return;

    try {
      const created = await createValidationRule(selectedDatasetId, {
        fieldName: newRuleField.trim(),
        ruleType: newRuleType,
        severity: newRuleSeverity,
        description:
          newRuleDesc.trim() || `Validation rule for ${newRuleField}`,
        parameters: newRuleParams,
        isActive: true,
      });
      setRules([...rules, created]);
      setIsAddRuleOpen(false);
      setNewRuleField("");
      setNewRuleDesc("");
      setNewRuleParams("{}");
    } catch (err) {
      console.error("Failed to create rule:", err);
    }
  };

  const handlePresetRuleSelect = (preset: {
    field: string;
    type: RuleType;
    severity: RuleSeverity;
    desc: string;
    params: string;
  }) => {
    setNewRuleField(preset.field);
    setNewRuleType(preset.type);
    setNewRuleSeverity(preset.severity);
    setNewRuleDesc(preset.desc);
    setNewRuleParams(preset.params);
  };

  const handleExportViolations = () => {
    if (!violations || violations.length === 0) return;
    const headers = [
      "RowNumber",
      "FieldName",
      "RuleType",
      "Severity",
      "InvalidValue",
      "Message",
      "Timestamp",
    ];
    const rows = violations.map((v) => [
      v.rowNumber,
      `"${v.fieldName}"`,
      v.ruleType,
      v.severity,
      `"${v.invalidValue.replace(/"/g, '""')}"`,
      `"${v.message.replace(/"/g, '""')}"`,
      v.createdAt,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `quality_violations_${selectedDataset?.name || "dataset"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 75) return "text-cyan-400";
    if (score >= 60) return "text-amber-400";
    return "text-rose-400";
  };

  const getHealthScoreBadge = (score: number) => {
    if (score >= 90)
      return {
        label: "Optimal Quality",
        bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      };
    if (score >= 75)
      return {
        label: "Good Health",
        bg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
      };
    if (score >= 60)
      return {
        label: "Needs Remediation",
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      };
    return {
      label: "High Risk / Critical",
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    };
  };

  const selectedColumnProfile =
    report?.columnProfiles?.find((c) => c.columnName === selectedColumnName) ||
    report?.columnProfiles?.[0];

  const filteredViolations = violations.filter((v) => {
    if (violationSeverityFilter && v.severity !== violationSeverityFilter)
      return false;
    if (violationSearch) {
      const q = violationSearch.toLowerCase();
      return (
        v.fieldName.toLowerCase().includes(q) ||
        v.message.toLowerCase().includes(q) ||
        v.invalidValue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto">
      {/* Top Header & Dataset Selection Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <CheckCircle2
                className={`h-6 w-6 ${loading ? "animate-pulse" : ""}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Clinical Data Quality & Profiling Suite
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Phase 3
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Automated dataset profiling, statistical histograms, and
                healthcare clinical validation rules.
              </p>
            </div>
          </div>
        </div>

        {/* Dataset Switcher & Audit Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <Database className="h-4 w-4 text-cyan-400" />
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer pr-2"
              disabled={datasets.length === 0}
            >
              {datasets.map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                  className="bg-slate-900 text-slate-200"
                >
                  {d.name} ({d.totalRecords} records)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={auditing || !selectedDatasetId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
          >
            <Play
              className={`h-4 w-4 ${auditing ? "animate-spin" : "fill-white"}`}
            />
            {auditing ? "Auditing Dataset..." : "Run Quality Audit"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <div className="flex space-x-1">
          {[
            { id: "overview", label: "Quality Scorecards", icon: Activity },
            {
              id: "profiler",
              label: "Column Profiler & Distributions",
              icon: BarChart2,
            },
            { id: "rules", label: "Clinical Rule Builder", icon: Sliders },
            {
              id: "violations",
              label: `Violations (${report?.totalViolations || 0})`,
              icon: AlertTriangle,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? "border-cyan-400 text-cyan-400 bg-cyan-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {report?.createdAt && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            Last Audited:{" "}
            <span className="text-slate-300 font-medium">
              {new Date(report.createdAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* TAB 1: QUALITY OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Quality Gauge & 4 Pillar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Overall Health Score Card */}
            <div className="lg:col-span-4 bg-gradient-to-b from-[#111827] to-[#0c1322] border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Overall Data Quality Index
              </span>

              {/* Radial Circle Representation */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border-8 border-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <span
                      className={`text-2xl font-extrabold tracking-tight ${getHealthScoreColor(report?.overallScore || 0)}`}
                    >
                      {report?.overallScore?.toFixed(1) || "0.0"}%
                    </span>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">
                      Health Score
                    </span>
                  </div>
                </div>
              </div>

              {report && (
                <div
                  className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full border ${getHealthScoreBadge(report.overallScore).bg}`}
                >
                  {getHealthScoreBadge(report.overallScore).label}
                </div>
              )}

              <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-xs">
                Evaluated against {report?.totalChecks || 0} checks with{" "}
                {report?.passedChecks || 0} passed assertions.
              </p>
            </div>

            {/* 4 Core Pillars Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Completeness */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Completeness
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {report?.completenessScore?.toFixed(1) || "0.0"}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${report?.completenessScore || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Measures presence of mandatory clinical values without missing
                  or null fields.
                </p>
              </div>

              {/* Validity */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Validity
                  </span>
                  <span className="text-xs font-bold text-cyan-400">
                    {report?.validityScore?.toFixed(1) || "0.0"}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${report?.validityScore || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Adherence to clinical standards (ICD-10-CM diagnosis codes,
                  10-digit NPIs, vitals).
                </p>
              </div>

              {/* Consistency */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Consistency
                  </span>
                  <span className="text-xs font-bold text-purple-400">
                    {report?.consistencyScore?.toFixed(1) || "0.0"}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${report?.consistencyScore || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Cross-field chronological logic (e.g. Admission date precedes
                  discharge, DOB in range).
                </p>
              </div>

              {/* Uniqueness */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Uniqueness
                  </span>
                  <span className="text-xs font-bold text-blue-400">
                    {report?.uniquenessScore?.toFixed(1) || "0.0"}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${report?.uniquenessScore || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Uniqueness of patient identifiers, MRNs, and encounter
                  records.
                </p>
              </div>
            </div>
          </div>

          {/* Violations Severity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => {
                setViolationSeverityFilter("CRITICAL");
                setActiveTab("violations");
              }}
              className="bg-[#13111c] border border-rose-500/20 p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-rose-500/40 transition"
            >
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-2xl font-bold text-rose-400">
                  {report?.criticalCount || 0}
                </span>
                <span className="block text-xs font-medium text-slate-400">
                  Critical Violations
                </span>
              </div>
            </div>

            <div
              onClick={() => {
                setViolationSeverityFilter("WARNING");
                setActiveTab("violations");
              }}
              className="bg-[#16141a] border border-amber-500/20 p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-amber-500/40 transition"
            >
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-2xl font-bold text-amber-400">
                  {report?.warningCount || 0}
                </span>
                <span className="block text-xs font-medium text-slate-400">
                  Clinical Warnings
                </span>
              </div>
            </div>

            <div
              onClick={() => {
                setViolationSeverityFilter("INFO");
                setActiveTab("violations");
              }}
              className="bg-[#0f172a] border border-blue-500/20 p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-blue-500/40 transition"
            >
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Info className="h-6 w-6" />
              </div>
              <div>
                <span className="text-2xl font-bold text-blue-400">
                  {report?.infoCount || 0}
                </span>
                <span className="block text-xs font-medium text-slate-400">
                  Informational Notices
                </span>
              </div>
            </div>
          </div>

          {/* Column Health Index Summary Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Dataset Columns Quality Summary
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Breakdown of column cardinality, missing percentage, and
                  health score.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("profiler")}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
              >
                Open Profiler <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Column Name</th>
                    <th className="px-5 py-3.5 font-medium">Data Type</th>
                    <th className="px-5 py-3.5 font-medium">Total Rows</th>
                    <th className="px-5 py-3.5 font-medium">Missing / Nulls</th>
                    <th className="px-5 py-3.5 font-medium">
                      Cardinality (Distinct)
                    </th>
                    <th className="px-5 py-3.5 font-medium text-right">
                      Health Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {report?.columnProfiles?.map((col) => (
                    <tr
                      key={col.columnName}
                      onClick={() => {
                        setSelectedColumnName(col.columnName);
                        setActiveTab("profiler");
                      }}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="px-5 py-3 font-semibold text-white font-sans">
                        {col.columnName}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {col.dataType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {col.totalCount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              col.nullPercentage > 10
                                ? "text-amber-400"
                                : "text-slate-400"
                            }
                          >
                            {col.nullCount} ({col.nullPercentage}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {col.distinctCount.toLocaleString()} ({col.uniquePct}%)
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-bold ${getHealthScoreColor(col.healthScore)}`}
                        >
                          {col.healthScore.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLUMN PROFILER & DISTRIBUTIONS */}
      {activeTab === "profiler" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Column Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {report?.columnProfiles?.map((col) => {
              const isSelected = col.columnName === selectedColumnName;
              return (
                <button
                  key={col.columnName}
                  onClick={() => setSelectedColumnName(col.columnName)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-500/10"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <span>{col.columnName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {col.dataType}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedColumnProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Column Stats Summary Card */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedColumnProfile.columnName}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Column Statistical Metrics
                    </span>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                    {selectedColumnProfile.dataType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">
                      Total Count
                    </span>
                    <span className="text-base font-bold text-white">
                      {selectedColumnProfile.totalCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">
                      Missing / Nulls
                    </span>
                    <span
                      className={`text-base font-bold ${
                        selectedColumnProfile.nullPercentage > 5
                          ? "text-amber-400"
                          : "text-slate-200"
                      }`}
                    >
                      {selectedColumnProfile.nullCount} (
                      {selectedColumnProfile.nullPercentage}%)
                    </span>
                  </div>
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">
                      Distinct Cardinality
                    </span>
                    <span className="text-base font-bold text-white">
                      {selectedColumnProfile.distinctCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">
                      Health Score
                    </span>
                    <span
                      className={`text-base font-bold ${getHealthScoreColor(selectedColumnProfile.healthScore)}`}
                    >
                      {selectedColumnProfile.healthScore.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Numeric Quartiles & Statistical Spread if available */}
                {selectedColumnProfile.mean !== undefined && (
                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Descriptive Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">Min</span>
                        <span className="text-white font-bold">
                          {selectedColumnProfile.min}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">Max</span>
                        <span className="text-white font-bold">
                          {selectedColumnProfile.max}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">Mean</span>
                        <span className="text-cyan-400 font-bold">
                          {selectedColumnProfile.mean}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">
                          Std Dev
                        </span>
                        <span className="text-slate-300">
                          {selectedColumnProfile.stdDev}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">
                          Median (Q50)
                        </span>
                        <span className="text-white font-bold">
                          {selectedColumnProfile.median}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-sans">
                          Interquartile (Q25-Q75)
                        </span>
                        <span className="text-slate-300">
                          {selectedColumnProfile.q25} -{" "}
                          {selectedColumnProfile.q75}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Distribution Histograms & Top Values */}
              <div className="lg:col-span-7 space-y-6">
                {/* Histogram Visualizer */}
                {selectedColumnProfile.histogram &&
                  selectedColumnProfile.histogram.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-white">
                            Value Distribution Histogram
                          </h4>
                          <span className="text-xs text-slate-400">
                            Frequency bins across records
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        {selectedColumnProfile.histogram.map((bin) => {
                          const maxCount = Math.max(
                            ...(selectedColumnProfile.histogram?.map(
                              (b) => b.count,
                            ) || [1]),
                          );
                          const barWidth =
                            maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
                          return (
                            <div key={bin.binLabel} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-300 font-sans">
                                  {bin.binLabel}
                                </span>
                                <span className="text-cyan-400 font-bold">
                                  {bin.count.toLocaleString()} rows
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Top Frequent Values */}
                {selectedColumnProfile.topValues &&
                  selectedColumnProfile.topValues.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-lg">
                      <h4 className="text-sm font-semibold text-white mb-4">
                        Top Frequent Values & Occurrences
                      </h4>
                      <div className="space-y-2.5">
                        {selectedColumnProfile.topValues.map((tv, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-slate-800/40 p-2.5 rounded-xl border border-slate-800"
                          >
                            <div className="flex items-center gap-2 max-w-[70%]">
                              <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-400">
                                {idx + 1}
                              </span>
                              <span className="text-slate-200 font-mono truncate">
                                {tv.value || "<Empty>"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">
                                {tv.count.toLocaleString()} rows
                              </span>
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[11px] border border-cyan-500/20">
                                {tv.pct}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No column profile data available.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CLINICAL RULE BUILDER */}
      {activeTab === "rules" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                Healthcare Clinical Validation Rules
              </h3>
              <p className="text-sm text-slate-400">
                Configure deterministic clinical constraints (ICD-10 regex, NPI
                Luhn checks, Vitals bounds, DOB rules).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                Reset Healthcare Defaults
              </button>
              <button
                onClick={() => setIsAddRuleOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
              >
                <Plus className="h-4 w-4" />
                Add Validation Rule
              </button>
            </div>
          </div>

          {/* Validation Rules Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Target Field</th>
                  <th className="px-5 py-3.5 font-medium">Rule Type</th>
                  <th className="px-5 py-3.5 font-medium">Severity</th>
                  <th className="px-5 py-3.5 font-medium">
                    Clinical Description
                  </th>
                  <th className="px-5 py-3.5 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-slate-800/40 transition"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`w-9 h-5 flex items-center rounded-full p-1 transition duration-300 ${
                          rule.isActive ? "bg-cyan-500" : "bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition duration-300 ${
                            rule.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-white font-mono">
                      {rule.fieldName}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-slate-800 text-cyan-300 border border-slate-700">
                        {rule.ruleType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          rule.severity === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : rule.severity === "WARNING"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 max-w-md">
                      {rule.description}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Rule Modal */}
          {isAddRuleOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-[#0f172a] border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Sliders className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">
                      Create Clinical Validation Rule
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAddRuleOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Preset Quick Templates */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Clinical Presets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        field: "diagnosis_code",
                        type: "HEALTHCARE_ICD10" as RuleType,
                        severity: "WARNING" as RuleSeverity,
                        desc: "ICD-10-CM format regex verification",
                        params: "{}",
                        label: "ICD-10 Code",
                      },
                      {
                        field: "provider_npi",
                        type: "HEALTHCARE_NPI" as RuleType,
                        severity: "WARNING" as RuleSeverity,
                        desc: "10-digit NPI with Luhn-80840 checksum",
                        params: "{}",
                        label: "NPI 10-Digit",
                      },
                      {
                        field: "systolic_bp",
                        type: "CLINICAL_VITALS" as RuleType,
                        severity: "WARNING" as RuleSeverity,
                        desc: "Systolic BP (50-250 mmHg)",
                        params:
                          '{"vitalType":"systolic_bp","min":50,"max":250}',
                        label: "Systolic BP",
                      },
                      {
                        field: "date_of_birth",
                        type: "HEALTHCARE_DOB" as RuleType,
                        severity: "CRITICAL" as RuleSeverity,
                        desc: "DOB past date & 0-125 age bounds",
                        params: "{}",
                        label: "Patient DOB",
                      },
                      {
                        field: "patient_id",
                        type: "REQUIRED_FIELD" as RuleType,
                        severity: "CRITICAL" as RuleSeverity,
                        desc: "Required non-null identifier",
                        params: "{}",
                        label: "Required Patient ID",
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePresetRuleSelect(preset)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddRule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Field Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. diagnosis_code, systolic_bp, patient_id"
                      value={newRuleField}
                      onChange={(e) => setNewRuleField(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Rule Type *
                      </label>
                      <select
                        value={newRuleType}
                        onChange={(e) =>
                          setNewRuleType(e.target.value as RuleType)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="REQUIRED_FIELD">
                          Required Non-Null Field
                        </option>
                        <option value="HEALTHCARE_ICD10">
                          ICD-10-CM Diagnosis Code
                        </option>
                        <option value="HEALTHCARE_NPI">
                          NPI 10-Digit (Luhn 80840)
                        </option>
                        <option value="HEALTHCARE_DOB">
                          Patient DOB (Age 0-125)
                        </option>
                        <option value="CLINICAL_VITALS">
                          Clinical Vitals Range
                        </option>
                        <option value="RANGE_CHECK">Numeric Range Check</option>
                        <option value="REGEX_FORMAT">
                          Custom Regex Format
                        </option>
                        <option value="ENUM_SET">
                          Allowed Value Set (Enum)
                        </option>
                        <option value="DATE_ORDER">
                          Date Chronology Order
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Severity *
                      </label>
                      <select
                        value={newRuleSeverity}
                        onChange={(e) =>
                          setNewRuleSeverity(e.target.value as RuleSeverity)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="CRITICAL">
                          CRITICAL (Blocks Pipelines)
                        </option>
                        <option value="WARNING">
                          WARNING (Clinical Advisory)
                        </option>
                        <option value="INFO">INFO (Notice)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Rule Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Systolic BP must be between 50 and 250 mmHg"
                      value={newRuleDesc}
                      onChange={(e) => setNewRuleDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Parameters (JSON configuration)
                    </label>
                    <input
                      type="text"
                      placeholder='e.g. {"min": 50, "max": 250} or {"pattern": "^[0-9]{5}$"}'
                      value={newRuleParams}
                      onChange={(e) => setNewRuleParams(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddRuleOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: VIOLATION EXPLORER */}
      {activeTab === "violations" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-white">
                  Row-Level Clinical Violations
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {violationsTotal || violations.length} total logged
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Detailed audit trail of records failing clinical validation
                rules with exact invalid values.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportViolations}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Download className="h-4 w-4 text-cyan-400" />
                Export Audit Report (CSV)
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              {["", "CRITICAL", "WARNING", "INFO"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setViolationSeverityFilter(sev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    violationSeverityFilter === sev
                      ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {sev === "" ? "All Severities" : sev}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search violations..."
                value={violationSearch}
                onChange={(e) => setViolationSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Violations Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Row #</th>
                  <th className="px-5 py-3.5 font-medium">Field</th>
                  <th className="px-5 py-3.5 font-medium">Rule Type</th>
                  <th className="px-5 py-3.5 font-medium">Severity</th>
                  <th className="px-5 py-3.5 font-medium">Invalid Value</th>
                  <th className="px-5 py-3.5 font-medium">
                    Clinical Error Explanation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredViolations.length > 0 ? (
                  filteredViolations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {v.rowNumber}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-white font-mono">
                        {v.fieldName}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {v.ruleType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            v.severity === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : v.severity === "WARNING"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {v.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono text-[11px]">
                          {v.invalidValue || "<NULL>"}
                        </code>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {v.message}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-emerald-400/60" />
                        <span>
                          No violations found for current filter criteria.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
