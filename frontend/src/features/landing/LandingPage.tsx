import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CloudOff,
  Database,
  FileCheck2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Menu,
  Network,
  Play,
  ShieldCheck,
  Users,
  X,
  Zap,
  LogOut,
  ExternalLink,
} from 'lucide-react';

const metrics = [
  ['1,200', 'Total clinical encounters', 'profiled'],
  ['3.9', 'Average length of stay', 'days'],
  ['11.4%', '30-day readmission risk', 'population'],
  ['$30,548.46', 'Mean encounter charges', 'per encounter'],
  ['96.4%', 'Data quality score', 'automated audits'],
  ['< 45ms', 'OLAP engine latency', 'vectorized DuckDB'],
  ['1.2M', 'Records scanned / sec', 'stream velocity'],
  ['14', 'Active quality rules', 'live policies'],
];

const stages = [
  {
    n: '01',
    title: 'Ingestion & Lakehouse',
    text: 'Ingest raw CSV, JSON, Parquet into MinIO S3 with automatic schema detection.',
    tag: 'MinIO + S3 API',
    icon: Database,
    color: 'from-cyan-500 to-teal-400',
  },
  {
    n: '02',
    title: 'Quality & Rules Profiling',
    text: 'Automated profiling, completeness checks, and clinical validity thresholds.',
    tag: '96.4% Quality Score',
    icon: FileCheck2,
    color: 'from-teal-500 to-emerald-400',
  },
  {
    n: '03',
    title: 'Probabilistic Deduplication',
    text: 'Identify duplicate patients across systems using multi-algorithm fuzzy matching.',
    tag: 'MPI Golden Records',
    icon: Fingerprint,
    color: 'from-blue-500 to-cyan-400',
  },
  {
    n: '04',
    title: 'DuckDB OLAP Analytics',
    text: 'Execute sub-second cohort analytics, readmission risk, and KPI dashboards.',
    tag: '< 45ms Latency',
    icon: Zap,
    color: 'from-indigo-500 to-blue-400',
  },
  {
    n: '05',
    title: 'Local AI & Clinical Briefs',
    text: 'Ask questions in plain English with on-premise Gemini and export PDF briefs.',
    tag: '100% Private Local AI',
    icon: BrainCircuit,
    color: 'from-violet-500 to-indigo-400',
  },
];

const features = [
  {
    n: '01',
    badge: 'PHASE 3 LIVE',
    title: 'Data Quality & Rules Engine',
    text: 'Continuously score raw clinical ingestion streams. Detect missing values, invalid schemas, and clinical anomalies against HbA1c, Blood Pressure, and Heart Rate thresholds.',
    bullets: [
      'Automated completeness, validity, and uniqueness scoring',
      'Customizable clinical domain rules with severity alerts',
      'Interactive rule editor with real-time test execution',
    ],
    code: 'RULE: Vitals.HbA1c <= 14.0',
    metric: '96.4%',
    label: 'Quality score',
    icon: FileCheck2,
    tone: 'cyan',
  },
  {
    n: '02',
    badge: 'PHASE 4 LIVE',
    title: 'Patient Deduplication / MPI',
    text: 'Reconcile disparate patient records across clinical systems with deterministic and probabilistic fuzzy matching.',
    bullets: [
      'Jaro-Winkler, Levenshtein, Double Metaphone',
      'Side-by-side golden record comparison workspace',
      'One-click merge with rollback audit trail',
    ],
    code: 'MATCH: JaroWinkler >= 0.88',
    metric: '99.2%',
    label: 'Match accuracy',
    icon: Fingerprint,
    tone: 'blue',
  },
  {
    n: '03',
    badge: 'PHASE 5 LIVE',
    title: 'OLAP Healthcare Analytics',
    text: 'Vectorized DuckDB in-memory analytics for dynamic cohorts, readmission risk, and emergency utilization with zero ETL delay.',
    bullets: [
      'Filter by diagnosis, age, and risk tier',
      '30-day readmission and emergency utilization',
      'Queries execute directly against clean lakehouse data',
    ],
    code: 'SELECT cohort FROM encounters',
    metric: '< 45ms',
    label: 'Query latency',
    icon: Activity,
    tone: 'indigo',
  },
  {
    n: '04',
    badge: 'PHASE 7 AI',
    title: 'Private Local AI / Gemini',
    text: '100% on-premise clinical AI translates natural language to SQL and generates executive narratives with no cloud LLM data leakage.',
    bullets: [
      'Natural language to SQL for clinicians',
      'Automated narrative generation from anomalies',
      'Gemini 3.6 Flash, fully local and private',
    ],
    code: 'AI_EGRESS: 0 BYTES',
    metric: '0 Bytes',
    label: 'Data egress',
    icon: BrainCircuit,
    tone: 'violet',
  },
  {
    n: '05',
    badge: 'PHASE 1 SECURITY',
    title: 'RBAC & Audit Trails',
    text: 'Granular access control and immutable audit trails track every dataset read, merge, query, and export.',
    bullets: [
      'Super Admin, Org Admin, Analyst, Viewer roles',
      'Strict multi-organization tenant barriers',
      'Signed JWT authentication with session revoke',
    ],
    code: 'AUDIT: MERGE_EVENT SIGNED',
    metric: '4',
    label: 'Granular roles',
    icon: ShieldCheck,
    tone: 'slate',
  },
];

const stack = [
  ['Golang 1.22', 'Gin HTTP Framework'],
  ['PostgreSQL 16', 'Primary database'],
  ['MinIO S3', 'Object storage / lakehouse'],
  ['DuckDB', 'Embedded vectorized OLAP'],
  ['Gemini 3.6 Flash', '100% local on-premise AI'],
  ['React 18', 'Frontend runtime'],
  ['TypeScript', 'Type-safe application'],
  ['Vite', 'Build tooling'],
  ['TailwindCSS', 'Interface system'],
  ['JWT + bcrypt', 'Auth & RBAC'],
  ['Recharts', 'Clinical visualizations'],
  ['Lucide React', 'Interface icons'],
];

const roles: [string, string, string, typeof Users, string][] = [
  [
    'Super Administrator',
    'Full platform oversight, multi-tenant organization provisioning, global audit trails, system settings.',
    'PURPLE',
    Users,
    'bg-violet-50 text-violet-700 border-violet-200',
  ],
  [
    'Organization Admin',
    'Manage clinical organization users, configure hospital-specific rules, review team activity.',
    'CYAN',
    Network,
    'bg-cyan-50 text-cyan-700 border-cyan-200',
  ],
  [
    'Clinical Data Analyst',
    'Inspect quality rules, execute deduplication merges, run OLAP queries, query Local AI.',
    'BLUE',
    Activity,
    'bg-blue-50 text-blue-700 border-blue-200',
  ],
  [
    'Clinical Viewer',
    'Read-only access to executive KPI dashboards, clinical quality summaries, and risk analytics.',
    'SLATE',
    ShieldCheck,
    'bg-slate-100 text-slate-700 border-slate-200',
  ],
];

const roadmap = [
  ['Phase 1 & 2', 'Complete', 'Auth, RBAC & Lake Ingestion', 'Multi-tenant segregation, user roles, MinIO Parquet lakehouse'],
  ['Phase 3 & 4', 'Complete', 'Data Quality & Patient Deduplication', 'Rule engine, Jaro-Winkler MPI resolution'],
  ['Phase 5', 'Live', 'OLAP Analytics & Cohorts', 'Embedded DuckDB SQL engine, cohort exploration, readmission statistics'],
  ['Phase 6 & 7', 'Active', 'ML Predictions & Local AI', 'Isolation Forest vitals anomaly detection, Gemini text-to-SQL assistant, PDF briefs'],
];

function Reveal({
  children,
  className = '',
  y = 28,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({
  num,
  eyebrow,
  title,
  text,
  dark = false,
}: {
  num: string;
  eyebrow: string;
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-10 sm:mb-14 grid gap-4 sm:gap-6 lg:grid-cols-[120px_1fr_330px] lg:items-end">
      <div>
        <span className={`font-mono text-xs ${dark ? 'text-cyan-300' : 'text-cyan-600'}`}>{num} / 08</span>
        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{eyebrow}</p>
      </div>
      <h2 className={`max-w-3xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] ${dark ? 'text-white' : 'text-slate-950'}`}>
        {title}
      </h2>
      <p className={`text-sm leading-6 ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{text}</p>
    </div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: '0%' }}
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-600"
    />
  );
}

function ScrollMarker({
  label,
  index,
  targetId,
}: {
  label: string;
  index: number;
  targetId: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      ref={ref}
      className="flex items-center gap-3 group cursor-pointer transition select-none"
    >
      <span
        className={`size-2 rounded-full transition-colors ${
          inView ? 'bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.9)]' : 'bg-slate-300 group-hover:bg-cyan-300'
        }`}
      />
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
          inView ? 'text-cyan-700 font-semibold' : 'text-slate-400 group-hover:text-slate-700'
        }`}
      >
        {String(index).padStart(2, '0')} / {label}
      </span>
    </a>
  );
}

function ClinicalScrollStory() {
  const scene = useRef(null);
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const cameraY = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -80]);
  const cameraScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.82, 1, 0.88]);
  const cameraRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-8, 0, 7]);
  const cardOne = useTransform(scrollYProgress, [0, 0.35, 0.72, 1], [0, -150, -60, 120]);
  const cardTwo = useTransform(scrollYProgress, [0, 0.35, 0.72, 1], [0, 115, 45, -100]);
  const cardThree = useTransform(scrollYProgress, [0, 0.35, 0.72, 1], [0, -80, 130, -40]);
  const orbit = useTransform(scrollYProgress, [0, 1], [-18, 18]);

  return (
    <section id="signal" ref={scene} className="relative min-h-[90vh] lg:h-[112vh] overflow-hidden bg-slate-950 text-white">
      <div className="lg:sticky lg:top-0 flex min-h-[90vh] lg:h-screen items-center py-12 lg:py-0 overflow-hidden">
        <motion.div
          style={{ rotate: orbit }}
          className="absolute left-1/2 top-1/2 size-[26rem] sm:size-[36rem] lg:size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10 [transform-style:preserve-3d]"
        />
        <motion.div
          style={{ rotate: useTransform(orbit, (value) => -value * 1.8) }}
          className="absolute left-1/2 top-1/2 size-[20rem] sm:size-[26rem] lg:size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/10"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
          <div className="relative z-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
              06 / Clinical data plane
            </span>
            <h2 className="mt-4 sm:mt-6 max-w-xl text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1] sm:leading-[0.94] tracking-[-0.06em]">
              Scroll through the <span className="text-cyan-300">signal.</span>
            </h2>
            <p className="mt-5 sm:mt-7 max-w-md text-sm leading-6 sm:leading-7 text-slate-400">
              A living view of CareData&apos;s pipeline. As you move, raw encounters resolve into governed intelligence, patient identity, and private clinical decisions.
            </p>
            <div className="mt-6 sm:mt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_16px_#67e8f9]" />
              Scroll to transform the record
            </div>
          </div>
          <div className="relative h-[22rem] sm:h-[26rem] md:h-[30rem] [perspective:1200px]">
            <motion.div
              style={{ y: cameraY, scale: cameraScale, rotateX: cameraRotate }}
              className="absolute inset-2 sm:inset-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5 shadow-2xl shadow-cyan-950/40 [transform-style:preserve-3d]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
                <span className="font-mono text-[10px] text-cyan-300">CAREDATA / LIVE RESOLUTION</span>
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </div>
              <div className="relative mt-4 sm:mt-6 h-[17rem] sm:h-[21rem] [transform-style:preserve-3d]">
                <motion.div
                  style={{ y: cardOne, rotateZ: useTransform(scrollYProgress, [0, 1], [-5, 5]) }}
                  className="absolute left-0 top-2 sm:top-4 w-[92%] sm:w-[82%] rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-4 sm:p-5 backdrop-blur-xl [transform:translateZ(80px)]"
                >
                  <p className="font-mono text-[10px] text-cyan-200">01 / RAW ENCOUNTER</p>
                  <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold">1,200 encounters</p>
                  <p className="mt-1 sm:mt-2 text-xs text-slate-400">EHR · claims · vitals · notes</p>
                </motion.div>
                <motion.div
                  style={{ y: cardTwo, rotateZ: useTransform(scrollYProgress, [0, 1], [4, -4]) }}
                  className="absolute right-0 top-20 sm:top-28 w-[90%] sm:w-[78%] rounded-2xl border border-teal-300/30 bg-teal-400/10 p-4 sm:p-5 backdrop-blur-xl [transform:translateZ(160px)]"
                >
                  <p className="font-mono text-[10px] text-teal-200">02 / GOLDEN RECORD</p>
                  <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold">99.2% match accuracy</p>
                  <p className="mt-1 sm:mt-2 text-xs text-slate-400">MPI identity graph resolved</p>
                </motion.div>
                <motion.div
                  style={{ y: cardThree, rotateZ: useTransform(scrollYProgress, [0, 1], [-3, 3]) }}
                  className="absolute bottom-1 sm:bottom-0 left-[4%] sm:left-[12%] w-[90%] sm:w-[78%] rounded-2xl border border-blue-300/30 bg-blue-400/10 p-4 sm:p-5 backdrop-blur-xl [transform:translateZ(240px)]"
                >
                  <p className="font-mono text-[10px] text-blue-200">03 / PRIVATE INTELLIGENCE</p>
                  <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold">0 bytes egress</p>
                  <p className="mt-1 sm:mt-2 text-xs text-slate-400">Local AI · governed · queryable</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const LandingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const hero = useRef(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.2], [0, -120]);
  const rotate = useTransform(scrollYProgress, [0, 0.2], [0, 8]);
  const navBg = useTransform(
    scrollYProgress,
    [0, 0.12],
    ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.96)']
  );

  const scrollTo = (id: string) => {
    setMenu(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-cyan-100 selection:text-cyan-950 font-sans">
      <ScrollProgress />

      {/* Sticky Enterprise Header */}
      <motion.header
        style={{ backgroundColor: navBg }}
        className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 backdrop-blur-xl transition-all"
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center shrink-0" aria-label="CareData Intelligence Home">
            <BrandLogo size="md" imgClassName="h-9 sm:h-11 md:h-12 w-auto" />
          </Link>

          {/* Desktop Nav Anchors */}
          <nav className="hidden items-center gap-8 text-xs font-semibold text-slate-600 lg:flex">
            <button onClick={() => scrollTo('architecture')} className="transition hover:text-cyan-600">
              Architecture
            </button>
            <button onClick={() => scrollTo('features')} className="transition hover:text-cyan-600">
              Features
            </button>
            <button onClick={() => scrollTo('stack')} className="transition hover:text-cyan-600">
              Tech Stack
            </button>
            <button onClick={() => scrollTo('roles')} className="transition hover:text-cyan-600">
              Roles
            </button>
            <button onClick={() => scrollTo('security')} className="transition hover:text-cyan-600">
              Security
            </button>
            <button onClick={() => scrollTo('roadmap')} className="transition hover:text-cyan-600">
              Roadmap
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-medium text-cyan-900">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="max-w-[130px] truncate">{user.fullName || user.email}</span>
                  <span className="font-mono text-[10px] uppercase font-bold text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                <Link
                  to="/dashboard"
                  className="rounded-full bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-cyan-600/30 transition hover:bg-cyan-700 inline-flex items-center gap-1.5"
                >
                  <span>Open Console</span>
                  <ArrowUpRight className="size-3" />
                </Link>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-600 transition rounded-full hover:bg-slate-100"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-700 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-700 shadow-sm"
                >
                  Get Started <ArrowUpRight className="ml-1 inline size-3" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <button
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
            className="p-2 text-slate-700 lg:hidden rounded-lg hover:bg-slate-100"
          >
            {menu ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {menu && (
          <nav className="flex flex-col gap-3 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-5 py-5 text-sm lg:hidden shadow-xl animate-in slide-in-from-top-2">
            <button onClick={() => scrollTo('architecture')} className="text-left py-2 font-medium text-slate-700 hover:text-cyan-600 transition">
              Architecture
            </button>
            <button onClick={() => scrollTo('features')} className="text-left py-2 font-medium text-slate-700 hover:text-cyan-600 transition">
              Features
            </button>
            <button onClick={() => scrollTo('stack')} className="text-left py-2 font-medium text-slate-700 hover:text-cyan-600 transition">
              Tech Stack
            </button>
            <button onClick={() => scrollTo('roles')} className="text-left py-2 font-medium text-slate-700 hover:text-cyan-600 transition">
              Roles
            </button>
            <button onClick={() => scrollTo('security')} className="text-left py-2 font-medium text-slate-700 hover:text-cyan-600 transition">
              Security
            </button>
            <button onClick={() => scrollTo('roadmap')} className="text-left py-2 font-medium text-slate-700 hover:text-cyan-600 transition">
              Roadmap
            </button>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-50 border border-cyan-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="truncate text-xs font-semibold text-cyan-950">{user.fullName || user.email}</span>
                    </div>
                    <span className="font-mono text-[9px] uppercase font-bold text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded shrink-0">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenu(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-cyan-600 text-white font-semibold text-xs shadow-sm hover:bg-cyan-700 transition"
                  >
                    Open Console
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMenu(false);
                    }}
                    className="w-full text-center py-2.5 rounded-xl border border-rose-200 text-rose-600 font-semibold text-xs hover:bg-rose-50 transition"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenu(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Sign In to Console
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenu(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-slate-950 text-white font-semibold text-xs hover:bg-cyan-700 transition"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </motion.header>

      <main id="top">
        {/* Side Scroll Marker Rail */}
        <aside
          aria-label="Page progress"
          className="fixed bottom-8 right-6 z-40 hidden flex-col gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-4 text-slate-500 shadow-xl shadow-slate-200/40 backdrop-blur-xl xl:flex"
        >
          <ScrollMarker label="Signal" index={1} targetId="signal" />
          <ScrollMarker label="Telemetry" index={2} targetId="telemetry" />
          <ScrollMarker label="Pipeline" index={3} targetId="architecture" />
          <ScrollMarker label="Modules" index={4} targetId="features" />
          <ScrollMarker label="Security" index={5} targetId="security" />
        </aside>

        {/* Section 01: Hero */}
        <section ref={hero} className="relative min-h-[640px] lg:min-h-[860px] overflow-hidden border-b border-slate-200 bg-[#f8fafc] pt-24 sm:pt-28 lg:pt-36">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(rgba(8,145,178,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,0.08) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          <motion.div
            style={{ y, rotate }}
            className="absolute -right-40 top-32 size-[520px] rounded-full border border-cyan-200/80 bg-cyan-100/20 blur-[1px]"
          />
          <motion.div
            style={{
              y: useTransform(scrollYProgress, [0, 0.35], [100, -180]),
              rotate: useTransform(scrollYProgress, [0, 0.35], [-18, 32]),
              scale: useTransform(scrollYProgress, [0, 0.3], [0.7, 1.2]),
            }}
            className="absolute -left-24 top-[55%] size-64 rounded-[35%] border border-teal-200/70 bg-gradient-to-br from-white/70 to-cyan-100/30 blur-[1px]"
          />
          <motion.div
            style={{ y: useTransform(scrollYProgress, [0, 0.2], [0, 80]) }}
            className="absolute left-[8%] top-[30%] size-20 rotate-45 border border-teal-200 bg-white/50"
          />

          <div className="relative mx-auto grid max-w-7xl gap-10 sm:gap-16 px-5 pb-16 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:px-8">
            <motion.div style={{ y }}>
              <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-800 shadow-sm">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                CareData Intelligence v1.0 · Enterprise Healthcare Lakehouse
              </div>
              <h1 className="max-w-5xl text-4xl sm:text-6xl md:text-7xl lg:text-[7.2rem] font-extrabold leading-[0.96] sm:leading-[0.94] tracking-[-0.06em] text-slate-950">
                Clinical data,
                <br />
                <span className="bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 bg-clip-text text-transparent">
                  made coherent.
                </span>
              </h1>
              <p className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-slate-600">
                Unified Clinical Intelligence, Master Patient Deduplication &amp; Local AI. Transform fragmented EHR, claims, and clinical streams into high-fidelity golden records.
              </p>

              <div className="mt-8 sm:mt-9 flex flex-wrap gap-3">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="rounded-full bg-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:-translate-y-0.5 hover:bg-cyan-700 inline-flex items-center gap-2"
                  >
                    <span>Open Live Console</span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="rounded-full bg-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:-translate-y-0.5 hover:bg-cyan-700 inline-flex items-center gap-2"
                    >
                      <span>Get Started Free</span>
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <Link
                      to="/login"
                      className="rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 inline-flex items-center gap-2"
                    >
                      <span>Sign In to Console</span>
                      <ChevronRight className="size-4 text-cyan-600" />
                    </Link>
                  </>
                )}
                <button
                  onClick={() => scrollTo('architecture')}
                  className="rounded-full border border-transparent hover:border-slate-200 px-5 py-3.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition inline-flex items-center gap-1.5"
                >
                  <span>Explore Platform</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </button>
              </div>
            </motion.div>

            {/* Right Card: Platform Signal / Live */}
            <Reveal className="relative lg:pb-10">
              <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-4 sm:p-6 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
                <div className="mb-4 sm:mb-5 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Platform signal / live
                    </p>
                    <p className="mt-1 text-sm sm:text-base font-semibold text-slate-900">Clinical Intelligence Index</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-700">
                    SYSTEM NOMINAL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {[
                    ['96.4%', 'Data quality'],
                    ['< 45ms', 'OLAP latency'],
                    ['99.2%', 'MPI accuracy'],
                    ['0 Bytes', 'AI egress'],
                  ].map(([v, l], i) => (
                    <motion.div
                      whileHover={{ y: -4 }}
                      key={l}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4 transition-all"
                    >
                      <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-950">{v}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{l}</p>
                      <div className="mt-3 sm:mt-4 h-1 overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${74 + i * 6}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 1 }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-500"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 sm:pt-4 font-mono text-[10px] text-slate-400">
                  <span>ASHORE SYSTEMS LAKEHOUSE</span>
                  <span className="text-emerald-600 font-semibold">UPTIME 99.99%</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 3D Dynamic Scroll Story */}
        <ClinicalScrollStory />

        {/* Section 02: Live Telemetry Metrics */}
        <section id="telemetry" className="bg-white py-20 sm:py-28 border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionLabel
              num="01"
              eyebrow="Live telemetry"
              title="A clearer signal from every clinical system."
              text="Every metric is computed directly against the clean lakehouse layer, giving clinical operators a precise, current view of their data estate."
            />
            <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-2 gap-3 md:grid-cols-4">
              {metrics.map(([v, l, sub], i) => (
                <Reveal
                  key={l}
                  y={i % 2 ? 34 : -34}
                  className={`${i === 0 ? 'col-span-2 row-span-2' : ''} ${i === 3 ? 'col-span-2 md:col-span-1' : ''}`}
                >
                  <div className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-[#fbfcfe] p-3.5 sm:p-5 transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-100/40">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] font-semibold text-slate-400">0{i + 1}</span>
                      <Activity className="size-4 text-cyan-600 opacity-60 group-hover:opacity-100 transition" />
                    </div>
                    <div>
                      <p
                        className={`${
                          i === 0 ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-3xl'
                        } font-mono font-bold tracking-tight text-slate-950`}
                      >
                        {v}
                      </p>
                      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold text-slate-700">{l}</p>
                      <p className="mt-0.5 sm:mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">{sub}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 03: Architecture / Pipeline Flow */}
        <section id="architecture" className="relative overflow-hidden bg-slate-950 py-28 text-white">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, #0891b2, transparent 28%), radial-gradient(circle at 80% 70%, #4f46e5, transparent 25%)',
            }}
          />
          <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
            <SectionLabel
              dark
              num="02"
              eyebrow="The data plane"
              title="Five stages. One source of truth."
              text="A composable pipeline that turns raw clinical exhaust into governed, queryable intelligence without moving PHI outside your environment."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {stages.map((s, i) => (
                <Reveal key={s.n} y={i % 2 ? 45 : -45}>
                  <div className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition hover:-translate-y-2 hover:border-cyan-400/50">
                    <div
                      className={`mb-6 sm:mb-10 grid size-11 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-slate-950 font-bold`}
                    >
                      <s.icon className="size-5" />
                    </div>
                    <span className="font-mono text-xs text-cyan-300 font-bold">{s.n}</span>
                    <h3 className="mt-3 text-lg font-semibold leading-tight">{s.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{s.text}</p>
                    <p className="mt-6 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                      {s.tag}
                    </p>
                    {i < 4 && (
                      <ChevronRight className="absolute -right-5 top-1/2 hidden size-5 text-cyan-400 lg:block -translate-y-1/2 z-10" />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 04: Features / Core Modules */}
        <section id="features" className="bg-[#f8fafc] py-20 sm:py-28 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionLabel
              num="03"
              eyebrow="Core modules"
              title="Designed for the hard parts of healthcare data."
              text="Purpose-built modules for the quality, identity, analytics, and governance challenges that generic data platforms miss."
            />
            <div className="flex flex-col gap-5">
              {features.map((f, i) => (
                <Reveal key={f.n} y={i % 2 ? 20 : 50}>
                  <article className="grid gap-6 sm:gap-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition hover:shadow-xl md:grid-cols-[90px_1fr_260px] md:p-9">
                    <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
                      <span className="font-mono text-xs font-bold text-cyan-600">{f.n}</span>
                      <f.icon className="size-6 md:size-7 md:mt-8 text-slate-400" />
                    </div>
                    <div>
                      <span className="rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 font-mono text-[10px] font-semibold tracking-wider text-cyan-700">
                        {f.badge}
                      </span>
                      <h3 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{f.title}</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 sm:leading-7 text-slate-600">{f.text}</p>
                      <ul className="mt-5 grid gap-2 text-sm text-slate-700">
                        {f.bullets.map((b) => (
                          <li key={b} className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 font-bold" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col justify-between rounded-2xl bg-slate-950 p-5 text-white shadow-inner">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">Signal</p>
                        <p className="mt-3 font-mono text-2xl sm:text-3xl font-bold tracking-tight">{f.metric}</p>
                        <p className="text-xs text-slate-400">{f.label}</p>
                      </div>
                      <p className="mt-6 sm:mt-8 border-t border-white/10 pt-4 font-mono text-[11px] leading-5 text-cyan-200">
                        {f.code}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 05: Architecture / Tech Stack */}
        <section id="stack" className="bg-white py-20 sm:py-28 border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionLabel
              num="04"
              eyebrow="Architecture"
              title="A stack that stays close to the data."
              text="Open technologies, embedded analytics, and local inference make the platform deployable inside the environments that protect your patients."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stack.map(([name, role], i) => (
                <Reveal key={name} y={(i % 3) * 20 + 25}>
                  <div className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg bg-[#fafcff]">
                    <div className="mb-6 sm:mb-8 flex size-9 items-center justify-center rounded-lg bg-slate-950 font-mono text-xs font-bold text-cyan-300">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <p className="font-semibold tracking-tight text-slate-900">{name}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{role}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 06: Roles / Multi-Tenant RBAC */}
        <section id="roles" className="bg-[#f8fafc] py-20 sm:py-28 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionLabel
              num="05"
              eyebrow="Multi-tenant RBAC"
              title="The right view for every team."
              text="Granular permissions keep clinical intelligence useful without compromising organizational boundaries."
            />
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map(([name, text, badge, Icon, tone], i) => (
                <Reveal key={name} y={i * 18 + 30}>
                  <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 transition hover:-translate-y-2 hover:shadow-xl">
                    <div className={`mb-8 sm:mb-12 flex size-12 items-center justify-center rounded-2xl border ${tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-slate-400">{badge}</span>
                    <h3 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-slate-900">{name}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{text}</p>
                    <Link
                      to="/login"
                      className="mt-6 sm:mt-8 flex items-center gap-2 text-xs font-semibold text-cyan-700 hover:text-cyan-800 transition group-hover:translate-x-1"
                    >
                      <span>Sign In as {name.split(' ')[0]}</span>
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 07: Security & Compliance */}
        <section id="security" className="relative overflow-hidden bg-slate-950 py-20 sm:py-28 text-white">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.02) 4px)',
            }}
          />
          <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 sm:gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                  <LockKeyhole className="size-3" /> HIPAA-Ready Enterprise Architecture
                </span>
                <h2 className="mt-5 sm:mt-7 max-w-2xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.05em]">
                  Clinical-grade security, privacy &amp; compliance.
                </h2>
                <p className="mt-5 sm:mt-6 max-w-xl text-sm sm:text-base leading-6 sm:leading-7 text-slate-400">
                  CareData keeps protected health information inside your environment. Gemini runs 100% locally, audit trails are immutable, and each organization remains isolated by design.
                </p>
                <div className="mt-8 sm:mt-9 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Zero Data Egress', CloudOff],
                    ['Immutable Audit Logs', FileCheck2],
                    ['Cryptographic Hashing', KeyRound],
                    ['Multi-Tenant Isolation', ShieldCheck],
                  ].map(([t, I]) => (
                    <div
                      key={t as string}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3.5 sm:p-4 backdrop-blur-sm"
                    >
                      <I className="size-4 text-cyan-300 shrink-0" />
                      <span className="text-sm font-medium text-slate-200">{t as string}</span>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal y={-35}>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:p-7 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 sm:pb-5">
                    <p className="font-mono text-xs font-semibold text-cyan-300">SECURITY POSTURE</p>
                    <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" />
                  </div>
                  <div className="py-6 sm:py-8 text-center">
                    <p className="font-mono text-5xl sm:text-7xl font-bold tracking-[-0.08em]">
                      0<span className="text-cyan-300">B</span>
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-slate-400">PHI transmitted to third parties</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:pt-5 text-center">
                    <div>
                      <p className="font-mono text-base sm:text-lg font-bold text-slate-200">bcrypt</p>
                      <p className="text-[10px] text-slate-400">password hashing</p>
                    </div>
                    <div>
                      <p className="font-mono text-base sm:text-lg font-bold text-slate-200">JWT</p>
                      <p className="text-[10px] text-slate-400">signed sessions</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Section 08: Implementation Roadmap */}
        <section id="roadmap" className="bg-white py-20 sm:py-28 border-b border-slate-100">
          <div className="mx-auto max-w-4xl px-5 lg:px-8">
            <SectionLabel
              num="07"
              eyebrow="Implementation roadmap"
              title="Built in the open. Ready for the next phase."
              text="A deliberate path from governed ingestion to local intelligence, with each milestone shippable and auditable."
            />
            <div className="relative mt-8 sm:mt-12">
              <div className="absolute bottom-5 left-[7px] top-5 w-px bg-slate-200" />
              <div className="flex flex-col gap-10 sm:gap-12">
                {roadmap.map(([phase, status, title, desc]) => (
                  <Reveal key={phase} y={35}>
                    <div className="relative grid grid-cols-[16px_1fr] gap-5 sm:gap-7">
                      <div
                        className={`relative z-10 mt-1 size-4 rounded-full border-4 border-white ${
                          status === 'Active'
                            ? 'bg-cyan-500 shadow-[0_0_0_5px_rgba(6,182,212,0.18)] animate-pulse'
                            : status === 'Live'
                            ? 'bg-cyan-600'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div className="grid gap-2 sm:gap-3 md:grid-cols-[150px_1fr]">
                        <div>
                          <p className="font-mono text-xs font-bold text-cyan-600">{phase}</p>
                          <span
                            className={`mt-1.5 sm:mt-2 inline-block rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase ${
                              status === 'Complete'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">{title}</h3>
                          <p className="mt-1.5 sm:mt-2 text-sm leading-6 text-slate-500">{desc}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 09: Bottom CTA */}
        <section id="cta" className="px-4 sm:px-5 py-16 sm:py-24 lg:px-8 bg-[#f8fafc]">
          <Reveal y={55}>
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-600 via-teal-600 to-blue-700 px-5 sm:px-7 py-12 sm:py-16 text-white md:px-16 shadow-2xl">
              <div className="absolute -right-24 -top-32 size-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100 font-semibold">
                    Ashore Systems / CareData Intelligence
                  </span>
                  <h2 className="mt-4 sm:mt-5 max-w-3xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.05em]">
                    Ready to experience next-gen healthcare intelligence?
                  </h2>
                  <p className="mt-4 sm:mt-5 max-w-xl text-cyan-50/90 text-sm sm:text-base leading-relaxed">
                    Turn fragmented clinical data into a governed, queryable, private intelligence layer.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {user ? (
                    <Link
                      to="/dashboard"
                      className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-cyan-800 transition hover:-translate-y-1 shadow-lg inline-flex items-center gap-2"
                    >
                      <span>Open Live Console</span>
                      <ArrowUpRight className="size-4" />
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-cyan-800 transition hover:-translate-y-1 shadow-lg inline-flex items-center gap-2"
                      >
                        <span>Sign In to Console</span>
                        <ArrowUpRight className="size-4" />
                      </Link>
                      <Link
                        to="/register"
                        className="rounded-full border border-white/50 px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-1 hover:bg-white/10 inline-flex items-center gap-2"
                      >
                        <span>Create Account</span>
                        <Play className="size-4" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Enterprise Institutional Footer */}
      <footer className="border-t border-white/10 bg-slate-950 text-slate-400">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:py-16 lg:px-8">
          <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <Link to="/" className="flex items-center shrink-0 mb-4 inline-block" aria-label="CareData Intelligence Home">
                <BrandLogo theme="dark" size="md" imgClassName="h-10 sm:h-12 w-auto" />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
                Unified clinical intelligence for healthcare organizations that cannot compromise on privacy.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-mono text-cyan-300">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span>Lakehouse Cluster Active</span>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Product</p>
              <div className="mt-5 flex flex-col gap-3 text-sm">
                <button onClick={() => scrollTo('features')} className="text-left transition hover:text-white">
                  Features
                </button>
                <button onClick={() => scrollTo('architecture')} className="text-left transition hover:text-white">
                  Architecture
                </button>
                <button onClick={() => scrollTo('security')} className="text-left transition hover:text-white">
                  Security
                </button>
                <button onClick={() => scrollTo('roles')} className="text-left transition hover:text-white">
                  Multi-Tenant RBAC
                </button>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Resources</p>
              <div className="mt-5 flex flex-col gap-3 text-sm">
                <a
                  href="http://localhost:8080/swagger"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition hover:text-white"
                >
                  <span>API Docs (Swagger)</span>
                  <ExternalLink className="size-3 text-cyan-400" />
                </a>
                <a
                  href="https://github.com/AshoreSystems/CareData-Intelligence"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition hover:text-white"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="size-3 text-cyan-400" />
                </a>
                <button onClick={() => scrollTo('telemetry')} className="text-left transition hover:text-white">
                  Live Telemetry
                </button>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Company</p>
              <div className="mt-5 flex flex-col gap-3 text-sm">
                <span className="text-slate-300 font-medium">Ashore Systems</span>
                <span className="text-xs text-slate-500">Enterprise Healthcare Solutions</span>
                <button onClick={() => scrollTo('roadmap')} className="text-left transition hover:text-white mt-1">
                  Roadmap &amp; Delivery
                </button>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs md:flex-row text-slate-500">
            <span>© 2026 Ashore Systems. All rights reserved.</span>
            <span className="font-mono text-cyan-300">
              CAREDATA / v1.0 — ENTERPRISE HEALTHCARE LAKEHOUSE
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage as LandingPageV2 };
export default LandingPage;
