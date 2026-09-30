import React, { useState } from "react";
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
  Bell,
  Activity,
  ShieldAlert,
  ChevronDown,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { BrandLogo } from "../components/common/BrandLogo";
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
  const navigate = useNavigate();
  const location = useLocation();

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
              Super Admin
            </p>
          )}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem.path === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition-all",
                    isActive
                      ? "bg-cyan-50 text-cyan-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_1px_2px_0_rgba(6,182,212,0.05)] border border-cyan-100/50"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent",
                    collapsed && "justify-center px-2",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "size-[17px] shrink-0 transition-colors",
                      isActive
                        ? "text-cyan-600"
                        : "text-slate-400 group-hover:text-slate-600",
                    )}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
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
        />
      )}

      <div
        className={cn(
          "min-h-screen flex flex-col transition-all duration-300",
          collapsed ? "lg:pl-[78px]" : "lg:pl-[252px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 shadow-[0_1px_12px_rgba(15,23,42,0.03)] backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span>Super Admin</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {activeItem.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-5">
            <a
              href="http://localhost:8080/swagger"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-block text-[10px] font-bold tracking-wide text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1.5 rounded-lg transition-colors border border-cyan-100/50"
            >
              API Docs ↗
            </a>

            <button
              className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 sm:block transition-colors"
              aria-label="Search"
            >
              <Search className="size-[18px]" />
            </button>
            <button
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-cyan-500 ring-2 ring-white shadow-sm" />
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="relative group/profile">
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 pr-2 rounded-xl transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="grid size-8 place-items-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700 shadow-inner shadow-white/50">
                  {user?.fullName?.slice(0, 2).toUpperCase() || "SA"}
                </div>
                <div className="hidden leading-tight sm:block min-w-[80px]">
                  <p className="text-[11px] font-bold text-slate-900 truncate max-w-[120px]">
                    {user?.fullName || "Super Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user?.role?.replace("_", " ") || "Role"}
                  </p>
                </div>
                <ChevronDown className="hidden size-3.5 text-slate-400 sm:block group-hover/profile:text-slate-600 transition-colors" />
              </div>

              {/* Profile Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 z-50 py-1 origin-top-right scale-95 group-hover/profile:scale-100">
                 <button onClick={() => navigate("/superadmin/profile")} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-cyan-600 transition-colors">
                    My Profile
                 </button>
                 <div className="h-px bg-slate-100 my-1" />
                 <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors flex items-center justify-between group/btn">
                    Sign Out <LogOut className="size-4 text-rose-400 group-hover/btn:text-rose-600 transition-colors" />
                 </button>
              </div>
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
