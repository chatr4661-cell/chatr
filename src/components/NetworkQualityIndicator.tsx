import { memo } from 'react';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { Wifi, WifiOff, Signal } from 'lucide-react';

interface NetworkQualityIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const NetworkQualityIndicator = memo(({ 
  className = '', 
  showLabel = false 
}: NetworkQualityIndicatorProps) => {
  const quality = useNetworkQuality();

  const getIcon = () => {
    switch (quality) {
      case 'offline':
        return <WifiOff className="w-4 h-4 text-destructive" />;
      case 'slow':
        return <Signal className="w-4 h-4 text-orange-500" />;
      case 'fast':
        return <Wifi className="w-4 h-4 text-primary" />;
    }
  };

  const getLabel = () => {
    switch (quality) {
      case 'offline':
        return 'Offline';
      case 'slow':
        return '2G/3G';
      case 'fast':
        return 'Fast';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getIcon()}
      {showLabel && (
        <span className="text-sm text-muted-foreground">{getLabel()}</span>
      )}
    </div>
  );
});

NetworkQualityIndicator.displayName = 'NetworkQualityIndicator';
