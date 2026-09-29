import React, { useState, useEffect } from "react";
import {
  Users2,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Search,
  Sliders,
  Database,
  Sparkles,
  Layers,
  FileCheck,
  Check,
  X,
  ChevronDown,
  UserCheck,
  SlidersHorizontal,
} from "lucide-react";
import { fetchDatasets, generateSampleDataset } from "../../api/datasets";
import {
  fetchDuplicateStats,
  fetchDuplicatePairs,
  runDeduplicationAudit,
  resolveDuplicatePair,
  bulkResolveDuplicates,
  fetchMPIRecords,
  clearDedupeData,
} from "../../api/dedupeApi";
import { Dataset } from "../../types/dataset";
import {
  DuplicatePair,
  DeduplicationStats,
  GoldenRecord,
  DemographicWeights,
} from "../../types/dedupe";

export const DeduplicationPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"queue" | "mpi" | "tuning">("queue");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [confidenceTier, setConfidenceTier] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [totalPairs, setTotalPairs] = useState<number>(0);
  const [stats, setStats] = useState<DeduplicationStats | null>(null);
  const [mpiRecords, setMpiRecords] = useState<GoldenRecord[]>([]);
  const [totalMpi, setTotalMpi] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [runningDedupe, setRunningDedupe] = useState<boolean>(false);
  const [generatingSample, setGeneratingSample] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [bulkResolving, setBulkResolving] = useState<boolean>(false);
  const [clearingData, setClearingData] = useState<boolean>(false);

  // Merge / Golden Record Modal State
  const [activeModalPair, setActiveModalPair] = useState<DuplicatePair | null>(null);
  const [selectedSurvivorFields, setSelectedSurvivorFields] = useState<Record<string, "A" | "B" | "custom">>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  // Algorithm Tuning State
  const [threshold, setThreshold] = useState<number>(0.75);
  const [blockingStrategy, setBlockingStrategy] = useState<string>("SOUNDEX_LASTNAME");
  const [weights, setWeights] = useState<DemographicWeights>({
    firstNameWeight: 0.20,
    lastNameWeight: 0.25,
    dobWeight: 0.25,
    phoneWeight: 0.10,
    addressWeight: 0.10,
    mrnWeight: 0.05,
    genderWeight: 0.05,
    emailWeight: 0.05,
  });

  // Load Initial Datasets
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const dsList = await fetchDatasets();
        const safeList = Array.isArray(dsList) ? dsList : [];
        const readyDs = safeList.filter((d) => d && d.status === "READY");
        setDatasets(readyDs);
        if (readyDs.length > 0) {
          setSelectedDatasetId(readyDs[0].id);
        } else {
          // If no datasets exist yet, load global dedupe data safely
          await loadDedupeData("");
        }
      } catch (err) {
        console.error("Failed to load datasets:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Reload data when dataset or filters change
  useEffect(() => {
    loadDedupeData(selectedDatasetId);
  }, [selectedDatasetId, statusFilter, confidenceTier, searchQuery, activeTab]);

  const loadDedupeData = async (datasetId?: string) => {
    const targetDsId = datasetId !== undefined ? datasetId : selectedDatasetId;
    try {
      setLoading(true);

      let minConf: number | undefined = undefined;
      let maxConf: number | undefined = undefined;
      if (confidenceTier === "HIGH") {
        minConf = 0.90;
      } else if (confidenceTier === "MED") {
        minConf = 0.75;
        maxConf = 0.899;
      } else if (confidenceTier === "LOW") {
        maxConf = 0.749;
      }

      const [statsData, pairsData, mpiData] = await Promise.all([
        fetchDuplicateStats(targetDsId || undefined),
        fetchDuplicatePairs({
          datasetId: targetDsId || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          minConfidence: minConf,
          maxConfidence: maxConf,
          search: searchQuery || undefined,
        }),
        fetchMPIRecords(targetDsId || undefined),
      ]);

      setStats(statsData || {
        totalCandidatePairs: 0,
        pendingReviewCount: 0,
        mergedCount: 0,
        distinctCount: 0,
        avgConfidence: 0,
        highConfidenceCount: 0,
        medConfidenceCount: 0,
        lowConfidenceCount: 0,
      });
      setPairs(pairsData?.pairs || []);
      setTotalPairs(pairsData?.total || 0);
      setMpiRecords(mpiData?.records || []);
      setTotalMpi(mpiData?.total || 0);
    } catch (err) {
      console.error("Failed to fetch deduplication data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSample = async () => {
    try {
      setGeneratingSample(true);
      const newDs = await generateSampleDataset("demographics");
      const dsList = await fetchDatasets();
      const safeList = Array.isArray(dsList) ? dsList : [];
      const readyDs = safeList.filter((d) => d && d.status === "READY");
      setDatasets(readyDs);
      setSelectedDatasetId(newDs.id);
      await loadDedupeData(newDs.id);
    } catch (err) {
      console.error("Failed to generate sample demographics dataset:", err);
    } finally {
      setGeneratingSample(false);
    }
  };

  const handleRunDeduplication = async () => {
    if (!selectedDatasetId) return;
    try {
      setRunningDedupe(true);
      const res = await runDeduplicationAudit(selectedDatasetId, {
        confidenceThreshold: threshold,
        blockingStrategy,
        weights,
      });
      setStats(res.stats);
      setPairs(res.pairs);
      setTotalPairs(res.total);
      setActiveTab("queue");
      setStatusFilter("PENDING");
    } catch (err) {
      console.error("Deduplication analysis failed:", err);
    } finally {
      setRunningDedupe(false);
    }
  };

  const handleClearData = async () => {
    if (!selectedDatasetId) return;
    if (!window.confirm("Are you sure you want to permanently delete all deduplication data and MPI records for this dataset?")) return;
    try {
      setClearingData(true);
      await clearDedupeData(selectedDatasetId);
      await loadDedupeData();
    } catch (err) {
      console.error("Failed to clear dedupe data:", err);
    } finally {
      setClearingData(false);
    }
  };

  const handleQuickMerge = async (pair: DuplicatePair) => {
    try {
      setResolvingId(pair.id);
      await resolveDuplicatePair(pair.id, {
        action: "MERGED",
        survivorRecordId: pair.recordAId,
        resolutionNotes: "Quick merged via automated survivor priority (Record A primary)",
      });
      await loadDedupeData();
    } catch (err) {
      console.error("Merge failed:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleMarkDistinct = async (pair: DuplicatePair) => {
    try {
      setResolvingId(pair.id);
      await resolveDuplicatePair(pair.id, {
        action: "DISTINCT",
        resolutionNotes: "Marked as distinct patient entity (False Positive)",
      });
      await loadDedupeData();
    } catch (err) {
      console.error("Mark distinct failed:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleBulkMergeHighConfidence = async () => {
    if (!window.confirm("Are you sure you want to bulk merge all candidates with ≥90% confidence into Golden Records?")) {
      return;
    }
    try {
      setBulkResolving(true);
      await bulkResolveDuplicates({
        minConfidence: 0.90,
        action: "MERGED",
        resolutionNotes: "Bulk auto-merge for high confidence demographic matches (≥90%)",
      });
      await loadDedupeData();
    } catch (err) {
      console.error("Bulk merge failed:", err);
    } finally {
      setBulkResolving(false);
    }
  };

  // Open Custom Golden Record Builder Modal
  const openMergeModal = (pair: DuplicatePair) => {
    setActiveModalPair(pair);
    // Initialize field selections: default to Record A
    const recA = pair.recordAData || {};
    const recB = pair.recordBData || {};
    const allKeys = Array.from(new Set([...Object.keys(recA), ...Object.keys(recB)]));
    const initialSelections: Record<string, "A" | "B" | "custom"> = {};
    const initialCustoms: Record<string, string> = {};

    allKeys.forEach((key) => {
      const valA = recA[key];
      const valB = recB[key];
      if (valA !== undefined && valA !== null && String(valA).trim() !== "") {
        initialSelections[key] = "A";
      } else if (valB !== undefined && valB !== null && String(valB).trim() !== "") {
        initialSelections[key] = "B";
      } else {
        initialSelections[key] = "A";
      }
      initialCustoms[key] = String(valA || valB || "");
    });

    setSelectedSurvivorFields(initialSelections);
    setCustomFieldValues(initialCustoms);
    setResolutionNotes(`Consolidated patient record from ${pair.recordAId} and ${pair.recordBId}`);
  };

  const handleConfirmMergeModal = async () => {
    if (!activeModalPair) return;
    const recA = activeModalPair.recordAData || {};
    const recB = activeModalPair.recordBData || {};

    // Build consolidated golden record payload
    const goldenRecordData: Record<string, any> = {};
    Object.keys(selectedSurvivorFields).forEach((key) => {
      const choice = selectedSurvivorFields[key];
      if (choice === "A") {
        goldenRecordData[key] = recA[key];
      } else if (choice === "B") {
        goldenRecordData[key] = recB[key];
      } else {
        goldenRecordData[key] = customFieldValues[key];
      }
    });

    try {
      setResolvingId(activeModalPair.id);
      await resolveDuplicatePair(activeModalPair.id, {
        action: "MERGED",
        survivorRecordId: activeModalPair.recordAId,
        goldenRecordData,
        resolutionNotes,
      });
      setActiveModalPair(null);
      await loadDedupeData();
    } catch (err) {
      console.error("Custom merge failed:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 0.90) return "bg-emerald-100 text-emerald-600 border-emerald-200";
    if (score >= 0.75) return "bg-amber-100 text-amber-600 border-amber-200";
    return "bg-rose-100 text-rose-600 border-rose-200";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. Header & Dataset Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 backdrop-blur-xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-200 rounded-2xl text-cyan-600 shadow-inner">
            <Users2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Record Linkage & Deduplication</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase bg-cyan-100 border border-cyan-200 text-cyan-600 rounded-full">
                Phase 4 Engine
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Multi-attribute demographic fuzzy matching, candidate pair resolution, and Master Patient Index (MPI) consolidation.
            </p>
          </div>
        </div>

        {/* Dataset Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {datasets.length === 0 ? (
            <button
              onClick={handleGenerateSample}
              disabled={generatingSample}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold rounded-2xl shadow-sm shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generatingSample ? 'animate-spin' : ''}`} />
              <span>{generatingSample ? "Creating Demo Feed..." : "Generate Demo Dataset"}</span>
            </button>
          ) : (
            <div className="relative min-w-[240px]">
              <Database className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 appearance-none cursor-pointer transition-all"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.totalRecords.toLocaleString()} rows)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={handleClearData}
            disabled={clearingData || !selectedDatasetId}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600 text-sm font-semibold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {clearingData ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            <span>Clear Data</span>
          </button>

          <button
            onClick={handleRunDeduplication}
            disabled={runningDedupe || !selectedDatasetId}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-2xl shadow-sm shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {runningDedupe ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Analyzing Demographics...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Deduplication</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Candidates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 backdrop-blur-sm relative overflow-hidden group hover:border-slate-200 transition-all">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Candidate Pairs</span>
            <Layers className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats ? stats.totalCandidatePairs.toLocaleString() : "0"}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Total potential duplicates</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 backdrop-blur-sm relative overflow-hidden group hover:border-slate-200 transition-all">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Pending Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600 tracking-tight">
            {stats ? stats.pendingReviewCount.toLocaleString() : "0"}
          </div>
          <div className="mt-2 text-xs text-amber-600/80 flex items-center gap-1.5">
            <span>Requires steward action</span>
          </div>
        </div>

        {/* Merged / Master Patient Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 backdrop-blur-sm relative overflow-hidden group hover:border-slate-200 transition-all">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Merged (MPI)</span>
            <GitMerge className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 tracking-tight">
            {stats ? stats.mergedCount.toLocaleString() : "0"}
          </div>
          <div className="mt-2 text-xs text-emerald-600/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Golden records created</span>
          </div>
        </div>

        {/* Distinct / False Positives */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 backdrop-blur-sm relative overflow-hidden group hover:border-slate-200 transition-all">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Distinct (Verified)</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-blue-600 tracking-tight">
            {stats ? stats.distinctCount.toLocaleString() : "0"}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Marked as separate patients</span>
          </div>
        </div>

        {/* Avg Match Confidence */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 backdrop-blur-sm relative overflow-hidden group hover:border-slate-200 transition-all">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Avg Match Score</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-purple-600 tracking-tight">
            {stats ? `${(stats.avgConfidence * 100).toFixed(1)}%` : "0.0%"}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold">{stats?.highConfidenceCount || 0} High</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{stats?.medConfidenceCount || 0} Med</span>
          </div>
        </div>
      </div>

      {/* 3. Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "queue"
                ? "bg-slate-50 text-cyan-600 border border-slate-200 shadow-sm"
                : "text-slate-400 hover:text-slate-700 hover:bg-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Duplicate Pairs Queue ({totalPairs})</span>
            {stats && stats.pendingReviewCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-200">
                {stats.pendingReviewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("mpi")}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "mpi"
                ? "bg-slate-50 text-cyan-600 border border-slate-200 shadow-sm"
                : "text-slate-400 hover:text-slate-700 hover:bg-white"
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>Master Patient Index (MPI)</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200">
              {totalMpi}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("tuning")}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "tuning"
                ? "bg-slate-50 text-cyan-600 border border-slate-200 shadow-sm"
                : "text-slate-400 hover:text-slate-700 hover:bg-white"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Algorithm & Tuning</span>
          </button>
        </div>

        {activeTab === "queue" && stats && stats.highConfidenceCount > 0 && (
          <button
            onClick={handleBulkMergeHighConfidence}
            disabled={bulkResolving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-600 text-xs font-semibold rounded-2xl transition-all cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Bulk Merge High-Confidence (≥90%)</span>
          </button>
        )}
      </div>

      {/* 4. Tab 1: DUPLICATE PAIRS QUEUE */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
              {(["PENDING", "MERGED", "DISTINCT", "ALL"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-slate-50 text-cyan-600 shadow-sm border border-slate-200"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {st === "PENDING" && "Pending Review"}
                  {st === "MERGED" && "Merged"}
                  {st === "DISTINCT" && "Distinct"}
                  {st === "ALL" && "All Statuses"}
                </button>
              ))}
            </div>

            {/* Search & Confidence Tier */}
            <div className="flex items-center gap-3">
              {/* Confidence Select */}
              <div className="relative">
                <select
                  value={confidenceTier}
                  onChange={(e) => setConfidenceTier(e.target.value)}
                  className="pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer"
                >
                  <option value="ALL">All Confidence Tiers</option>
                  <option value="HIGH">High (≥ 90%)</option>
                  <option value="MED">Medium (75% - 89%)</option>
                  <option value="LOW">Low (&lt; 75%)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient name, MRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Pairs List */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RotateCcw className="w-8 h-8 animate-spin mx-auto text-cyan-600 mb-3" />
              <p className="font-medium text-sm">Loading candidate duplicate records...</p>
            </div>
          ) : pairs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <UserCheck className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600">No duplicate candidates found</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                {statusFilter === "PENDING"
                  ? "All demographic pairs have been reviewed or no duplicates were identified above the confidence threshold."
                  : "No records match the current status and search filters."}
              </p>
              <button
                onClick={handleRunDeduplication}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-2xl border border-slate-200 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-run Deduplication Scan</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {pairs.map((pair) => {
                const confPct = Math.round(pair.confidenceScore * 100);
                const isResolving = resolvingId === pair.id;

                return (
                  <div
                    key={pair.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-200 transition-all p-6 backdrop-blur-md shadow-sm"
                  >
                    {/* Pair Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm font-bold rounded-2xl border ${getConfidenceBadgeColor(pair.confidenceScore)}`}>
                          {confPct}% Match Confidence
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {pair.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md border ${
                            pair.status === "PENDING"
                              ? "bg-amber-100 text-amber-600 border-amber-200"
                              : pair.status === "MERGED"
                              ? "bg-emerald-100 text-emerald-600 border-emerald-200"
                              : "bg-blue-100 text-blue-600 border-blue-200"
                          }`}
                        >
                          {pair.status}
                        </span>
                      </div>

                      {/* Action Controls */}
                      {pair.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openMergeModal(pair)}
                            disabled={isResolving}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Merge & Build Golden Record</span>
                          </button>

                          <button
                            onClick={() => handleQuickMerge(pair)}
                            disabled={isResolving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-emerald-600 text-xs font-medium rounded-lg border border-slate-200 transition-all cursor-pointer"
                            title="Quick merge keeping Record A primary"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Quick Merge</span>
                          </button>

                          <button
                            onClick={() => handleMarkDistinct(pair)}
                            disabled={isResolving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-rose-300 text-xs font-medium rounded-lg border border-slate-200 transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Mark Distinct</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            Resolved: <strong className="text-slate-700">{pair.status}</strong> {pair.resolvedBy && `by ${pair.resolvedBy}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Side-by-Side Patient Demographic Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
                      {/* Record A */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-xs font-bold flex items-center justify-center border border-cyan-200">
                              A
                            </span>
                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                              Record A ({pair.recordAId})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">Source Feed 1</span>
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          {Object.entries(pair.recordAData || {}).slice(0, 7).map(([k, v]) => {
                            const valStr = String(v ?? "—");
                            const valBStr = String((pair.recordBData || {})[k] ?? "—");
                            const isMatch = valStr.toLowerCase() === valBStr.toLowerCase();

                            return (
                              <div key={k} className="flex items-start justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400 capitalize font-medium">{k.replace(/_/g, " ")}:</span>
                                <span className={`font-mono text-right max-w-[240px] truncate ${isMatch ? "text-slate-700" : "text-amber-300 font-semibold"}`}>
                                  {valStr}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Record B */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 text-xs font-bold flex items-center justify-center border border-blue-200">
                              B
                            </span>
                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                              Record B ({pair.recordBId})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">Source Feed 2</span>
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          {Object.entries(pair.recordBData || {}).slice(0, 7).map(([k, v]) => {
                            const valStr = String(v ?? "—");
                            const valAStr = String((pair.recordAData || {})[k] ?? "—");
                            const isMatch = valStr.toLowerCase() === valAStr.toLowerCase();

                            return (
                              <div key={k} className="flex items-start justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400 capitalize font-medium">{k.replace(/_/g, " ")}:</span>
                                <span className={`font-mono text-right max-w-[240px] truncate ${isMatch ? "text-slate-700" : "text-amber-300 font-semibold"}`}>
                                  {valStr}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Field-by-Field Similarity Breakdown */}
                    {pair.fieldScores && pair.fieldScores.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Demographic Match Breakdown:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {pair.fieldScores.map((fs, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                fs.score >= 90
                                  ? "bg-emerald-100 text-emerald-300 border-emerald-200"
                                  : fs.score >= 75
                                  ? "bg-amber-100 text-amber-300 border-amber-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}
                            >
                              <span>{fs.fieldName}:</span>
                              <strong className="font-mono">{fs.score}%</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: MASTER PATIENT INDEX (MPI) */}
      {activeTab === "mpi" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-emerald-600" />
                  <span>Consolidated Master Patient Index (MPI)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Single source-of-truth golden records synthesized from merged duplicate clinical records.
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full">
                {totalMpi} Golden Records
              </span>
            </div>

            {mpiRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileCheck className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="font-semibold text-sm text-slate-600">No Golden Records have been created yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Review and merge duplicate candidate pairs in the Queue to generate verified Master Patient Index entries.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {mpiRecords.map((mpi) => (
                  <div key={mpi.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-cyan-100 text-cyan-600 border border-cyan-200 rounded-lg">
                          {mpi.masterPatientId}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {(mpi.consolidatedData || {}).first_name || (mpi.consolidatedData || {}).name || "Patient"} {(mpi.consolidatedData || {}).last_name || ""}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                        <span>Created by: {mpi.createdBy || "System"}</span>
                        <span>•</span>
                        <span>Linked IDs: [{(mpi.sourceRecordIds || []).join(", ")}]</span>
                      </div>
                    </div>

                    {/* Consolidated Demographic Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                      {Object.entries(mpi.consolidatedData || {}).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                            {k.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-slate-700 truncate block mt-0.5 font-medium">
                            {String(v ?? "—")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab 3: ALGORITHM & WEIGHTS TUNING */}
      {activeTab === "tuning" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 backdrop-blur-md">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-cyan-600" />
              <span>Demographic Matching Algorithm & Blocking Strategy</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure phonetic blocking strategies and relative demographic attribute weights for Jaro-Winkler and Soundex scoring.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
              {/* Left: Blocking Strategy & Confidence Threshold */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Minimum Match Confidence Threshold: {(threshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>50% (Broad Recall)</span>
                    <span>75% (Balanced)</span>
                    <span>95% (High Precision)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Multi-Attribute Blocking Strategy
                  </label>
                  <select
                    value={blockingStrategy}
                    onChange={(e) => setBlockingStrategy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="SOUNDEX_LASTNAME">Soundex(Last Name) + Birth Year (Recommended)</option>
                    <option value="BIRTH_YEAR">Exact Birth Year + First Initial</option>
                    <option value="FIRST_INITIAL_ZIP">First Initial + Last Initial + Zip Code</option>
                    <option value="ALL">Exhaustive Pairwise Scan (N*(N-1)/2)</option>
                  </select>
                </div>
              </div>

              {/* Right: Demographic Weights Sliders */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Attribute Relative Weights:
                </h4>

                <div className="space-y-3 text-xs">
                  {[
                    { label: "Last Name (Soundex + Jaro-Winkler)", key: "lastNameWeight", val: weights.lastNameWeight },
                    { label: "First Name (Jaro-Winkler)", key: "firstNameWeight", val: weights.firstNameWeight },
                    { label: "Date of Birth (Transposition Tolerance)", key: "dobWeight", val: weights.dobWeight },
                    { label: "Phone Number (Normalized Digits)", key: "phoneWeight", val: weights.phoneWeight },
                    { label: "Address & Street (Token Sort Ratio)", key: "addressWeight", val: weights.addressWeight },
                    { label: "Medical Record Number (MRN / ID)", key: "mrnWeight", val: weights.mrnWeight },
                  ].map((attr) => (
                    <div key={attr.key} className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>{attr.label}</span>
                        <strong className="text-cyan-600 font-mono">{(attr.val * 100).toFixed(0)}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.50"
                        step="0.05"
                        value={attr.val}
                        onChange={(e) =>
                          setWeights((prev) => ({
                            ...prev,
                            [attr.key]: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer h-1.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleRunDeduplication}
                disabled={runningDedupe}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-900 text-xs font-semibold rounded-2xl transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Save & Execute Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Golden Record / Survivor Selection Modal */}
      {activeModalPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg border border-emerald-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Master Patient Index Golden Record Builder</h3>
                  <p className="text-xs text-slate-400">
                    Select survivor attributes from Record A or Record B to synthesize the consolidated patient profile.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalPair(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Field Picker Table */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="col-span-3">Attribute</span>
                <span className="col-span-4">Record A Value</span>
                <span className="col-span-4">Record B Value</span>
                <span className="col-span-1 text-right">Choice</span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {Object.keys(selectedSurvivorFields).map((fieldName) => {
                  const recA = activeModalPair.recordAData || {};
                  const recB = activeModalPair.recordBData || {};
                  const valA = String(recA[fieldName] ?? "—");
                  const valB = String(recB[fieldName] ?? "—");
                  const choice = selectedSurvivorFields[fieldName];

                  return (
                    <div
                      key={fieldName}
                      className={`grid grid-cols-12 items-center text-xs p-3 rounded-2xl border transition-all ${
                        choice === "A"
                          ? "bg-slate-50 border-cyan-500/40"
                          : "bg-slate-50 border-blue-500/40"
                      }`}
                    >
                      <span className="col-span-3 font-semibold text-slate-700 capitalize">
                        {fieldName.replace(/_/g, " ")}
                      </span>

                      {/* Option A */}
                      <div
                        onClick={() => setSelectedSurvivorFields((prev) => ({ ...prev, [fieldName]: "A" }))}
                        className={`col-span-4 font-mono truncate px-2 py-1 rounded cursor-pointer transition-all ${
                          choice === "A" ? "text-cyan-700 font-bold bg-cyan-950/50" : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {valA}
                      </div>

                      {/* Option B */}
                      <div
                        onClick={() => setSelectedSurvivorFields((prev) => ({ ...prev, [fieldName]: "B" }))}
                        className={`col-span-4 font-mono truncate px-2 py-1 rounded cursor-pointer transition-all ${
                          choice === "B" ? "text-blue-300 font-bold bg-blue-950/50" : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {valB}
                      </div>

                      {/* Pill Badge */}
                      <div className="col-span-1 text-right">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            choice === "A"
                              ? "bg-cyan-100 text-cyan-700 border border-cyan-200"
                              : "bg-blue-500/20 text-blue-300 border border-blue-200"
                          }`}
                        >
                          {choice}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolution Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Resolution Notes / Audit Justification
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={2}
                placeholder="Add explanation for this merge..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setActiveModalPair(null)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMergeModal}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold rounded-2xl shadow-sm transition-all cursor-pointer"
              >
                Confirm & Create Golden Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DeduplicationPage;
