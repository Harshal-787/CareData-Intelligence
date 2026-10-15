import React from 'react';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';

export const AuthLayout: React.FC = () => {
  return (
    <main className="min-h-screen flex text-slate-900 bg-slate-50/50">
      <div className="flex w-full">
        
        {/* Left Side: Brand & Visuals */}
        <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#050B14] via-[#091528] to-[#040810] p-12 text-white lg:flex border-r border-slate-800/80">
          
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-1/4 -left-1/4 size-96 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 -right-1/4 size-96 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />

          {/* Animated Background SVG (Data Streams / Network) */}
          <div className="absolute inset-0 z-0 opacity-30">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Abstract Data Grid / Network Lines */}
              <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1">
                {Array.from({ length: 15 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={`${(i + 1) * 7}%`} x2="100%" y2={`${(i + 1) * 7}%`} />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line key={`v-${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" />
                ))}
              </g>

              {/* Data Nodes */}
              <g fill="rgba(6, 182, 212, 0.6)">
                <circle cx="30%" cy="42%" r="3" />
                <circle cx="70%" cy="28%" r="4" />
                <circle cx="50%" cy="70%" r="3" />
                <circle cx="80%" cy="84%" r="4" />
                <circle cx="20%" cy="77%" r="3" />
                <circle cx="40%" cy="21%" r="4" />
              </g>
            </svg>
          </div>

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center">
            <BrandLogo collapsed={false} theme="dark" size="lg" />
          </div>
          
          {/* Hero Branding Statement */}
          <div className="relative z-10 mt-auto">

            
            <div className="border-l-2 border-cyan-500 pl-6 py-1 mb-4">
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
                Clinical Acuity, <br />
                <span className="font-extrabold bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Intelligently Decoded.
                </span>
              </h1>
            </div>
            <p className="max-w-md text-sm text-slate-300/90 font-normal tracking-wide leading-relaxed pl-6">
              Empowering hospital systems and clinical analysts with sub-second DuckDB OLAP telemetry, MPI probabilistic deduplication, and generative clinical insights.
            </p>
          </div>

          {/* Trust Footer Badges */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 flex items-center gap-6 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" /> HIPAA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-cyan-400" /> 256-Bit Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-blue-400" /> ISO 27001 Certified
            </span>
          </div>
        </section>
        
        {/* Right Side: Form Panel */}
        <section className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
          <div className="w-full max-w-md flex flex-col justify-center">
            <div className="mb-8 flex items-center justify-center lg:justify-start">
              <BrandLogo collapsed={false} theme="light" size="xl" />
            </div>
            
            <Outlet />
          </div>
        </section>
        
      </div>
    </main>
  );
};
