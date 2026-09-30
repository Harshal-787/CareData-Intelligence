import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Activity,
  FileSpreadsheet,
  ShieldCheck,
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  X,
  Settings
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { cn } from '../lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
  section?: 'workspace' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, roles: ['ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'], section: 'workspace' },
  { label: 'Datasets & Lake', path: '/datasets', icon: Database, roles: ['ORG_ADMIN', 'DATA_ANALYST'], section: 'workspace' },
  { label: 'Data quality', path: '/quality', icon: CheckCircle2, roles: ['ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'], section: 'workspace' },
  { label: 'Patient deduplication', path: '/deduplication', icon: Users2, roles: ['ORG_ADMIN', 'DATA_ANALYST'], section: 'workspace' },
  { label: 'Healthcare analytics', path: '/analytics', icon: BarChart3, roles: ['ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'], section: 'workspace' },
  { label: 'ML risk & anomalies', path: '/ml-predictions', icon: BrainCircuit, roles: ['ORG_ADMIN', 'DATA_ANALYST'], section: 'workspace' },
  { label: 'Ask AI', path: '/ai-insights', icon: Bot, roles: ['ORG_ADMIN', 'DATA_ANALYST'], badge: 'AI', section: 'workspace' },
  { label: 'Pipeline orchestrator', path: '/pipelines', icon: Activity, roles: ['ORG_ADMIN', 'DATA_ANALYST'], badge: 'RUN', section: 'workspace' },
  { label: 'Clinical reports', path: '/reports', icon: FileSpreadsheet, roles: ['ORG_ADMIN', 'DATA_ANALYST', 'VIEWER'], section: 'workspace' },
  { label: 'User Management', path: '/admin/users', icon: ShieldCheck, roles: ['ORG_ADMIN'], section: 'workspace' },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: Settings, roles: ['ORG_ADMIN'], section: 'workspace' },
];

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const activeItem = filteredNavItems.find(i => {
    if (i.path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(i.path);
  });
  const activeLabel = activeItem?.label || 'Overview';

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-slate-900 font-sans antialiased">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-200 bg-white transition-all duration-300",
        collapsed && "lg:w-[78px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-[78px] items-center justify-between border-b border-slate-100 px-5">
          <BrandLogo collapsed={collapsed} />
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors lg:block" 
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <button 
            onClick={() => setMobileOpen(false)} 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-900" 
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-7">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
              Healthcare Workspace
            </p>
          )}
          <nav className="space-y-1">
            {filteredNavItems.filter(i => i.section !== 'admin').map((item) => {
              const Icon = item.icon;
              const isActive = activeItem?.path === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition-all",
                    isActive 
                      ? "bg-cyan-50 text-cyan-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_1px_2px_0_rgba(6,182,212,0.05)] border border-cyan-100/50" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("size-[17px] shrink-0 transition-colors", isActive ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-[9px] font-bold text-cyan-600 tracking-wide shadow-sm shadow-cyan-200/50">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>


      </aside>

      {mobileOpen && (
        <button 
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden transition-opacity" 
          onClick={() => setMobileOpen(false)} 
          aria-label="Close navigation overlay" 
        />
      )}

      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-300", 
        collapsed ? "lg:pl-[78px]" : "lg:pl-[252px]"
      )}>
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 shadow-[0_1px_12px_rgba(15,23,42,0.03)] backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(true)} 
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden" 
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span>Workspace</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">{activeLabel}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-5">
            <a href="http://localhost:8080/swagger" target="_blank" rel="noreferrer" className="hidden sm:inline-block text-[10px] font-bold tracking-wide text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1.5 rounded-lg transition-colors border border-cyan-100/50">
              API Docs ↗
            </a>
            
            <button className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 sm:block transition-colors" aria-label="Search">
              <Search className="size-[18px]" />
            </button>
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-label="Notifications">
              <Bell className="size-[18px]" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-cyan-500 ring-2 ring-white shadow-sm" />
            </button>
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            
            <div 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 pr-2 rounded-xl transition-colors border border-transparent hover:border-slate-100"
            >
              <div className="grid size-8 place-items-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700 shadow-inner shadow-white/50">
                {user?.fullName?.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="hidden leading-tight sm:block min-w-[80px]">
                <p className="text-[11px] font-bold text-slate-900 truncate max-w-[120px]">{user?.fullName || 'User Name'}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.role?.replace('_', ' ') || 'Role'}</p>
              </div>
              <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-6 sm:p-8 lg:p-10 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
