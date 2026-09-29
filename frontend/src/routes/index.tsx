import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";

// Pages
import { Login } from "../features/auth/Login";
import { Register } from "../features/auth/Register";
import { DashboardHome } from "../features/dashboard/Home";
import { UsersAdmin } from "../features/admin/Users";
import { AuditLogsAdmin } from "../features/admin/AuditLogs";
import { DatasetsPage } from "../features/datasets/Datasets";
import { QualityPage } from "../features/quality/QualityPage";
import { DeduplicationPage } from "../features/deduplication/DeduplicationPage";
import { AnalyticsPage } from "../features/analytics/AnalyticsPage";
import { MLPredictionsPage } from "../features/ml/MLPredictionsPage";
import { AIInsightsPage } from "../features/ai/AIInsightsPage";
import { PipelinePage } from "../features/pipelines/PipelinePage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { StreamingPage } from "../features/streaming/StreamingPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { SuperAdminDashboard } from "../features/superadmin/SuperAdminDashboard";
import { OrganizationsDashboard } from "../features/superadmin/OrganizationsDashboard";
import { SuperAdminLayout } from "../layouts/SuperAdminLayout";
import { SystemHealth, BillingSubscriptions, GlobalAuditLogs, PlatformSettings } from "../features/superadmin/Placeholders";
import { SuperAdminProfile } from "../features/superadmin/SuperAdminProfile";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirects to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Authenticated Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Super Admin Dashboard (Completely Separate) */}
        <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="organizations" element={<OrganizationsDashboard />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="billing" element={<BillingSubscriptions />} />
            <Route path="audit-logs" element={<GlobalAuditLogs />} />
            <Route path="settings" element={<PlatformSettings />} />
            <Route path="profile" element={<SuperAdminProfile />} />
            <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
          </Route>
        </Route>

        {/* Core Healthcare Dashboard (Organization Users Only) */}
        <Route element={<ProtectedRoute allowedRoles={['ORG_ADMIN', 'DATA_ANALYST', 'VIEWER']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/streaming" element={<StreamingPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/quality" element={<QualityPage />} />
          <Route path="/deduplication" element={<DeduplicationPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ml-predictions" element={<MLPredictionsPage />} />
          <Route path="/ai-insights" element={<AIInsightsPage />} />
          <Route path="/pipelines" element={<PipelinePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin Restricted Routes */}
          <Route element={<ProtectedRoute allowedRoles={["ORG_ADMIN"]} />}>
            <Route path="/admin/users" element={<UsersAdmin />} />
            <Route path="/admin/audit-logs" element={<AuditLogsAdmin />} />
          </Route>
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
