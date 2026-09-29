import React from 'react';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  collapsed?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

import { useAuth } from '../../context/AuthContext';

export const BrandLogo: React.FC<BrandLogoProps> = ({
  collapsed = false,
  className,
}) => {
  const { settings } = useAuth();
  const platformName = settings?.platformName || "CareData Intelligence";

  return (
    <div className={cn('flex items-center', className)}>
      <div className={cn(
        "flex items-center transition-all duration-300",
        collapsed ? "w-10 h-10 justify-center" : "h-10 w-auto min-w-[160px]"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="size-8 bg-cyan-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg leading-none">
                {platformName.charAt(0)}
              </span>
            </div>
            <span className="font-bold text-slate-900 tracking-tight leading-tight max-w-[140px] truncate block">
              {platformName}
            </span>
          </div>
        )}
        {collapsed && (
          <div className="size-8 bg-cyan-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg leading-none">
              {platformName.charAt(0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
