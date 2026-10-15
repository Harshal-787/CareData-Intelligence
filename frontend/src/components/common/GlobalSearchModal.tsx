import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Database,
  CheckCircle2,
  Users2,
  BarChart3,
  BrainCircuit,
  Bot,
  Activity,
  FileSpreadsheet,
  Settings,
  Shield,
  Building2,
  HardDrive,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  FileText,
  Play,
  Layers,
  Cpu,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: "PAGES" | "DATASETS" | "ACTIONS" | "SECURITY";
  icon: React.ElementType;
  path?: string;
  action?: () => void;
  badge?: string;
  keywords?: string[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin = false,
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Search catalog definition
  const searchCatalog: SearchItem[] = useMemo(() => {
    const baseItems: SearchItem[] = [
      // Navigation Pages
      {
        id: "nav-dashboard",
        title: isSuperAdmin ? "Platform Overview Dashboard" : "Executive Workspace Overview",
        subtitle: isSuperAdmin
          ? "Platform multi-tenant health, API metrics, and global statistics"
          : "Key clinical KPIs, encounters summary, and lakehouse storage status",
        category: "PAGES",
        icon: isSuperAdmin ? Activity : BarChart3,
        path: isSuperAdmin ? "/superadmin/dashboard" : "/dashboard",
        badge: "PAGE",
        keywords: ["home", "stats", "overview", "kpi"],
      },
      {
        id: "nav-datasets",
        title: "Datasets & Lakehouse Storage",
        subtitle: "Columnar Parquet lakehouse, MinIO buckets, and Snowflake connectors",
        category: "DATASETS",
        icon: Database,
        path: "/datasets",
        badge: "PARQUET",
        keywords: ["data", "tables", "files", "minio", "s3", "parquet"],
      },
      {
        id: "nav-quality",
        title: "Automated Data Quality Engine",
        subtitle: "9 automated integrity rules, schema validation, and health score (96.55%)",
        category: "PAGES",
        icon: CheckCircle2,
        path: "/quality",
        badge: "RULES",
        keywords: ["validation", "integrity", "health", "checks", "errors"],
      },
      {
        id: "nav-dedup",
        title: "Master Patient Index (MPI)",
        subtitle: "Fellegi-Sunter probabilistic record linkage and duplicate resolution",
        category: "PAGES",
        icon: Users2,
        path: "/deduplication",
        badge: "MPI",
        keywords: ["patient", "mrn", "matching", "fellegi", "sunter", "duplicates"],
      },
      {
        id: "nav-analytics",
        title: "Healthcare Analytics & OLAP",
        subtitle: "DuckDB-accelerated cohort slicing, readmission trends, and clinical KPIs",
        category: "PAGES",
        icon: BarChart3,
        path: "/analytics",
        badge: "DUCKDB",
        keywords: ["cohort", "metrics", "graphs", "charts", "encounters"],
      },
      {
        id: "nav-ml",
        title: "AI Risk Models & Predictions",
        subtitle: "Inpatient readmission risk, ICU transfer predictions, and clinical anomalies",
        category: "PAGES",
        icon: BrainCircuit,
        path: "/ml-predictions",
        badge: "ML",
        keywords: ["machine learning", "risk", "anomaly", "icu", "readmission"],
      },
      {
        id: "nav-ai",
        title: "Ask AI / Clinical Copilot",
        subtitle: "Gemini 3.6 Flash natural language to AST-validated SQL query studio",
        category: "PAGES",
        icon: Bot,
        path: "/ai-insights",
        badge: "GEMINI",
        keywords: ["copilot", "chat", "llm", "natural language", "gemini", "sql"],
      },
      {
        id: "nav-pipelines",
        title: "Pipeline Orchestrator",
        subtitle: "Redis consumer daemon, Snowflake sync jobs, and Parquet transformers",
        category: "PAGES",
        icon: Activity,
        path: "/pipelines",
        badge: "ORCHESTRATOR",
        keywords: ["jobs", "redis", "sync", "snowflake", "etl"],
      },
      {
        id: "nav-reports",
        title: "Clinical Audit & Compliance Reports",
        subtitle: "Generate HIPAA audit reports, CMS quality filings, and data exports",
        category: "PAGES",
        icon: FileSpreadsheet,
        path: "/reports",
        badge: "EXPORT",
        keywords: ["csv", "pdf", "compliance", "hipaa", "audit"],
      },

      // Lakehouse Parquet Datasets
      {
        id: "ds-encounters",
        title: "enterprise_clinical_lakehouse.parquet",
        subtitle: "1,200 Inpatient Encounters, 10,800 validated indicators (Active Parquet)",
        category: "DATASETS",
        icon: HardDrive,
        path: "/datasets",
        badge: "1,200 ROWS",
        keywords: ["lakehouse", "inpatient", "encounters", "parquet"],
      },
      {
        id: "ds-demographics",
        title: "demodata.parquet (Master Patient Registry)",
        subtitle: "Synthea clinical cohort with demographics, MRN, and insurance identifiers",
        category: "DATASETS",
        icon: FileText,
        path: "/datasets",
        badge: "PARQUET",
        keywords: ["demodata", "patients", "fhir", "registry"],
      },
      {
        id: "ds-snowflake",
        title: "snowflake_inpatient_sync (External Source)",
        subtitle: "Production EHR data mirrored from Snowflake staging schema",
        category: "DATASETS",
        icon: Layers,
        path: "/pipelines",
        badge: "EXTERNAL",
        keywords: ["snowflake", "warehouse", "mirror"],
      },

      // Executable Quick Actions
      {
        id: "action-quality-run",
        title: "Run Automated Data Quality Rules",
        subtitle: "Trigger 9 integrity checks across 10,800 data points in the lakehouse",
        category: "ACTIONS",
        icon: Play,
        path: "/quality",
        badge: "EXECUTE",
        keywords: ["run quality", "scan", "check rules"],
      },
      {
        id: "action-mpi-link",
        title: "Trigger MPI Record Linkage",
        subtitle: "Execute Fellegi-Sunter probabilistic deduplication on active records",
        category: "ACTIONS",
        icon: Users2,
        path: "/deduplication",
        badge: "EXECUTE",
        keywords: ["dedup", "linkage", "match"],
      },
      {
        id: "action-duckdb-query",
        title: "Launch DuckDB In-Memory SQL Query",
        subtitle: "Open DuckDB vectorized query console with AST safety filtering",
        category: "ACTIONS",
        icon: Cpu,
        path: "/analytics",
        badge: "ANALYTICS",
        keywords: ["query", "duckdb", "sql", "vectorized"],
      },

      // Security & System Settings
      {
        id: "sec-audit-logs",
        title: isSuperAdmin ? "Global Immutable Audit Ledger" : "Workspace Audit Logs",
        subtitle: "Cryptographic SHA-256 verifiable trail of access and data pipeline mutations",
        category: "SECURITY",
        icon: Shield,
        path: isSuperAdmin ? "/superadmin/audit-logs" : "/admin/audit-logs",
        badge: "SHA-256",
        keywords: ["security", "ledger", "hashes", "compliance", "audit"],
      },
      {
        id: "sec-settings",
        title: isSuperAdmin ? "Platform AI & Security Settings" : "Workspace Settings",
        subtitle: "Configure Gemini 3.6 Flash engine, temperature, and RBAC parameters",
        category: "SECURITY",
        icon: Settings,
        path: isSuperAdmin ? "/superadmin/settings" : "/settings",
        badge: "CONFIG",
        keywords: ["gemini", "ai settings", "tokens", "key", "config"],
      },
    ];

    if (isSuperAdmin) {
      baseItems.unshift(
        {
          id: "nav-orgs",
          title: "Organizations & Multi-Tenancy Hub",
          subtitle: "Provision healthcare tenants, configure quotas, and monitor data silos",
          category: "PAGES",
          icon: Building2,
          path: "/superadmin/organizations",
          badge: "TENANTS",
          keywords: ["tenants", "organizations", "clients", "hospital"],
        },
        {
          id: "nav-health",
          title: "Cluster Telemetry & Node Health",
          subtitle: "Go API gateway, Python DuckDB engine, Redis, MinIO S3 cluster health",
          category: "SECURITY",
          icon: Activity,
          path: "/superadmin/health",
          badge: "SYSTEM",
          keywords: ["nodes", "services", "health", "uptime", "redis", "minio"],
        }
      );
    }

    return baseItems;
  }, [isSuperAdmin]);

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    let items = searchCatalog;

    if (activeCategory !== "ALL") {
      items = items.filter((item) => item.category === activeCategory);
    }

    if (!query.trim()) {
      return items;
    }

    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchBadge = item.badge?.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchBadge || matchKeywords;
    });
  }, [searchCatalog, activeCategory, query]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveCategory("ALL");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation within modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelectItem(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeElement = resultsContainerRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  const handleSelectItem = (item: SearchItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: "ALL", label: "All Items" },
    { id: "PAGES", label: "Pages" },
    { id: "DATASETS", label: "Datasets" },
    { id: "ACTIONS", label: "Quick Actions" },
    { id: "SECURITY", label: "Security & Admin" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <Search className="size-5 text-cyan-600 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, lakehouse parquet, MPI rules, or type an action..."
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 mr-2 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto text-xs font-semibold scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-cyan-500 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent min-h-[260px] max-h-[420px]"
        >
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="size-12 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-3">
                <Search className="size-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                No matching results found
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No resources matched &ldquo;{query}&rdquo;. Try searching for &ldquo;encounters&rdquo;, &ldquo;quality&rdquo;, &ldquo;mpi&rdquo;, or &ldquo;gemini&rdquo;.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                    isSelected
                      ? "bg-cyan-50/70 border-cyan-200/80 shadow-2xs text-cyan-950"
                      : "border-transparent hover:bg-slate-50/80 text-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div
                      className={cn(
                        "size-9 rounded-xl grid place-items-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-cyan-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold truncate">{item.title}</p>
                        {item.badge && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider",
                              isSelected
                                ? "bg-cyan-200/70 text-cyan-900"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-white px-2 py-0.5 rounded-md border border-cyan-200">
                        Jump <CornerDownLeft className="size-3" />
                      </span>
                    )}
                    <ArrowRight
                      className={cn(
                        "size-4 text-slate-300 transition-transform",
                        isSelected && "text-cyan-600 translate-x-0.5"
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-2xs">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-2xs">
                ↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-2xs">
                ↵
              </kbd>{" "}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-2xs">
                ESC
              </kbd>{" "}
              Close
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-semibold">
            <Sparkles className="size-3 text-cyan-500" />
            <span>CareData Intelligence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
