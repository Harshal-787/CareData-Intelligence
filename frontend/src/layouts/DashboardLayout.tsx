import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import {
  LayoutDashboard,
  Database,
  CheckCircle2,
  Users2,
  BarChart3,
  BrainCircuit,
  Bot,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Activity,
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import clsx from 'clsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'] },
  // { label: 'Live Streaming', path: '/streaming', icon: Radio, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'], badge: 'LIVE' },
  { label: 'Datasets & Lake', path: '/datasets', icon: Database, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST'] },
  { label: 'Data Quality', path: '/quality', icon: CheckCircle2, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'] },
  { label: 'Patient Deduplication', path: '/deduplication', icon: Users2, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST'] },
  { label: 'Healthcare Analytics', path: '/analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'] },
  { label: 'ML Risk & Anomalies', path: '/ml-predictions', icon: BrainCircuit, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST'] },
  { label: 'Ask AI (Ollama)', path: '/ai-insights', icon: Bot, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST'], badge: 'AI' },
  { label: 'Pipeline Orchestrator', path: '/pipelines', icon: Activity, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST'], badge: 'RUN' },
  { label: 'Clinical Reports', path: '/reports', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'] },
  { label: 'User Management', path: '/admin/users', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: Settings, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
];

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role?: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'ORG_ADMIN':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'DATA_ANALYST':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'VIEWER':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] text-slate-100 antialiased overflow-hidden">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col border-r border-slate-800/80 bg-[#0d1322] transition-all duration-300 z-20',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
          {!collapsed && <BrandLogo size="md" />}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <span className="font-mono text-sm font-bold">CD</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950/40'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Profile */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0b0f19]/60">
          {!collapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-xs font-bold text-white uppercase">
                  {user?.fullName.slice(0, 2) || 'CD'}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full justify-center p-2 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur px-6 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <Building2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Org: <strong className="text-white font-medium">{user?.organization?.name || 'CareData Health System'}</strong></span>
            </div>
          </div>

          {/* Header Action & Role Badge */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-[11px] px-2.5 py-1 rounded-md font-medium text-slate-300 bg-slate-800/80 border border-slate-700 hover:text-cyan-400 hover:bg-slate-800 transition flex items-center gap-1"
              title="View Public Landing Page"
            >
              <span>Platform Overview</span>
            </Link>
            <a
              href="http://localhost:8080/swagger"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] px-2.5 py-1 rounded-md font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 hover:bg-cyan-900/60 transition flex items-center gap-1"
              title="Open Interactive Swagger OpenAPI Documentation"
            >
              <span>Swagger API Docs ↗</span>
            </a>
            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:inline" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Role:</span>
              <span className={clsx('text-[11px] px-2.5 py-1 rounded-md font-semibold border uppercase tracking-wider', getRoleBadgeColor(user?.role))}>
                {user?.role.replace('_', ' ') || 'USER'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0b0f19]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
