import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck, Database, BrainCircuit } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      {/* Left Marketing / Vision Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#083344] via-[#0f172a] to-[#05070e] border-r border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <BrandLogo size="lg" />
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5" /> HIPAA-Compliant RBAC Architecture
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Unified Clinical Data Ingestion, Profiling & AI Intelligence
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Automate healthcare data quality monitoring, demographic deduplication, ML clinical risk scoring, and natural-language intelligence.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl glass-panel">
              <Database className="h-5 w-5 text-cyan-400 mb-2" />
              <h3 className="font-semibold text-sm text-white">Polars & DuckDB Lake</h3>
              <p className="text-xs text-slate-400 mt-1">High-speed columnar analytics & clinical validation</p>
            </div>
            <div className="p-4 rounded-xl glass-panel">
              <BrainCircuit className="h-5 w-5 text-teal-400 mb-2" />
              <h3 className="font-semibold text-sm text-white">Local Ollama AI</h3>
              <p className="text-xs text-slate-400 mt-1">Natural-language to SQL with privacy-preserving LLMs</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500 font-mono">
          © 2026 CareData Intelligence • Powered by React, Go & Python
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full lg:w-1/2 flex-col justify-between p-6 sm:p-12">
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-4">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition"
          >
            <span>← Back to Platform Overview</span>
          </a>
          <div className="lg:hidden">
            <BrandLogo size="sm" showText={false} />
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto">
          <Outlet />
        </div>

        <div className="w-full max-w-md mx-auto pt-6 text-center text-[11px] text-slate-500 lg:hidden">
          © {new Date().getFullYear()} CareData Intelligence
        </div>
      </div>
    </div>
  );
};
