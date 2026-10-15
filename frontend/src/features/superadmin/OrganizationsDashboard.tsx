import React, { useEffect, useState } from "react";
import api from "../../api/client";
import { User } from "../../types/auth";
import {
  Building2,
  Users,
  Shield,
  CheckCircle2,
  Clock,
  X,
  Mail,
  Calendar,
  Activity,
  ChevronRight,
  Search,
  Ban,
} from "lucide-react";
import { cn } from "../../lib/utils";

export const OrganizationsDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "PENDING"
  >("ALL");

  // Slide-over State
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, orgsRes] = await Promise.all([
          api.get("/users"),
          api.get("/organizations"),
        ]);
        setUsers(usersRes.data || []);
        setOrgs(orgsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStatusChange = async (
    orgId: string,
    isActive: boolean,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/organizations/${orgId}/status`, { isActive });
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, isActive } : o)),
      );
      if (selectedOrg?.id === orgId) {
        setSelectedOrg({ ...selectedOrg, isActive });
      }
    } catch (err) {
      console.error("Failed to update organization status", err);
    }
  };

  const orgMap = orgs.reduce(
    (acc, org) => {
      acc[org.id] = {
        ...org,
        users: [],
        orgAdmins: 0,
        analysts: 0,
        viewers: 0,
      };
      return acc;
    },
    {} as Record<string, any>,
  );

  users.forEach((user) => {
    if (orgMap[user.organizationId]) {
      orgMap[user.organizationId].users.push(user);
      if (user.role === "ORG_ADMIN") orgMap[user.organizationId].orgAdmins++;
      if (user.role === "DATA_ANALYST") orgMap[user.organizationId].analysts++;
      if (user.role === "VIEWER") orgMap[user.organizationId].viewers++;
    }
  });

  // Convert map to array and apply filters
  const processedOrgs = (Object.values(orgMap) as any[]).filter((org: any) => {
    const matchesSearch = (org.name || org.id)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
          ? org.isActive === true
          : org.isActive === false;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Organizations & Tenants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global view of all provisioned healthcare organizations and their
            staff across the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 w-[240px] shadow-sm transition-all"
            />
          </div>
          <button className="btn-primary">
            <Building2 className="h-3.5 w-3.5" /> Onboard New
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80">
        {[
          { id: "ALL", label: "All Organizations", count: orgs.length },
          {
            id: "ACTIVE",
            label: "Active",
            count: orgs.filter((o) => o.isActive).length,
          },
          {
            id: "PENDING",
            label: "Pending Approval",
            count: orgs.filter((o) => !o.isActive).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative",
              statusFilter === tab.id
                ? "text-cyan-600"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-xl",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                statusFilter === tab.id
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {tab.count}
            </span>
            {statusFilter === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4 tracking-wider uppercase text-[10px]">
                  Organization Details
                </th>
                <th className="px-6 py-4 tracking-wider uppercase text-[10px]">
                  Staff Distribution
                </th>
                <th className="px-6 py-4 tracking-wider uppercase text-[10px]">
                  Role Metrics
                </th>
                <th className="px-6 py-4 tracking-wider uppercase text-[10px]">
                  Platform Status
                </th>
                <th className="px-6 py-4 text-right tracking-wider uppercase text-[10px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      <p className="text-sm font-medium">
                        Loading platform tenants...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : processedOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <Search className="size-6" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        No organizations found matching criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedOrgs.map((orgData: any) => (
                  <tr
                    key={orgData.id}
                    onClick={() => setSelectedOrg(orgData)}
                    className="hover:bg-cyan-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100/50 shadow-sm group-hover:scale-105 transition-transform">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                            {orgData.name || orgData.id}
                          </p>
                          <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                            ID: {orgData.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <Users className="size-4 text-slate-400" />
                        {orgData.users.length} Active Staff
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-semibold border border-blue-100">
                          {orgData.analysts} Analysts
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold border border-slate-200">
                          {orgData.viewers} Viewers
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/50 shadow-sm">
                        <Shield className="h-3 w-3" /> {orgData.orgAdmins}{" "}
                        Admins
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {orgData.isActive ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            Active
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100/50 w-max">
                          <Clock className="size-3.5 text-amber-500" />
                          <span className="text-amber-700 font-bold text-[11px]">
                            Pending Approval
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        {!orgData.isActive && (
                          <button
                            onClick={(e) =>
                              handleStatusChange(orgData.id, true, e)
                            }
                            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                          >
                            <CheckCircle2 className="size-3.5" /> Accept
                          </button>
                        )}
                        <button className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
                          Manage <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Organization Details Drawer */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrg(null)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-xl flex">
            <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 shadow-sm">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedOrg.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Tenant ID: {selectedOrg.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Status & Actions Section */}
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Platform Access Status
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      {selectedOrg.isActive ? (
                        <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                          <Clock className="size-5 text-amber-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedOrg.isActive
                            ? "Active & Authenticated"
                            : "Pending Verification"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                          {selectedOrg.isActive
                            ? "Users can log in and access allowed platform features."
                            : "Awaiting superadmin approval to grant platform access."}
                        </p>
                      </div>
                    </div>

                    {!selectedOrg.isActive ? (
                      <button
                        onClick={() => handleStatusChange(selectedOrg.id, true)}
                        className="shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm shadow-emerald-500/20"
                      >
                        Approve Access
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleStatusChange(selectedOrg.id, false)
                        }
                        className="shrink-0 flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-transparent hover:border-rose-100"
                      >
                        <Ban className="size-4" /> Suspend
                      </button>
                    )}
                  </div>
                </section>

                {/* Org Details */}
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Organization Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                        <Calendar className="size-3" /> Onboarded Date
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(selectedOrg.createdAt).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "long", day: "numeric" },
                        )}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                        <Activity className="size-3" /> Total Staff Members
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedOrg.users?.length || 0} Users
                      </p>
                    </div>
                  </div>
                </section>

                {/* Login Access / Users */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Login Access & Identities
                    </h3>
                    <button className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 px-2 py-1 rounded">
                      View Full Audit Log
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {selectedOrg.users?.length > 0 ? (
                      <ul className="divide-y divide-slate-100">
                        {selectedOrg.users.map((user: User) => (
                          <li
                            key={user.id}
                            className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase border border-slate-200">
                                {user.fullName?.slice(0, 2) || "US"}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {user.fullName}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Mail className="size-3" /> {user.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                                  user.role === "ORG_ADMIN"
                                    ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                                    : user.role === "DATA_ANALYST"
                                      ? "bg-blue-50 text-blue-700 border-blue-100"
                                      : "bg-slate-100 text-slate-600 border-slate-200",
                                )}
                              >
                                {user.role.replace("_", " ")}
                              </span>
                              {user.isActive ? (
                                <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                                  <CheckCircle2 className="size-2.5" /> LOGIN
                                  ENABLED
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1">
                                  <Ban className="size-2.5" /> LOGIN DISABLED
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No user identities found for this organization.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
