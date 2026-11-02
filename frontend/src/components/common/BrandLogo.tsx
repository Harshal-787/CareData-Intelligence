import React from 'react';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  collapsed?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  imgClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  collapsed = false,
  theme = 'light',
  className,
  imgClassName,
  size = 'md',
}) => {
  const sizeClasses = {
    xs: 'h-7',
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
  };

  return (
    <div className={cn('flex items-center shrink-0 select-none', className)}>
      <img
        src={collapsed ? '/logo-icon.png' : '/logo.png'}
        alt="CareData Intelligence"
        className={cn(
          collapsed
            ? 'h-9 w-9 object-contain'
            : (imgClassName || sizeClasses[size] || 'h-12'),
          'w-auto object-contain transition-transform duration-200 hover:scale-[1.02]',
          theme === 'dark' && 'brightness-110 contrast-105 drop-shadow-[0_2px_12px_rgba(255,255,255,0.22)]'
        )}
      />
    </div>
  );
};
