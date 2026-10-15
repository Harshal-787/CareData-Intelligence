import React from 'react';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  collapsed?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  collapsed = false,
  theme = 'light',
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
  };

  return (
    <div className={cn('flex items-center shrink-0 select-none', className)}>
      <img
        src="/logo.png"
        alt="CareData"
        className={cn(
          collapsed ? 'h-9 w-auto max-w-[48px]' : (sizeClasses[size] || 'h-12'),
          'w-auto object-contain transition-transform duration-200 hover:scale-[1.02]',
          theme === 'dark' && 'drop-shadow-[0_4px_14px_rgba(255,255,255,0.15)]'
        )}
      />
    </div>
  );
};
