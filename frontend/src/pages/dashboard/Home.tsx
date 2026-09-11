import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Users,
  Activity,
  Bot,
  ArrowUpRight,
  Server,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '../../api/client';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [apiHealth, setApiHealth] = useState<string>('checking...');

  useEffect(() => {
    api.get('/health')
      .then(() => setApiHealth('Operational'))
      .catch(() => setApiHealth('Degraded'));
  }, []);

  const stats = [
    { label: 'Active Datasets', value: '14', change: '+3 this week', icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Avg Data Quality Score', value: '96.4%', change: '+1.2%', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Duplicate Candidates', value: '128', change: '24 pending review', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Clinical Anomalies', value: '42', change: '8 high risk', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  const services = [
    { name: 'Golang Core API', status: apiHealth, latency: '12ms', icon: Server, color: 'text-cyan-400' },
    { name: 'PostgreSQL Database', status: 'Operational', latency: '4ms', icon: Database, color: 'text-blue-400' },
    { name: 'MinIO Parquet Lake', status: 'Operational', latency: '18ms', icon: Layers, color: 'text-indigo-400' },
    { name: 'Ollama Local LLM', status: 'Ready (Llama-3)', latency: 'Local GPU/CPU', icon: Cpu, color: 'text-teal-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0c2438] via-[#0f1d38] to-[#111827] border border-cyan-500/20 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-cyan-500/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-semibold text-cyan-300 mb-2">
              <Sparkles className="h-3 w-3" /> Phase 1 Initialized & Active
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, <span className="text-cyan-400">{user?.fullName}</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              CareData Intelligence is monitoring clinical ingestion streams, data quality rules, patient record deduplication, and local AI summaries.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-mono text-slate-300">
              Role: <strong className="text-cyan-400">{user?.role}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-panel p-5 rounded-2xl glass-panel-hover">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-cyan-400" />
                  <span>{stat.change}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture & Microservices Health Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Pipeline Status */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" /> Infrastructure & Engine Status
            </h2>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Systems
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-800">
                    <Icon className={`h-5 w-5 ${srv.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{srv.name}</p>
                    <p className="text-[11px] text-emerald-400 font-mono">{srv.status}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{srv.latency}</span>
                </div>
              );
            })}
          </div>

          {/* Pipeline Phases Roadmap Preview */}
          <div className="pt-3 border-t border-slate-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              CareData Intelligence Capabilities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/50 border border-cyan-500/30 text-cyan-300 font-medium text-center">
                ✓ 1. Auth & RBAC
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-center">
                2. Ingestion & Lake
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-center">
                3. Quality & Rules
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 text-center">
                4. Deduplication
              </div>
            </div>
          </div>
        </div>

        {/* AI Quick Assistant Widget */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 mb-2">
              <Bot className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">Ask CareData AI</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Powered by local <strong>Ollama LLM</strong>. Ask questions across your clinical datasets or generate automated narrative summaries.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 font-mono italic">
              "Show me all patients with elevated HbA1c over 8.5% and readmissions in the last 30 days..."
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/ai-insights'}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-500 transition"
          >
            Launch AI Workspace <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
