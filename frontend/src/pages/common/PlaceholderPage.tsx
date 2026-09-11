import React from 'react';
import { LucideIcon, Layers, Sparkles } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
  icon: LucideIcon;
  techStack: string[];
  plannedFeatures: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  phase,
  description,
  icon: Icon,
  techStack,
  plannedFeatures,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-semibold text-cyan-300 mb-2 font-mono">
          <Sparkles className="h-3 w-3" /> {phase}
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Icon className="h-6 w-6 text-cyan-400" /> {title}
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-white">Planned Engine Capabilities</h2>
          <div className="space-y-2.5">
            {plannedFeatures.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <p className="text-xs text-slate-300">{feat}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" /> Architecture Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
