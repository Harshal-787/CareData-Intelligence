import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import {
  Shield,
  Heart,
  Database,
  Lock,
  Cpu,
  ArrowUpRight
} from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#060a12] text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo theme="dark" />
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              CareData Intelligence is an enterprise-grade healthcare lakehouse and clinical intelligence platform. Featuring real-time data quality profiling, probabilistic Master Patient Index (MPI) deduplication, DuckDB analytics, and 100% on-premise AI.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-mono bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full w-fit">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Engine Services Operational (v1.0.0)</span>
            </div>
          </div>

          {/* Platform Columns */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#architecture" className="hover:text-cyan-400 transition">
                  Lakehouse Architecture
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-400 transition">
                  Data Quality Engine
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-400 transition">
                  Patient Deduplication (MPI)
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-400 transition">
                  OLAP Analytics & Cohorts
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-400 transition">
                  Gemini Local AI
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Security & Specs
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-slate-300">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span>HIPAA-Ready Arch</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                <span>Multi-Tenant RBAC</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <Cpu className="h-3.5 w-3.5 text-teal-400" />
                <span>Zero Cloud Leakage LLM</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                <span>MinIO S3 + DuckDB</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Developer & API
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="http://localhost:8080/swagger"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-cyan-400 transition inline-flex items-center gap-1"
                >
                  <span>OpenAPI / Swagger</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-cyan-400 transition">
                  Console Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-cyan-400 transition">
                  Account Registration
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} CareData Intelligence Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              Engineered with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> for Healthcare Analytics
            </span>
            <span>•</span>
            <span className="font-mono text-slate-400">Go 1.22 + DuckDB + Vite</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
