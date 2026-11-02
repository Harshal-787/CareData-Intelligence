import React, { useState, useEffect } from 'react';
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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  Settings,
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { UserProfileDropdown } from '../components/common/UserProfileDropdown';
import { GlobalSearchModal } from '../components/common/GlobalSearchModal';
import { NotificationPopover } from '../components/common/NotificationPopover';
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
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const activeItem = filteredNavItems.find((i) => {
    if (i.path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(i.path);
  });
  const activeLabel = activeItem?.label || 'Overview';

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-slate-900 font-sans antialiased">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-200 bg-white transition-all duration-300",
          collapsed && "lg:w-[78px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
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
            {filteredNavItems.filter((i) => i.section !== 'admin').map((item) => {
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

          {/* Admin Section if authorized */}
          {filteredNavItems.some((i) => i.section === 'admin') && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                  Governance
                </p>
              )}
              <nav className="space-y-1">
                {filteredNavItems.filter((i) => i.section === 'admin').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem?.path === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition-all",
                        isActive 
                          ? "bg-slate-900 text-white shadow-sm" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <Icon className="size-[17px] shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}
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
        {/* Animated Top Navigation Bar (overflow-visible for clean popovers) */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 shadow-[0_1px_15px_rgba(15,23,42,0.03)] backdrop-blur-2xl sm:px-8 relative transition-all">
          {/* Subtle Animated Shimmer Line at Top Edge */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse pointer-events-none" />

          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(true)} 
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors" 
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex font-medium">
              <span className="hover:text-slate-900 transition-colors cursor-pointer" onClick={() => navigate('/dashboard')}>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                {activeLabel}
              </span>
            </div>
          </div>
          
          {/* Right: Engine Status, Docs, Search, Notifications, User */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Engine Status Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/70 text-[11px] font-semibold text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>DuckDB OLAP Live</span>
            </div>

            <a 
              href="http://localhost:8080/swagger" 
              target="_blank" 
              rel="noreferrer" 
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100/80 px-3 py-1.5 rounded-xl transition-all border border-cyan-200/70 shadow-2xs"
            >
              API Docs <span className="text-xs">↗</span>
            </a>
            
            {/* Mobile Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex md:hidden p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors"
              aria-label="Open search command palette"
            >
              <Search className="size-4 text-slate-500" />
            </button>

            {/* Interactive Command Palette Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="relative hidden md:flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-cyan-400 hover:bg-white hover:text-slate-800 transition-all w-52 lg:w-64 shadow-2xs group cursor-pointer"
              aria-label="Open search command palette"
            >
              <div className="flex items-center gap-2">
                <Search className="size-3.5 text-slate-400 group-hover:text-cyan-600 shrink-0 transition-colors" />
                <span className="truncate">Quick search lakehouse...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 group-hover:text-cyan-700 bg-white border border-slate-200 rounded-md shadow-2xs transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Enterprise Notification Popover */}
            <NotificationPopover isSuperAdmin={false} />
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            
            {/* Enterprise User Profile Dropdown */}
            <UserProfileDropdown user={user} logout={logout} isSuperAdmin={false} />
          </div>

          {/* Bottom Edge Ambient Shimmer Gradient */}
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />
        </header>
        
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        isSuperAdmin={false}
      />
    </div>
  );
};

export default DashboardLayout;
