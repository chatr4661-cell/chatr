import React from 'react';
import { BadgeCheck, Star, Building2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type BadgeType = 'verified' | 'creator' | 'business' | 'celebrity';

interface VerifiedBadgeProps {
  type: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const badgeConfig: Record<BadgeType, { icon: React.ComponentType<any>; color: string; label: string }> = {
  verified: { icon: BadgeCheck, color: 'text-primary', label: 'Verified Account' },
  creator: { icon: Star, color: 'text-purple-500', label: 'Creator' },
  business: { icon: Building2, color: 'text-blue-500', label: 'Business Account' },
  celebrity: { icon: Crown, color: 'text-yellow-500', label: 'Celebrity' },
};

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const VerifiedBadge = ({
  type,
  size = 'md',
  showTooltip = true,
  className
}: VerifiedBadgeProps) => {
  const config = badgeConfig[type];
  const Icon = config.icon;

  const badge = (
    <Icon 
      className={cn(
        sizeClasses[size],
        config.color,
        "inline-block",
        className
      )} 
    />
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
