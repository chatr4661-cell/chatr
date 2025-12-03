import { memo } from 'react';
import chatrLogo from '@/assets/chatr-logo.png';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';

interface LogoProps {
  variant?: 'default' | 'icon' | 'brand';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const sizeMap = {
  xs: { width: 24, height: 24, className: 'h-6 w-6' },
  sm: { width: 32, height: 32, className: 'h-8 w-8' },
  md: { width: 40, height: 40, className: 'h-10 w-10' },
  lg: { width: 64, height: 64, className: 'h-16 w-16' },
  xl: { width: 80, height: 80, className: 'h-20 w-20' },
};

const logoMap = {
  default: chatrLogo,
  icon: chatrIconLogo,
  brand: chatrBrandLogo,
};

/**
 * Optimized Chatr Logo component with proper sizing and loading attributes
 * Fixes Lighthouse image optimization warnings
 */
export const ChatrLogo = memo(({ 
  variant = 'default', 
  size = 'md', 
  className = '',
  alt = 'Chatr'
}: LogoProps) => {
  const sizeConfig = sizeMap[size];
  const logoSrc = logoMap[variant];

  return (
    <img
      src={logoSrc}
      alt={alt}
      width={sizeConfig.width}
      height={sizeConfig.height}
      className={`${sizeConfig.className} ${className}`}
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
  );
});

ChatrLogo.displayName = 'ChatrLogo';

/**
 * For use in contexts where you need just the raw src
 */
export const logoSources = {
  default: chatrLogo,
  icon: chatrIconLogo,
  brand: chatrBrandLogo,
};
