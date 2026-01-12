/**
 * NetworkStatusBanner - Ultra-Low Bandwidth UI Component
 * 
 * Displays user-friendly network status messages:
 * - "Waiting for network…" (offline)
 * - "Low signal — voice optimized" (ultra-low)
 * - "Reconnecting…" (recovery)
 * - "Call resumed" (recovered)
 * - "Local Network Call" (LAN mode)
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh, Loader2, Check, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getUIStateInfo, 
  onUIStateChange, 
  UIStateInfo,
  getSignalStrength 
} from '@/utils/uiStateSignals';

interface NetworkStatusBannerProps {
  className?: string;
  compact?: boolean;
  showOnlyWarnings?: boolean;
}

export function NetworkStatusBanner({ 
  className, 
  compact = false,
  showOnlyWarnings = true 
}: NetworkStatusBannerProps) {
  const [uiState, setUIState] = useState<UIStateInfo>(() => getUIStateInfo());
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onUIStateChange((info) => {
      setUIState(info);
    });
    
    return unsubscribe;
  }, []);
  
  useEffect(() => {
    // Show banner if it's important
    if (showOnlyWarnings) {
      setVisible(uiState.showBanner);
    } else {
      setVisible(true);
    }
  }, [uiState, showOnlyWarnings]);
  
  if (!visible) return null;
  
  const getIcon = () => {
    switch (uiState.icon) {
      case 'signal-none':
        return <WifiOff className="h-4 w-4" />;
      case 'signal-weak':
        return <SignalLow className="h-4 w-4" />;
      case 'signal-good':
        return <SignalMedium className="h-4 w-4" />;
      case 'signal-full':
        return <SignalHigh className="h-4 w-4" />;
      case 'wifi':
        return <Wifi className="h-4 w-4" />;
      case 'reconnect':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'local':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Signal className="h-4 w-4" />;
    }
  };
  
  const getBgColor = () => {
    switch (uiState.bannerType) {
      case 'success':
        return 'bg-green-500/90';
      case 'warning':
        return 'bg-yellow-500/90';
      case 'error':
        return 'bg-red-500/90';
      case 'info':
      default:
        return 'bg-blue-500/90';
    }
  };
  
  const getTextColor = () => {
    switch (uiState.bannerType) {
      case 'warning':
        return 'text-yellow-900';
      default:
        return 'text-white';
    }
  };
  
  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        getBgColor(),
        getTextColor(),
        className
      )}>
        {getIcon()}
        <span>{uiState.shortMessage}</span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg',
      getBgColor(),
      getTextColor(),
      uiState.isInterruptive && 'animate-pulse',
      className
    )}>
      {getIcon()}
      <span>{uiState.message}</span>
      {uiState.state === 'recovered' && (
        <Check className="h-4 w-4" />
      )}
    </div>
  );
}

/**
 * SignalStrengthIndicator - Shows signal bars like a phone
 */
interface SignalStrengthIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function SignalStrengthIndicator({
  className,
  size = 'md',
  showLabel = false
}: SignalStrengthIndicatorProps) {
  const [strength, setStrength] = useState(() => getSignalStrength());
  const [uiState, setUIState] = useState(() => getUIStateInfo());
  
  useEffect(() => {
    const unsubscribe = onUIStateChange((info) => {
      setUIState(info);
      setStrength(getSignalStrength());
    });
    
    return unsubscribe;
  }, []);
  
  const barHeights = {
    sm: ['h-1', 'h-1.5', 'h-2', 'h-2.5', 'h-3'],
    md: ['h-2', 'h-3', 'h-4', 'h-5', 'h-6'],
    lg: ['h-3', 'h-5', 'h-7', 'h-9', 'h-11']
  };
  
  const barWidth = {
    sm: 'w-0.5',
    md: 'w-1',
    lg: 'w-1.5'
  };
  
  const getBarColor = (index: number) => {
    if (index >= strength) return 'bg-muted';
    
    switch (uiState.color) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'orange':
        return 'bg-orange-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground';
    }
  };
  
  return (
    <div className={cn('flex items-end gap-0.5', className)}>
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={cn(
            barWidth[size],
            barHeights[size][index],
            'rounded-sm transition-colors',
            getBarColor(index)
          )}
        />
      ))}
      {showLabel && (
        <span className="ml-1 text-xs text-muted-foreground">
          {uiState.shortMessage}
        </span>
      )}
    </div>
  );
}

/**
 * VideoDisabledNotice - Shows when video is disabled due to network
 */
interface VideoDisabledNoticeProps {
  className?: string;
  reason?: string;
}

export function VideoDisabledNotice({ 
  className,
  reason 
}: VideoDisabledNoticeProps) {
  const [uiState, setUIState] = useState(() => getUIStateInfo());
  
  useEffect(() => {
    const unsubscribe = onUIStateChange(setUIState);
    return unsubscribe;
  }, []);
  
  const message = reason || 'Video paused due to low network — voice continuing';
  
  return (
    <div className={cn(
      'flex items-center justify-center gap-2 px-4 py-3 bg-black/80 text-white rounded-lg',
      className
    )}>
      <WifiOff className="h-5 w-5 text-yellow-400" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

/**
 * LocalNetworkBadge - Shows when on local network call
 */
export function LocalNetworkBadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 bg-blue-500/90 text-white rounded-full text-xs font-medium',
      className
    )}>
      <Smartphone className="h-3 w-3" />
      <span>Local Network</span>
    </div>
  );
}

export default NetworkStatusBanner;
