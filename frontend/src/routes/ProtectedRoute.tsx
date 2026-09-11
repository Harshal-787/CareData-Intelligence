import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">Loading CareData Security Context...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-red-300">Access Restricted by RBAC Policy</h2>
          <p className="mt-2 text-sm text-slate-300">
            Your current role <span className="font-semibold text-white px-2 py-0.5 rounded bg-red-950 border border-red-800">{user.role}</span> does not have authorization to access this view.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
