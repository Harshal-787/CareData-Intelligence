import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types/auth';
import { LandingNavbar } from '../../components/landing/LandingNavbar';
import { LandingFooter } from '../../components/landing/LandingFooter';
import {
  Database,
  CheckCircle2,
  Users,
  BarChart3,
  Bot,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Server,
  Lock,
  Cpu,
  ArrowUpRight,
  Fingerprint,
  ChevronRight,
  Activity,
  Check,
  Building2,
  HardDrive
} from 'lucide-react';
import clsx from 'clsx';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'quality' | 'dedup' | 'analytics' | 'ai' | 'security'>('quality');

  const featureTabs = [
    {
      id: 'quality' as const,
      label: 'Data Quality & Rules',
      icon: CheckCircle2,
      badge: 'Phase 3 Live',
      title: 'Automated Clinical Quality Profiling & Rule Engine',
      description:
        'Continuously score raw clinical ingestion streams. Detect missing values, invalid schemas, and clinical anomalies against standard medical thresholds like HbA1c, Blood Pressure, and Heart Rate.',
      highlights: [
        'Automated completeness, validity, and uniqueness scoring',
        'Customizable clinical domain rules with severity alerts',
        'Interactive rule editor with real-time test execution',
        'Executive data quality scorecards with exportable PDF briefs',
      ],
      metrics: [
        { label: 'Quality Precision', value: '96.4%' },
        { label: 'Rules Evaluated', value: '14 Active' },
        { label: 'Anomaly Latency', value: '< 20ms' },
      ],
    },
    {
      id: 'dedup' as const,
      label: 'Patient Deduplication (MPI)',
      icon: Users,
      badge: 'Phase 4 Live',
      title: 'Probabilistic Master Patient Index (MPI) & Resolution',
      description:
        'Reconcile disparate patient records across clinical systems with deterministic and probabilistic fuzzy matching (Jaro-Winkler, Levenshtein, Double Metaphone). Automatically merge golden records or route to human review.',
      highlights: [
        'Deterministic matching on SSN, MRN, and National ID',
        'Fuzzy probabilistic scoring on patient names, DOB, and phone numbers',
        'Interactive side-by-side golden record comparison workspace',
        'One-click automated merge with rollback audit trail',
      ],
      metrics: [
        { label: 'Fuzzy Accuracy', value: '99.2%' },
        { label: 'Candidate Pairs', value: '128 Found' },
        { label: 'Resolution Rate', value: '88.5%' },
      ],
    },
    {
      id: 'analytics' as const,
      label: 'OLAP Healthcare Analytics',
      icon: BarChart3,
      badge: 'Phase 5 Live',
      title: 'High-Performance Embedded OLAP with DuckDB',
      description:
        'Run sub-second analytical queries on millions of healthcare records. Slice and dice patient cohorts, readmission rates, encounter types, and clinical diagnoses in real-time without bulky cloud warehouse overhead.',
      highlights: [
        'Vectorized DuckDB in-memory analytical query engine',
        'Dynamic patient cohort filtering by diagnosis, age, and risk tier',
        '30-day hospital readmission and emergency utilization analytics',
        'Zero ETL delay: queries execute directly against clean lakehouse data',
      ],
      metrics: [
        { label: 'Query Speed', value: '< 45ms' },
        { label: 'Records Scanned', value: '1.2M / sec' },
        { label: 'DuckDB Engine', value: 'Vectorized' },
      ],
    },
    {
      id: 'ai' as const,
      label: 'Private Local AI (Gemini)',
      icon: Bot,
      badge: 'Phase 7 AI',
      title: '100% On-Premise Clinical AI & Text-to-SQL',
      description:
        'Empower clinical analysts with natural language data querying and automated executive summaries powered by local Gemini LLMs (Gemini 3.6 Flash). Zero clinical data leaves your secure perimeter.',
      highlights: [
        'Natural-language to SQL translation for non-technical clinicians',
        'Automated executive narrative generation from anomaly reports',
        '100% on-premise execution with zero external API dependencies',
        'Strict HIPAA compliance: no cloud LLM data leakage or training',
      ],
      metrics: [
        { label: 'HIPAA Isolation', value: '100% Local' },
        { label: 'LLM Engine', value: 'Gemini 3.6 Flash' },
        { label: 'Data Egress', value: '0 Bytes' },
      ],
    },
    {
      id: 'security' as const,
      label: 'RBAC & Audit Trails',
      icon: ShieldCheck,
      badge: 'Phase 1 Security',
      title: 'Multi-Tenant Governance, RBAC & Audit Trails',
      description:
        'Enterprise healthcare security built from the ground up. Granular role-based access control, cryptographic password hashing, multi-organization isolation, and tamper-evident audit logging.',
      highlights: [
        '4 Granular Roles: Super Admin, Org Admin, Data Analyst, Viewer',
        'Tenant data partitioning with strict multi-organization barriers',
        'Immutable audit trails tracking all dataset reads, merges, and queries',
        'Signed JWT authentication with session timeout & revoke support',
      ],
      metrics: [
        { label: 'RBAC Roles', value: '4 Tiers' },
        { label: 'Audit Logging', value: '100% Immutable' },
        { label: 'Isolation', value: 'Multi-Tenant' },
      ],
    },
  ];

  const currentTab = featureTabs.find((t) => t.id === activeTab)!;

  const pipelineSteps = [
    {
      step: '01',
      title: 'Ingestion & Lakehouse',
      desc: 'Ingest raw CSV, JSON, and Parquet data into MinIO S3 storage with automatic schema detection.',
      icon: Database,
      tag: 'MinIO + S3 API',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      step: '02',
      title: 'Quality & Rules Profiling',
      desc: 'Automated data profiling, completeness checks, and clinical validity threshold evaluations.',
      icon: CheckCircle2,
      tag: '96.4% Quality Score',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      step: '03',
      title: 'Probabilistic Deduplication',
      desc: 'Identify duplicate patients across clinical systems using Jaro-Winkler and Soundex algorithms.',
      icon: Users,
      tag: 'MPI Golden Records',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      step: '04',
      title: 'DuckDB OLAP Analytics',
      desc: 'Execute sub-second cohort analytics, readmission risk metrics, and hospital KPI dashboards.',
      icon: BarChart3,
      tag: '< 45ms Latency',
      color: 'from-purple-500 to-pink-500',
    },
    {
      step: '05',
      title: 'Local AI & Clinical Briefs',
      desc: 'Ask questions in plain English with on-premise Gemini LLM and export automated PDF briefs.',
      icon: Bot,
      tag: '100% Private Local AI',
      color: 'from-teal-500 to-cyan-500',
    },
  ];

  const rolePersonas: { role: Role; title: string; desc: string; color: string; bg: string; border: string; icon: any }[] = [
    {
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      desc: 'Full platform oversight, multi-tenant organization provisioning, global audit trails, and system settings.',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      border: 'border-purple-200 hover:border-purple-500/60',
      icon: ShieldCheck,
    },
    {
      role: 'ORG_ADMIN',
      title: 'Organization Admin',
      desc: 'Manage clinical organization users, configure hospital-specific data quality rules, and review team activity.',
      color: 'text-cyan-600',
      bg: 'bg-cyan-100',
      border: 'border-cyan-200 hover:border-cyan-300',
      icon: Building2,
    },
    {
      role: 'DATA_ANALYST',
      title: 'Clinical Data Analyst',
      desc: 'Inspect data quality rules, execute patient deduplication merges, run OLAP queries, and query Local AI.',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      border: 'border-blue-200 hover:border-blue-500/60',
      icon: BarChart3,
    },
    {
      role: 'VIEWER',
      title: 'Clinical Viewer',
      desc: 'Read-only access to executive KPI dashboards, clinical quality summaries, and patient risk analytics.',
      color: 'text-slate-600',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30 hover:border-slate-400/60',
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-100 selection:bg-cyan-500 selection:text-slate-900 relative overflow-x-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-cyan-600/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] -left-40 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1600px] -right-40 w-96 h-96 bg-cyan-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
        {/* Phase Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100 border border-cyan-200 text-xs font-semibold text-cyan-700 mb-8 backdrop-blur-md shadow-sm shadow-cyan-500/10 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
          <span>CareData Intelligence v1.0 • Enterprise Healthcare Lakehouse</span>
        </div>

        {/* Hero Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.15]">
          Unified Clinical Intelligence,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
            Master Patient Deduplication
          </span>{' '}
          & Local AI
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
          Transform fragmented EHR, claims, and clinical streams into high-fidelity golden records. Featuring automated data quality profiling, sub-second DuckDB OLAP analytics, and 100% private on-premise AI.
        </p>

        {/* Hero Call to Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-sm shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Go to Live Console</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-sm shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-all"
              >
                <Fingerprint className="h-4 w-4 text-cyan-600" />
                <span>Sign In to Console</span>
              </Link>
            </>
          )}

          <a
            href="http://localhost:8080/swagger"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-200 text-cyan-700 font-medium text-sm transition"
          >
            <span>OpenAPI Docs</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        {/* Live Metrics Grid Banner */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="glass-panel p-5 rounded-2xl text-left border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Quality Score</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              96.4%
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">Automated Rule Audits</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-left border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>OLAP Engine Latency</span>
              <Zap className="h-4 w-4 text-cyan-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              &lt; 45ms
            </div>
            <div className="text-[11px] text-cyan-600 mt-1">Vectorized DuckDB</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-left border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Patient Deduplication</span>
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              99.2%
            </div>
            <div className="text-[11px] text-indigo-400 mt-1">Probabilistic MPI Match</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-left border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Local AI Privacy</span>
              <Bot className="h-4 w-4 text-teal-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              0 Bytes
            </div>
            <div className="text-[11px] text-teal-400 mt-1">Zero Cloud Data Egress</div>
          </div>
        </div>
      </section>

      {/* Visual Pipeline Flow Section */}
      <section id="architecture" className="py-20 bg-white/80 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-600 mb-2">
              End-to-End Clinical Data Lifecycle
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              From Raw Ingestion to Instant Clinical Intelligence
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Streamline multi-source healthcare data processing in 5 high-speed, secure pipeline stages.
            </p>
          </div>

          {/* Pipeline Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative">
            {pipelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="glass-panel p-6 rounded-2xl border border-slate-200 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-cyan-600 transition">
                        {step.step}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-slate-900 mb-2">{step.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <span className="text-[11px] font-mono text-cyan-700 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-200">
                      {step.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Feature Deep Dive Tabs */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-600 mb-2">
            Core Engine Capabilities
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Built for High-Stakes Clinical Workloads
          </h3>
          <p className="text-sm text-slate-400 mt-3">
            Explore the specialized modules driving CareData Intelligence.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {featureTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border',
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 shadow-sm shadow-cyan-500/10'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className={clsx('h-4 w-4', isSelected ? 'text-cyan-600' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content Card */}
        <div className="glass-panel rounded-3xl p-8 lg:p-10 border border-cyan-200 bg-gradient-to-b from-[#0e1726]/80 to-[#090e19]/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Description */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-xs font-mono font-semibold text-cyan-700">
                <Sparkles className="h-3 w-3" />
                {currentTab.badge}
              </div>

              <h4 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {currentTab.title}
              </h4>

              <p className="text-sm text-slate-600 leading-relaxed">
                {currentTab.description}
              </p>

              {/* Highlights Bullet Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentTab.highlights.map((hl, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-4 flex items-center gap-4">
                <Link
                  to={user ? `/${activeTab}` : '/login'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-sm shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
                >
                  <span>Launch {currentTab.label}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="#sandbox"
                  className="text-xs text-cyan-600 hover:text-cyan-700 transition flex items-center gap-1 font-medium"
                >
                  <span>Quick Test Drive</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Right Metrics Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-600" /> Live Module Telemetry
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {currentTab.metrics.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-lg font-bold text-slate-900 font-mono">{m.value}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Micro Code / Clinical Rule Preview Box */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1 overflow-x-auto">
                  <div className="text-cyan-600 text-[10px] uppercase font-bold">// Engine Rule Spec</div>
                  {activeTab === 'quality' && (
                    <p className="text-emerald-300">
                      RULE: Vitals.HbA1c &lt;= 14.0 AND Vitals.BloodPressure &gt; 0 (Severity: CRITICAL)
                    </p>
                  )}
                  {activeTab === 'dedup' && (
                    <p className="text-indigo-300">
                      MATCH: JaroWinkler(PatientA.Name, PatientB.Name) &gt;= 0.88 AND SSN_Match == true
                    </p>
                  )}
                  {activeTab === 'analytics' && (
                    <p className="text-blue-300">
                      SELECT cohort_id, count(*), avg(los_days) FROM lakehouse.encounters GROUP BY 1;
                    </p>
                  )}
                  {activeTab === 'ai' && (
                    <p className="text-teal-300">
                      OLLAMA PROMPT: "Summarize diabetic readmissions with high risk markers..."
                    </p>
                  )}
                  {activeTab === 'security' && (
                    <p className="text-purple-300">
                      AUDIT: [DATA_ANALYST] merged Patient_Rec #1029 ➔ Logged with SHA-256
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Access Control Overview */}
      <section id="roles" className="py-20 bg-white/90 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-xs font-semibold text-cyan-700 mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Granular Role-Based Access Control</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Enterprise Role Personas & Permissions
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              Each user persona is governed by strict JWT-authenticated multi-tenant permissions and immutable audit logging.
            </p>
          </div>

          {/* Persona Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rolePersonas.map((persona) => {
              const Icon = persona.icon;
              return (
                <div
                  key={persona.role}
                  className={clsx(
                    'glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between group hover:-translate-y-1',
                    persona.border
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${persona.bg}`}>
                        <Icon className={`h-6 w-6 ${persona.color}`} />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {persona.role.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{persona.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">{persona.desc}</p>
                  </div>

                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900 border border-slate-200 transition group-hover:border-cyan-500/50 group-hover:bg-cyan-950/40"
                  >
                    <span>Sign In as {persona.title.split(' ')[0]}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-cyan-600 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise Security & HIPAA Compliance */}
      <section id="security" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 lg:p-12 rounded-3xl border border-cyan-200 bg-gradient-to-r from-[#0c192c] via-[#0b1424] to-[#090d18] relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-xs font-semibold text-cyan-700">
                <ShieldCheck className="h-3.5 w-3.5" /> HIPAA-Ready Enterprise Architecture
              </div>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                Clinical Grade Security, Privacy & Compliance
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Designed for sensitive healthcare ecosystems. All analytical computations and local AI inferences run within your private infrastructure. No protected health information (PHI) is ever transmitted to public commercial APIs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200">
                  <Lock className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">Zero Data Egress</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Gemini LLM runs 100% locally with no third-party telemetry.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200">
                  <Fingerprint className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">Immutable Audit Logs</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Every merge, deduplication decision, and export is recorded.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 w-full max-w-sm">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  System Tech Stack & Components
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-slate-600 flex items-center gap-2">
                      <Server className="h-3.5 w-3.5 text-cyan-600" /> Golang 1.22 Core API
                    </span>
                    <span className="font-mono text-emerald-600 text-[11px]">v1.0</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-slate-600 flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-blue-600" /> PostgreSQL & MinIO S3
                    </span>
                    <span className="font-mono text-emerald-600 text-[11px]">Lakehouse</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-slate-600 flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 text-indigo-400" /> DuckDB Vector OLAP
                    </span>
                    <span className="font-mono text-emerald-600 text-[11px]">Embedded</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-slate-600 flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-teal-400" /> Gemini Local LLM
                    </span>
                    <span className="font-mono text-emerald-600 text-[11px]">Gemini 3.6 Flash</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap & Phase Delivery */}
      <section id="roadmap" className="py-20 bg-white/80 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-600 mb-2">
              Implementation Roadmap
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              Phased Engineering Delivery
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              Iterative, robust development powering clinical lakehouse intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-cyan-200">
              <div className="text-xs font-mono text-cyan-600 mb-1">Phase 1 & 2 • Complete</div>
              <h5 className="text-sm font-semibold text-slate-900">Auth, RBAC & Lake Ingestion</h5>
              <p className="text-xs text-slate-400 mt-2">
                Multi-tenant organization segregation, user roles, MinIO Parquet raw lakehouse ingestion.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-cyan-200">
              <div className="text-xs font-mono text-cyan-600 mb-1">Phase 3 & 4 • Complete</div>
              <h5 className="text-sm font-semibold text-slate-900">Data Quality & Patient Deduplication</h5>
              <p className="text-xs text-slate-400 mt-2">
                Rule engine for clinical thresholds, deterministic/probabilistic Jaro-Winkler MPI resolution.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-cyan-200">
              <div className="text-xs font-mono text-cyan-600 mb-1">Phase 5 • Live</div>
              <h5 className="text-sm font-semibold text-slate-900">OLAP Analytics & Cohorts</h5>
              <p className="text-xs text-slate-400 mt-2">
                Embedded DuckDB SQL engine, patient cohort exploration, readmission statistics.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <div className="text-xs font-mono text-slate-400 mb-1">Phase 6 & 7 • Active</div>
              <h5 className="text-sm font-semibold text-slate-600">ML Predictions & Local AI</h5>
              <p className="text-xs text-slate-400 mt-2">
                Isolation Forest vitals anomaly detection, Gemini text-to-SQL assistant, PDF briefs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-700 p-10 lg:p-14 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Experience Next-Gen Healthcare Intelligence?
            </h3>
            <p className="text-base text-cyan-100 max-w-xl mx-auto leading-relaxed">
              Launch the CareData Intelligence platform now or sign in to review datasets and quality scorecards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to={user ? '/dashboard' : '/login'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-sm hover:bg-slate-100 transition"
              >
                <span>{user ? 'Open Dashboard' : 'Sign In to Console'}</span>
                <ArrowRight className="h-4 w-4 text-cyan-600" />
              </Link>
              <a
                href="#sandbox"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-cyan-950/60 hover:bg-cyan-950 border border-cyan-300/30 text-slate-900 font-semibold text-sm transition"
              >
                <Fingerprint className="h-4 w-4 text-cyan-700" />
                <span>Test Drive Sandbox</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
};
