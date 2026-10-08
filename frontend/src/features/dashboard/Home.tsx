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
  ShieldCheck,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/client';
import { cn } from '../../lib/utils';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<string>('checking...');

  useEffect(() => {
    api.get('/health')
      .then(() => setHealthStatus('Healthy'))
      .catch(() => setHealthStatus('Degraded'));

    api.get('/analytics/overview')
      .then((res) => setOverview(res.data))
      .catch((err) => console.error('Failed to fetch analytics', err))
      .finally(() => setLoading(false));
      
    // Fetch real system activities
    api.get('/audit-logs')
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setActivities(res.data.slice(0, 4));
        } else {
          setActivities([]);
        }
      })
      .catch((err) => console.error('Failed to fetch audit logs', err));
  }, []);

  const stats = [
    { label: 'Total encounters', value: loading ? '...' : overview?.kpis?.totalEncounters?.toLocaleString() || 0, change: 'Lifetime', tone: 'bg-cyan-100 text-cyan-600', icon: Database },
    { label: 'Avg length of stay', value: loading ? '...' : `${(overview?.kpis?.averageLosDays || 0).toFixed(1)} days`, change: 'Facility avg', tone: 'bg-blue-100 text-blue-600', icon: Activity },
    { label: 'Readmission rate', value: loading ? '...' : `${(overview?.kpis?.readmissionRatePct || 0).toFixed(1)}%`, change: '30-day window', tone: 'bg-indigo-100 text-indigo-600', icon: Users },
    { label: 'Active datasets', value: loading ? '...' : overview?.kpis?.datasetsCount || 0, change: 'Data engine', tone: 'bg-emerald-100 text-emerald-600', icon: Database },
  ];

  // Map the volumeTrends for the recharts AreaChart
  const chartData = overview?.volumeTrends?.map((pt: any) => ({
    name: pt.period,
    Admissions: pt.admissions,
    Discharges: pt.discharges,
    Total: pt.totalVolume
  })) || [];
  
  // Calculate the average quality score from connected datasets
  let qualityPct = 0;
  if (overview?.availableFilterOptions?.datasets?.length > 0) {
    const scores = overview.availableFilterOptions.datasets.map((d: any) => d.qualityScore || 0);
    qualityPct = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-cyan-600">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.fullName || user?.email || 'User'}
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
          <div key={i} className="group rounded-2xl border border-slate-200/80 bg-white/60 p-5 shadow-sm shadow-slate-200/50 backdrop-blur-xl hover:shadow-md hover:border-cyan-200 transition-all duration-300">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-cyan-700 transition-colors">{stat.label}</p>
              <span className={cn("grid size-9 place-items-center rounded-xl transition-transform group-hover:scale-110", stat.tone)}>
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 transition-all hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Clinical volume</h2>
              <p className="mt-1 text-[11px] text-slate-400">Encounter activity over time</p>
            </div>
            <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
              Last 30 days <ChevronDown className="ml-1 inline size-3" />
            </button>
          </div>
          <div className="h-[220px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                    labelStyle={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="Total" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                {loading ? 'Loading chart data...' : 'No volume data available'}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 transition-all hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Data quality health</h2>
              <p className="mt-1 text-[11px] text-slate-400">Across connected datasets</p>
            </div>
            <ShieldCheck className="size-4 text-cyan-500" />
          </div>
          <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
            <div className="relative grid size-28 place-items-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" stroke="#0ea5e9" strokeWidth="8"
                  strokeDasharray={`${(qualityPct / 100) * 283} 283`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="text-2xl font-bold tracking-tight text-cyan-700">
                {qualityPct}%
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-900">Platform connection</p>
            <p className={cn(
              "mt-1 text-[11px] font-medium flex items-center gap-1",
              healthStatus === 'Healthy' ? 'text-emerald-500' : 'text-amber-500'
            )}>
              {healthStatus === 'Healthy' ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
              {healthStatus}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Activity & AI Widget */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 transition-all hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent activity</h2>
              <p className="mt-1 text-[11px] text-slate-400">Your latest platform events</p>
            </div>
            <button className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700">View all</button>
          </div>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((act, i) => (
                <div key={act.id || i} className="group flex items-center gap-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 p-3 border border-slate-100 transition-colors">
                  <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <Activity className="size-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-800">{act.action}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{act.details || act.resource}</p>
                  </div>
                  {act.status === 'SUCCESS' ? (
                     <CheckCircle2 className="size-4 text-emerald-400" />
                  ) : (
                     <AlertCircle className="size-4 text-amber-400" />
                  )}
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-slate-400">
                {loading ? 'Loading activities...' : 'No recent activities found'}
              </div>
            )}
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 p-6 text-white shadow-lg shadow-cyan-200/50 hover:shadow-cyan-300/50 transition-all duration-500">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl pointer-events-none transition-transform duration-700 group-hover:translate-x-1/4" />
          <Sparkles className="relative mb-4 size-5 text-cyan-100" />
          <h2 className="relative text-base font-bold tracking-tight">Ask CareData AI</h2>
          <p className="relative mt-2 max-w-sm text-xs leading-5 text-cyan-50/90">
            Powered by local Gemini. Ask questions across your clinical datasets and turn raw data into confident decisions.
          </p>
          <Link 
            to="/ai-insights"
            className="relative mt-6 flex w-full justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-white hover:text-cyan-700"
          >
            Open AI workspace
          </Link>
        </div>
      </section>
    </div>
  );
};
