import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";

// Pages
import { LandingPage } from "../pages/landing/LandingPage";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { DashboardHome } from "../pages/dashboard/Home";
import { UsersAdmin } from "../pages/admin/Users";
import { AuditLogsAdmin } from "../pages/admin/AuditLogs";
import { DatasetsPage } from "../pages/datasets/Datasets";
import { QualityPage } from "../pages/quality/QualityPage";
import { DeduplicationPage } from "../pages/deduplication/DeduplicationPage";
import { AnalyticsPage } from "../pages/analytics/AnalyticsPage";
import { MLPredictionsPage } from "../pages/ml/MLPredictionsPage";
import { AIInsightsPage } from "../pages/ai/AIInsightsPage";
import { PipelinePage } from "../pages/pipelines/PipelinePage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { StreamingPage } from "../pages/streaming/StreamingPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />

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
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
