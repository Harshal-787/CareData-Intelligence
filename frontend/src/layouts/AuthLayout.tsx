import React from 'react';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';

export const AuthLayout: React.FC = () => {
  return (
    <main className="min-h-screen flex text-slate-900 bg-white">
      <div className="flex w-full">
        
        {/* Left Side: Brand & Visuals */}
        <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#050B14] p-12 text-white lg:flex border-r border-slate-800/50">
          
          {/* Animated Background SVG (Data Streams / Network) */}
          <div className="absolute inset-0 z-0 opacity-40">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#0891b2" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                </linearGradient>
                <filter id="blur">
                  <feGaussianBlur stdDeviation="10" />
                </filter>
              </defs>
              
              {/* Animated Aurora Orbs */}
              <circle cx="20%" cy="30%" r="30%" fill="url(#grad1)" filter="url(#blur)">
                <animate attributeName="cx" values="20%;80%;20%" dur="20s" repeatCount="indefinite" />
                <animate attributeName="cy" values="30%;70%;30%" dur="25s" repeatCount="indefinite" />
              </circle>
              
              <circle cx="80%" cy="70%" r="30%" fill="url(#grad2)" filter="url(#blur)">
                <animate attributeName="cx" values="80%;20%;80%" dur="25s" repeatCount="indefinite" />
                <animate attributeName="cy" values="70%;30%;70%" dur="20s" repeatCount="indefinite" />
              </circle>
              
              {/* Abstract Data Grid / Network Lines */}
              <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1">
                {/* Horizontal lines */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={`${(i + 1) * 7}%`} x2="100%" y2={`${(i + 1) * 7}%`} />
                ))}
                {/* Vertical lines */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line key={`v-${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" />
                ))}
              </g>

              {/* Data Nodes */}
              <g fill="rgba(6, 182, 212, 0.5)">
                <circle cx="30%" cy="42%" r="2" />
                <circle cx="70%" cy="28%" r="3" />
                <circle cx="50%" cy="70%" r="2" />
                <circle cx="80%" cy="84%" r="4" />
                <circle cx="20%" cy="77%" r="2" />
                <circle cx="40%" cy="21%" r="3" />
              </g>
            </svg>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <BrandLogo collapsed={false} theme="dark" />
          </div>
          
          <div className="relative z-10 mt-auto">
            <div className="border-l-2 border-cyan-500 pl-6 py-1 mb-4">
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
                Intelligence <br />
                <span className="font-bold text-cyan-400">Decoded.</span>
              </h1>
            </div>
            <p className="max-w-sm text-sm text-slate-400 font-light tracking-wide leading-relaxed pl-6">
              The definitive source of truth for your clinical data landscape.
            </p>
          </div>
        </section>
        
        {/* Right Side: Form Panel */}
        <section className="flex w-1/2 items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
          <div className="w-full max-w-md flex flex-col justify-center">
            <div className="mb-10 lg:hidden self-start">
              <BrandLogo collapsed={false} theme="light" />
            </div>
            
            <Outlet />
            
          </div>
        </section>
        
      </div>
    </main>
  );
};
