import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Settings,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Search,
  Activity,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import { BrandLogo } from "../components/common/BrandLogo";
import { UserProfileDropdown } from "../components/common/UserProfileDropdown";
import { GlobalSearchModal } from "../components/common/GlobalSearchModal";
import { NotificationPopover } from "../components/common/NotificationPopover";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  {
    label: "Platform Overview",
    path: "/superadmin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Organizations & Tenants",
    path: "/superadmin/organizations",
    icon: Building2,
  },
  {
    label: "System Health & Metrics",
    path: "/superadmin/health",
    icon: Activity,
  },
  {
    label: "Global Audit Logs",
    path: "/superadmin/audit-logs",
    icon: ShieldAlert,
  },
  { label: "Platform Settings", path: "/superadmin/settings", icon: Settings },
];

export const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeItem =
    NAV_ITEMS.find((i) => location.pathname.startsWith(i.path)) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-slate-900 font-sans antialiased">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-200 bg-white transition-all duration-300",
          collapsed && "lg:w-[78px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-[78px] items-center justify-between border-b border-slate-100 px-5">
          <BrandLogo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors lg:block"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-900"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-7">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
              Core Administration
            </p>
          )}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            <ShieldAlert className="size-4 shrink-0 text-slate-400" />
            {!collapsed && <span>Exit Super Admin</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "min-h-screen flex flex-col transition-all duration-300",
          collapsed ? "lg:pl-[78px]" : "lg:pl-[252px]",
        )}
      >
        {/* Animated Top Navigation Bar (overflow visible to allow clean popovers) */}
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
              <span className="hover:text-slate-900 transition-colors cursor-pointer" onClick={() => navigate("/superadmin/dashboard")}>Super Admin</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                {activeItem.label}
              </span>
            </div>
          </div>

          {/* Right: Platform Status, Docs, Search, Notifications, User */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/70 text-[11px] font-semibold text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Platform Multi-Tenant Live</span>
            </div>

            <a
              href="http://localhost:8080/swagger"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100/80 px-3 py-1.5 rounded-xl transition-all border border-cyan-200/70 shadow-2xs"
            >
              API Docs <span className="text-xs">↗</span>
            </a>

            {/* Expandable Enterprise Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="relative hidden md:flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-cyan-400 hover:bg-white hover:text-slate-800 transition-all w-52 lg:w-64 shadow-2xs group cursor-pointer"
              aria-label="Open search command palette"
            >
              <div className="flex items-center gap-2">
                <Search className="size-3.5 text-slate-400 group-hover:text-cyan-600 shrink-0 transition-colors" />
                <span className="truncate">Search tenants, audits...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 group-hover:text-cyan-700 bg-white border border-slate-200 rounded-md shadow-2xs transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Enterprise Notification Popover */}
            <NotificationPopover isSuperAdmin={true} />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Enterprise User Profile Dropdown (Completely removes clipping / peeking bug) */}
            <UserProfileDropdown user={user} logout={logout} isSuperAdmin={true} />
          </div>

          {/* Bottom Edge Shimmer Line */}
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />
        </header>

        <main className="flex-1 p-6 sm:p-8 lg:p-10 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        isSuperAdmin={true}
      />
    </div>
  );
};
export default SuperAdminLayout;
