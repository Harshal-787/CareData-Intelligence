import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  Database,
  CheckCircle2,
  Shield,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: "Pipeline" | "Quality" | "Security" | "System";
  time: string;
  read: boolean;
  path: string;
  severity: "info" | "success" | "warning";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Lakehouse Columnar Sync Complete",
    description: "1,200 inpatient encounters and 10,800 validated metrics synchronized into Parquet Lakehouse storage.",
    category: "Pipeline",
    time: "5m ago",
    read: false,
    path: "/datasets",
    severity: "success",
  },
  {
    id: "notif-2",
    title: "Data Quality Engine Health: 96.55%",
    description: "Automated scan passed 9 integrity rules with 0 critical schema errors. 1 rule warning on discharge disposition.",
    category: "Quality",
    time: "28m ago",
    read: false,
    path: "/quality",
    severity: "success",
  },
  {
    id: "notif-3",
    title: "MPI Fellegi-Sunter Deduplication",
    description: "Probabilistic record linkage resolved 2 duplicate pairs with 98.4% match confidence across active MRNs.",
    category: "Quality",
    time: "1h ago",
    read: false,
    path: "/deduplication",
    severity: "info",
  },
  {
    id: "notif-4",
    title: "Gemini 3.6 Flash Engine Active",
    description: "AST SQL safety firewall analyzed 142 natural language clinical queries with zero injection attempts.",
    category: "Security",
    time: "3h ago",
    read: true,
    path: "/settings",
    severity: "success",
  },
  {
    id: "notif-5",
    title: "DuckDB Analytical Cache Rebuilt",
    description: "Vectorized columnar index rebuilt in 14ms. Ready for sub-second aggregations.",
    category: "System",
    time: "Yesterday",
    read: true,
    path: "/analytics",
    severity: "info",
  },
];

const STORAGE_KEY = "caredata_enterprise_notifications_v1";

interface NotificationPopoverProps {
  isSuperAdmin?: boolean;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isSuperAdmin = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "Pipeline" | "Quality" | "Security">("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read;
    if (filter === "ALL") return true;
    return n.category === filter;
  });

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleReadStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // mark clicked as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setIsOpen(false);
    navigate(isSuperAdmin && item.path === "/settings" ? "/superadmin/settings" : item.path);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Pipeline":
        return Database;
      case "Quality":
        return CheckCircle2;
      case "Security":
        return Shield;
      default:
        return Activity;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95",
          isOpen && "bg-slate-100 text-slate-900 ring-2 ring-cyan-500/20"
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-cyan-600 text-[9px] font-extrabold text-white ring-2 ring-white shadow-xs animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 px-2 py-1 rounded-lg hover:bg-cyan-50 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 bg-white text-[11px] font-semibold overflow-x-auto scrollbar-none">
            {(["ALL", "UNREAD", "Pipeline", "Quality", "Security"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all whitespace-nowrap",
                  filter === cat
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {cat === "ALL" ? "All" : cat === "UNREAD" ? `Unread (${unreadCount})` : cat}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="size-10 rounded-full bg-slate-100 text-slate-400 grid place-items-center mx-auto mb-2.5">
                  <Bell className="size-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">No notifications</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You are completely caught up with all pipeline and quality alerts.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const Icon = getCategoryIcon(notif.category);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 cursor-pointer transition-colors text-left group relative",
                      notif.read ? "bg-white hover:bg-slate-50/80" : "bg-cyan-50/30 hover:bg-cyan-50/60"
                    )}
                  >
                    <div
                      className={cn(
                        "size-8 rounded-xl grid place-items-center shrink-0 mt-0.5",
                        notif.category === "Pipeline"
                          ? "bg-blue-100 text-blue-700"
                          : notif.category === "Quality"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-purple-100 text-purple-700"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            "text-xs font-bold truncate",
                            notif.read ? "text-slate-800" : "text-slate-900 font-extrabold"
                          )}
                        >
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="size-1.5 rounded-full bg-cyan-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                        {notif.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                        <span>{notif.time}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">
                          {notif.category}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => toggleReadStatus(notif.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                      >
                        <CheckCheck className="size-3.5" />
                      </button>
                      <ArrowRight className="size-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(isSuperAdmin ? "/superadmin/health" : "/pipelines");
              }}
              className="text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1"
            >
              <span>{isSuperAdmin ? "Cluster Health Telemetry" : "View Pipeline Status"}</span>
              <ExternalLink className="size-3" />
            </button>
            <span className="text-slate-400 text-[10px]">Active Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};
