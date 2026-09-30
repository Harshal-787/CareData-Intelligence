import React, { useEffect, useState } from "react";
import {
  Activity,
  CreditCard,
  ShieldAlert,
  Settings,
  Server,
  Database,
  ActivitySquare,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import api from "../../api/client";
import { cn } from "../../lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const healthData = [
  { time: "10:00", latency: 45, requests: 1200 },
  { time: "10:05", latency: 42, requests: 1350 },
  { time: "10:10", latency: 48, requests: 1100 },
  { time: "10:15", latency: 55, requests: 1450 },
  { time: "10:20", latency: 43, requests: 1250 },
  { time: "10:25", latency: 59, requests: 1600 },
  { time: "10:30", latency: 45, requests: 1300 },
];

export const SystemHealth: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("OVERVIEW");
  const [sysHealth, setSysHealth] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get("/system/health");
        setSysHealth(res.data);
      } catch (err) {
        console.error("Failed to fetch system health:", err);
      }
    };
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0h 0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Infrastructure Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global monitoring for backend services and core databases.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(["OVERVIEW"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Server className="size-32 text-cyan-600" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Server className="size-4 text-cyan-500" /> API Gateway
                </h3>
                <span
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1",
                    sysHealth?.status === "HEALTHY"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600",
                  )}
                >
                  {sysHealth?.status === "HEALTHY" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <AlertTriangle className="size-3" />
                  )}
                  {sysHealth?.status || "OFFLINE"}
                </span>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Uptime</span>
                  <span className="font-semibold text-slate-900">
                    {formatUptime(sysHealth?.uptimeSeconds)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Goroutines</span>
                  <span className="font-semibold text-emerald-500">
                    {sysHealth?.routines || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sys Memory</span>
                  <span className="font-semibold text-slate-900">
                    {sysHealth
                      ? (sysHealth.memory.sysBytes / 1024 / 1024).toFixed(1) +
                        " MB"
                      : "0 MB"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Database className="size-32 text-indigo-600" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Database className="size-4 text-indigo-500" /> Database
                  Cluster
                </h3>
                <span
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1",
                    sysHealth?.database?.status === "ONLINE"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600",
                  )}
                >
                  {sysHealth?.database?.status === "ONLINE" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <AlertTriangle className="size-3" />
                  )}
                  {sysHealth?.database?.status || "UNKNOWN"}
                </span>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Active Connections</span>
                  <span className="font-semibold text-slate-900">
                    124 / 500
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Query Latency</span>
                  <span className="font-semibold text-slate-900">
                    {sysHealth?.database?.latencyMs || 0}ms
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Storage Used</span>
                  <span className="font-semibold text-slate-900">
                    45% (1.2TB)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ActivitySquare className="size-32 text-rose-600" />
              </div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <ActivitySquare className="size-4 text-rose-500" /> ML Engine
                </h3>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <AlertTriangle className="size-3" /> DEGRADED
                </span>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GPU Utilization</span>
                  <span className="font-semibold text-amber-500">92%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Queue Depth</span>
                  <span className="font-semibold text-slate-900">450 jobs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Inference Time</span>
                  <span className="font-semibold text-rose-500">
                    4.2s / doc
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="size-4 text-cyan-500" /> API Latency
                Timeline
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={healthData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorLatency"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#06b6d4"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#06b6d4"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="latency"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorLatency)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" /> Active
                Incidents & Alerts
              </h3>
              <div className="flex-1 flex flex-col justify-center items-center py-2">
                <div className="w-full space-y-4">
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900 text-sm">
                        Elevated ML Inference Latency
                      </p>
                      <p className="text-amber-700/80 text-xs mt-1">
                        GPU clusters are experiencing high utilization.
                        Auto-scaling policy triggered.
                      </p>
                      <p className="text-amber-500 font-mono text-[10px] mt-2 font-bold uppercase">
                        Active for 14 mins
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-700 text-sm">
                        Database Clusters Nominal
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        All primary and read-replica nodes are operating within
                        normal parameters.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== "OVERVIEW" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-slate-50 p-6 rounded-full mb-4 border border-slate-100 shadow-inner">
            <Activity className="size-12 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">
            Detailed {activeTab.toLowerCase()} metrics coming soon
          </h2>
          <p className="text-slate-500 mt-2 max-w-md text-sm">
            We are integrating Prometheus and Grafana for deeper observability
            into this section. Expected release next sprint.
          </p>
        </div>
      )}
    </div>
  );
};

export const GlobalAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get("/audit-logs");
        setLogs(res.data || []);
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Security & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Immutable platform-wide ledger of authentication, tenant
            provisioning, and system access events.
          </p>
        </div>
        <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm uppercase tracking-wider w-max">
          <Lock className="size-3.5 text-emerald-400" /> Zero PHI Exposure
          (HIPAA Compliant)
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Identity / User</th>
                <th className="px-6 py-4">Target Resource</th>
                <th className="px-6 py-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      <p className="text-sm font-medium">
                        Fetching secure audit trail...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <ShieldAlert className="size-6" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        No recent audit events found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.slice(0, 50).map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[10px] tracking-wide">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {log.userEmail || "System"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400 text-right">
                      {log.ipAddress || "Internal"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const BillingSubscriptions: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="bg-cyan-50 p-6 rounded-3xl mb-4 border border-cyan-100 shadow-sm">
      <CreditCard className="size-10 text-cyan-600" />
    </div>
    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
      Stripe Billing Integration
    </h2>
    <p className="text-slate-500 mt-2 max-w-md">
      Global tenant subscription management and MRR tracking interface is
      scheduled for Q4 release.
    </p>
  </div>
);

export const PlatformSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "GENERAL" | "SECURITY" | "AI_MODELS" | "INTEGRATIONS"
  >("GENERAL");
  const [saveStatus, setSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED">(
    "IDLE",
  );
  const [settings, setSettings] = useState<any>({
    platformName: "CareData Intelligence Core",
    supportEmail: "support@caredata.ai",
    maintenanceMode: false,
    enforce2FAGlobally: false,
    sessionTimeoutMins: 30,
    geminiAPIKey: "",
    defaultLLMModel: "gemini-1.5-pro",
    llmTemperature: 0.2,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/system/settings");
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaveStatus("SAVING");
    try {
      await api.put("/system/settings", settings);
      setSaveStatus("SAVED");
      setTimeout(() => setSaveStatus("IDLE"), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSaveStatus("IDLE");
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Platform Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Manage global settings, security policies, AI model endpoints, and
            integrations across all tenants.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === "SAVING"}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saveStatus === "SAVING" ? (
            <>
              <div className="size-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />{" "}
              Saving...
            </>
          ) : saveStatus === "SAVED" ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-400" /> Saved
            </>
          ) : (
            <>Save Changes</>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {[
            {
              id: "GENERAL",
              label: "General Settings",
              icon: Settings,
              desc: "Platform branding & maintenance",
            },
            {
              id: "SECURITY",
              label: "Security & Auth",
              icon: ShieldAlert,
              desc: "2FA, SSO, and session policies",
            },
            {
              id: "AI_MODELS",
              label: "AI Models & Keys",
              icon: ActivitySquare,
              desc: "LLM endpoints & credentials",
            },
            {
              id: "INTEGRATIONS",
              label: "Third-Party Integrations",
              icon: CreditCard,
              desc: "Stripe, Snowflake, etc.",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl transition-all text-left border",
                activeTab === tab.id
                  ? "bg-white border-slate-200 shadow-sm shadow-slate-200/50"
                  : "bg-transparent border-transparent hover:bg-slate-100",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 rounded-lg p-2 transition-colors",
                  activeTab === tab.id
                    ? "bg-cyan-50 text-cyan-600"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                <tab.icon className="size-4" />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-bold",
                    activeTab === tab.id ? "text-slate-900" : "text-slate-700",
                  )}
                >
                  {tab.label}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                  {tab.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === "GENERAL" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4">
                  Platform Identity
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={settings.platformName}
                      onChange={(e) =>
                        updateSetting("platformName", e.target.value)
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) =>
                        updateSetting("supportEmail", e.target.value)
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <AlertTriangle className="size-32 text-rose-600" />
                </div>
                <h3 className="text-sm font-bold text-rose-600 mb-4 flex items-center gap-2">
                  <AlertTriangle className="size-4" /> System Maintenance Mode
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Enabling maintenance mode will block all tenant logins and
                  suspend background pipelines. Super Admins will retain access.
                </p>
                <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div>
                    <p className="font-bold text-rose-900 text-sm">
                      Enable Maintenance Mode
                    </p>
                    <p className="text-xs text-rose-700/80 mt-0.5">
                      {settings.maintenanceMode
                        ? "Enabled! Tenants cannot log in."
                        : "Currently disabled. All systems operational."}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) =>
                        updateSetting("maintenanceMode", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
              </section>
            </div>
          )}

          {activeTab === "SECURITY" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4">
                  Authentication Policies
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        Enforce 2FA Globally
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Require multi-factor authentication for all users across
                        all tenants.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enforce2FAGlobally}
                        onChange={(e) =>
                          updateSetting("enforce2FAGlobally", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        Session Timeout (Minutes)
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automatically log users out after inactivity.
                      </p>
                    </div>
                    <input
                      type="number"
                      value={settings.sessionTimeoutMins}
                      onChange={(e) =>
                        updateSetting(
                          "sessionTimeoutMins",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-20 p-2 bg-white border border-slate-200 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "AI_MODELS" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Google Gemini Integration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Primary LLM used for clinical NLP and AI chat.
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md flex items-center gap-1 border border-emerald-100">
                    <CheckCircle2 className="size-3" /> CONNECTED
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        disabled
                        value="••••••••••••••••••••••••••••••••••••"
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed focus:outline-none transition-all pr-24"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-slate-200 rounded-md">
                        <Lock className="size-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                          From .ENV
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      For security reasons, API keys must be configured via
                      environment variables and cannot be modified here.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Default Model
                      </label>
                      <select
                        value={settings.defaultLLMModel}
                        onChange={(e) =>
                          updateSetting("defaultLLMModel", e.target.value)
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-cyan-500"
                      >
                        <optgroup label="Gemini 3.0 (Next-Gen)">
                          <option value="gemini-3.0-pro">gemini-3.0-pro</option>
                          <option value="gemini-3.0-flash">
                            gemini-3.0-flash
                          </option>
                        </optgroup>
                        <optgroup label="Gemini 2.0">
                          <option value="gemini-2.0-flash-exp">
                            gemini-2.0-flash-exp
                          </option>
                        </optgroup>
                        <optgroup label="Gemini 1.5">
                          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                          <option value="gemini-1.5-pro-latest">
                            gemini-1.5-pro-latest
                          </option>
                          <option value="gemini-1.5-flash">
                            gemini-1.5-flash
                          </option>
                          <option value="gemini-1.5-flash-latest">
                            gemini-1.5-flash-latest
                          </option>
                          <option value="gemini-1.5-flash-8b">
                            gemini-1.5-flash-8b
                          </option>
                        </optgroup>
                        <optgroup label="Legacy">
                          <option value="gemini-1.0-pro">gemini-1.0-pro</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Temperature (Default)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.llmTemperature}
                        onChange={(e) =>
                          updateSetting(
                            "llmTemperature",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "INTEGRATIONS" && (
            <div className="animate-in fade-in duration-300 space-y-6 flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="bg-slate-50 p-4 rounded-full mb-2 border border-slate-100">
                <CreditCard className="size-8 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-700">
                Third-Party Integrations
              </h3>
              <p className="text-slate-500 mt-1 max-w-sm text-sm">
                Stripe billing and Snowflake global warehouse configuration are
                scheduled for Q4 release.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
