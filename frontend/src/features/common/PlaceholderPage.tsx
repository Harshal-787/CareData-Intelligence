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
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-[11px] font-semibold text-cyan-700 mb-2 font-mono">
          <Sparkles className="h-3 w-3" /> {phase}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Icon className="h-6 w-6 text-cyan-600" /> {title}
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Planned Engine Capabilities</h2>
          <div className="space-y-2.5">
            {plannedFeatures.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200">
                <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <p className="text-xs text-slate-600">{feat}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-600" /> Architecture Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-cyan-700">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
