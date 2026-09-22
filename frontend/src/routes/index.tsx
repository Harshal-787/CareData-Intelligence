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
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />

          {/* Phase 9: Real-Time Stream Ingestion & HL7 Monitor */}
          <Route path="/streaming" element={<StreamingPage />} />

          {/* Phase 2: Datasets & Raw Lakehouse Ingestion */}
          <Route path="/datasets" element={<DatasetsPage />} />

          {/* Phase 3: Data Quality, Profiling & Clinical Rules */}
          <Route path="/quality" element={<QualityPage />} />

          {/* Phase 4: Deduplication & Patient Resolution */}
          <Route path="/deduplication" element={<DeduplicationPage />} />

          {/* Phase 5: Healthcare Analytics & OLAP Engine */}
          <Route path="/analytics" element={<AnalyticsPage />} />

          {/* Phase 6: ML Predictions */}
          <Route path="/ml-predictions" element={<MLPredictionsPage />} />

          {/* Phase 7: AI Insights */}
          <Route path="/ai-insights" element={<AIInsightsPage />} />

          {/* Phase 8: Pipeline Orchestration */}
          <Route path="/pipelines" element={<PipelinePage />} />

          {/* Phase 8: Clinical Reports */}
          <Route path="/reports" element={<ReportsPage />} />

          {/* Super Admin & Org Admin Protected Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ORG_ADMIN"]} />
            }
          >
            <Route path="/admin/users" element={<UsersAdmin />} />
            <Route path="/admin/audit-logs" element={<AuditLogsAdmin />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

