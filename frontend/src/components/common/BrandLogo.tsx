import React from 'react';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  collapsed?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  collapsed = false,
  className,
}) => {
  return (
    <div className={cn('flex items-center', className)}>
      <div className={cn(
        "flex items-center transition-all duration-300",
        collapsed ? "w-10 h-10 justify-center" : "h-10 w-auto min-w-[160px]"
      )}>
        <img 
          src="/logo.png" 
          alt="CareData Intelligence" 
          className="h-full w-full object-contain object-left"
        />
      </div>
    </div>
  );
};
