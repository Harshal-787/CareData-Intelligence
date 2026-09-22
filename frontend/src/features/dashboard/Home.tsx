import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Database,
  Users,
  Activity,
  Sparkles,
  Upload,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import api from '../../api/client';
import { cn } from '../../lib/utils';

function EmptyChart() {
  return (
    <div className="relative h-[190px] overflow-hidden rounded-xl bg-slate-50/80 p-4">
      <div className="absolute inset-x-4 bottom-7 top-5 opacity-60" style={{ backgroundImage: "linear-gradient(#e7e8f0 1px, transparent 1px), linear-gradient(90deg, #e7e8f0 1px, transparent 1px)", backgroundSize: "25% 33.33%" }} />
      <svg viewBox="0 0 600 150" preserveAspectRatio="none" className="absolute inset-x-4 bottom-7 top-5 h-[150px] w-[calc(100%-2rem)]">
        <path d="M0 125 C55 102 80 118 125 95 S200 108 250 69 S320 86 370 72 S440 104 490 52 S560 78 600 28" fill="none" stroke="#0ea5e9" strokeWidth="3" />
      </svg>
      <div className="absolute bottom-2 inset-x-4 flex justify-between text-[9px] text-slate-400">
        <span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 30</span>
      </div>
    </div>
  );
}

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<string>('checking...');

  useEffect(() => {
    api.get('/health')
      .then(() => setHealthStatus('Healthy'))
      .catch(() => setHealthStatus('Degraded'));

    api.get('/analytics/overview')
      .then((res) => {
        setOverview(res.data);
      })
      .catch((err) => console.error('Failed to fetch analytics', err))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total encounters', value: loading ? '...' : overview?.kpis?.totalEncounters?.toLocaleString() || 0, change: 'Lifetime', tone: 'bg-cyan-100 text-cyan-600', icon: Database },
    { label: 'Avg length of stay', value: loading ? '...' : `${(overview?.kpis?.averageLosDays || 0).toFixed(1)} days`, change: 'Facility avg', tone: 'bg-blue-100 text-blue-600', icon: Activity },
    { label: 'Readmission rate', value: loading ? '...' : `${(overview?.kpis?.readmissionRatePct || 0).toFixed(1)}%`, change: '30-day window', tone: 'bg-indigo-100 text-indigo-600', icon: Users },
    { label: 'Active datasets', value: loading ? '...' : overview?.kpis?.datasetsCount || 0, change: 'Data engine', tone: 'bg-emerald-100 text-emerald-600', icon: Database },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-cyan-600">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.fullName?.split(' ')[0]}
          </p>
          <h1 className="text-[30px] font-bold tracking-[-.045em] text-slate-950 sm:text-[36px]">
            Your clinical workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A clear view of your clinical data operations, quality, and intelligence.
          </p>
        </div>
        <Link 
          to="/datasets"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:from-cyan-600 hover:to-blue-600"
        >
          <Upload className="size-3.5" />
          Upload dataset
        </Link>
      </div>

      {/* Metrics Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <span className={cn("grid size-9 place-items-center rounded-xl", stat.tone)}>
                <stat.icon className="size-4" />
              </span>
            </div>
            <p className="mt-5 text-[25px] font-bold tracking-[-.04em] text-slate-900">{stat.value}</p>
            <p className="mt-1 text-[10px] font-semibold text-emerald-500">
              <span className="font-normal text-slate-400">{stat.change}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Charts & Health */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Clinical volume</h2>
              <p className="mt-1 text-[11px] text-slate-400">Encounter activity over time</p>
            </div>
            <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50">
              Last 30 days <ChevronDown className="ml-1 inline size-3" />
            </button>
          </div>
          <EmptyChart />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Data quality health</h2>
              <p className="mt-1 text-[11px] text-slate-400">Across connected datasets</p>
            </div>
            <ShieldCheck className="size-4 text-cyan-500" />
          </div>
          <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
            <div className="relative grid size-24 place-items-center rounded-full border-[7px] border-slate-100">
              <span className="text-2xl font-bold tracking-tight text-cyan-600">
                {healthStatus === 'Healthy' ? '98%' : '75%'}
              </span>
              <span className={cn(
                "absolute inset-[-7px] rounded-full border-[7px] border-transparent",
                healthStatus === 'Healthy' ? "border-t-cyan-500 border-r-cyan-300" : "border-t-amber-500 border-r-amber-300"
              )} />
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-900">Platform connection</p>
            <p className={cn(
              "mt-1 text-[11px] font-medium",
              healthStatus === 'Healthy' ? 'text-emerald-500' : 'text-amber-500'
            )}>
              {healthStatus}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Activity & AI Widget */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent activity</h2>
              <p className="mt-1 text-[11px] text-slate-400">Your latest platform events</p>
            </div>
            <button className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700">View all</button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div className="grid size-8 place-items-center rounded-lg bg-cyan-100 text-cyan-600">
                <Database className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800">Auth module initialized</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Role based access granted to {user?.role}</p>
              </div>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                <BarChart3 className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800">Analytics overview synced</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Fetched metrics from data engine</p>
              </div>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 p-6 text-white shadow-lg shadow-cyan-200">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <Sparkles className="relative mb-4 size-5 text-cyan-100" />
          <h2 className="relative text-base font-bold tracking-tight">Ask CareData AI</h2>
          <p className="relative mt-2 max-w-sm text-xs leading-5 text-cyan-50">
            Powered by local Gemini. Ask questions across your clinical datasets and turn raw data into confident decisions.
          </p>
          <Link 
            to="/ai-insights"
            className="relative mt-6 flex w-full justify-center rounded-xl bg-white py-2.5 text-xs font-bold text-cyan-700 shadow-sm transition hover:bg-cyan-50"
          >
            Open AI workspace
          </Link>
        </div>
      </section>
    </div>
  );
};
