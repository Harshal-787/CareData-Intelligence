import React from 'react';
import clsx from 'clsx';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className,
}) => {
  const sizeMap = {
    sm: { box: 'h-8 w-8', icon: 'h-5 w-5', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'h-10 w-10', icon: 'h-6 w-6', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'h-12 w-12', icon: 'h-7 w-7', text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'h-16 w-16', icon: 'h-10 w-10', text: 'text-2xl', sub: 'text-sm' },
  };

  const { box, text, sub } = sizeMap[size];

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      {/* High-Tech Healthcare + AI Logo Icon */}
      <div
        className={clsx(
          box,
          'relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#083344] via-[#0f172a] to-[#05070e] p-1.5 border border-cyan-500/40 shadow-lg shadow-cyan-500/20'
        )}
      >
        <svg viewBox="0 0 128 128" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="50%" stop-color="#06b6d4" />
              <stop offset="100%" stop-color="#3b82f6" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Glowing Cross */}
          <path
            d="M52 30 C52 26.686 54.686 24 58 24 L70 24 C73.314 24 76 26.686 76 30 L76 52 L98 52 C101.314 52 104 54.686 104 58 L104 70 C104 73.314 101.314 76 98 76 L76 76 L76 98 C76 101.314 73.314 104 70 104 L58 104 C54.686 104 52 101.314 52 98 L52 76 L30 76 C26.686 76 24 73.314 24 70 L24 58 C24 54.686 26.686 52 30 52 L52 52 Z"
            fill="url(#logoGrad)"
            fillOpacity="0.25"
            stroke="url(#logoGrad)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Pulse / Wave line */}
          <path
            d="M22 64 L44 64 L52 46 L60 82 L68 54 L76 72 L84 64 L106 64"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logoGlow)"
          />

          {/* Pulse nodes */}
          <circle cx="60" cy="82" r="4" fill="#22d3ee" />
          <circle cx="68" cy="54" r="4" fill="#a5f3fc" />
          <circle cx="52" cy="46" r="3.5" fill="#67e8f9" />
        </svg>

        {/* Ambient Corner Sparkle */}
        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 blur-[1px] animate-pulse" />
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className={clsx('font-bold tracking-tight text-white leading-none', text)}>
            CareData <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Intelligence</span>
          </span>
          <span className={clsx('font-mono text-slate-400 tracking-wider mt-0.5', sub)}>
            AI Healthcare Platform
          </span>
        </div>
      )}
    </div>
  );
};
