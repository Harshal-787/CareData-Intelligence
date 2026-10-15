import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  LogOut,
  Building2,
  Activity,
  Shield,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { User } from "../../types/auth";
import { cn } from "../../lib/utils";

interface UserProfileDropdownProps {
  user: User | null;
  logout: () => void;
  isSuperAdmin?: boolean;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  logout,
  isSuperAdmin = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const initials =
    user?.fullName
      ? user.fullName
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : isSuperAdmin
      ? "DR"
      : "US";

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl transition-all border text-left",
          isOpen
            ? "bg-slate-100/90 border-slate-300/80 shadow-xs ring-2 ring-cyan-500/20"
            : "border-transparent hover:bg-slate-50/90 hover:border-slate-200/80 shadow-2xs"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-[11px] font-bold text-white shadow-xs">
          {initials}
        </div>
        <div className="hidden leading-tight sm:block min-w-[80px]">
          <p className="text-[12px] font-bold text-slate-900 truncate max-w-[130px]">
            {user?.fullName || (isSuperAdmin ? "Dr. Alexander Wright" : "Healthcare Analyst")}
          </p>
          <p className="text-[10px] font-medium text-slate-500 truncate max-w-[130px]">
            {user?.role?.replace("_", " ") || (isSuperAdmin ? "SUPER ADMIN" : "DATA ANALYST")}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "hidden size-3.5 text-slate-400 sm:block transition-transform duration-200",
            isOpen && "rotate-180 text-cyan-600"
          )}
        />
      </button>

      {/* Floating Enterprise Dropdown Card (Rendered ONLY when isOpen is true, absolutely avoiding any peeking clipping bug) */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2.5 w-72 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
          role="menu"
        >
          {/* User Profile Header Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 mb-2">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-xs font-bold text-white shadow-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || (isSuperAdmin ? "Dr. Alexander Wright" : "Healthcare Analyst")}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.email || (isSuperAdmin ? "superadmin@caredata.internal" : "analyst@caredata.internal")}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-cyan-100/70 text-cyan-800">
                  <Shield className="size-2.5" />
                  {user?.role?.replace("_", " ") || (isSuperAdmin ? "SUPER ADMIN" : "DATA ANALYST")}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Organization / Tenant Pill */}
          <div className="px-3 py-2 rounded-xl bg-cyan-50/50 border border-cyan-100/60 mb-2 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 flex items-center justify-between">
              <span>Current Tenant</span>
              <Building2 className="size-3 text-cyan-600" />
            </div>
            <p className="font-semibold text-slate-800 mt-0.5 truncate">
              {user?.organization?.name || (isSuperAdmin ? "CareData Platform (Multi-Tenant)" : "Mount Sinai Health System")}
            </p>
          </div>

          {/* Menu Actions */}
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavigate(isSuperAdmin ? "/superadmin/profile" : "/settings")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-100/80 rounded-xl transition-colors text-left"
              role="menuitem"
            >
              <UserIcon className="size-3.5 text-slate-400" />
              <span>Account & Security Settings</span>
            </button>

            {isSuperAdmin ? (
              <>
                <button
                  onClick={() => handleNavigate("/superadmin/organizations")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-100/80 rounded-xl transition-colors text-left"
                  role="menuitem"
                >
                  <Building2 className="size-3.5 text-slate-400" />
                  <span>Switch Tenant / Organizations</span>
                </button>
                <button
                  onClick={() => handleNavigate("/superadmin/health")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-100/80 rounded-xl transition-colors text-left"
                  role="menuitem"
                >
                  <Activity className="size-3.5 text-slate-400" />
                  <span>Node & Cluster Telemetry</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigate("/dashboard")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-100/80 rounded-xl transition-colors text-left"
                role="menuitem"
              >
                <Sparkles className="size-3.5 text-slate-400" />
                <span>Clinical Overview Dashboard</span>
              </button>
            )}

            <a
              href="http://localhost:8080/swagger"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:text-cyan-700 hover:bg-slate-100/80 rounded-xl transition-colors text-left"
              role="menuitem"
            >
              <span className="flex items-center gap-2.5">
                <ExternalLink className="size-3.5 text-slate-400" />
                <span>Swagger REST API Docs</span>
              </span>
              <span className="text-[10px] text-slate-400">v1.4</span>
            </a>
          </div>

          <div className="h-px bg-slate-100 my-1.5" />

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/80 rounded-xl transition-colors text-left group/out"
            role="menuitem"
          >
            <span>Sign Out Session</span>
            <LogOut className="size-3.5 text-rose-400 group-hover/out:text-rose-600 transition-colors" />
          </button>
        </div>
      )}
    </div>
  );
};
