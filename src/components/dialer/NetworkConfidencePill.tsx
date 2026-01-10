import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

interface NetworkMetrics {
  rtt: number;
  packetLoss: number;
  downlink: number;
  effectiveType: string;
}

interface NetworkConfidencePillProps {
  className?: string;
  showLabel?: boolean;
  onQualityChange?: (quality: NetworkQuality) => void;
}

export function useNetworkQuality() {
  const [quality, setQuality] = useState<NetworkQuality>('excellent');
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    rtt: 0,
    packetLoss: 0,
    downlink: 10,
    effectiveType: '4g'
  });

  useEffect(() => {
    const checkNetworkQuality = async () => {
      const connection = (navigator as any).connection;
      
      if (!navigator.onLine) {
        setQuality('offline');
        return;
      }

      let rtt = 100;
      let downlink = 10;
      let effectiveType = '4g';

      if (connection) {
        rtt = connection.rtt || 100;
        downlink = connection.downlink || 10;
        effectiveType = connection.effectiveType || '4g';
      }

      // Estimate packet loss from RTT variance (simplified)
      const packetLoss = rtt > 500 ? 15 : rtt > 300 ? 8 : rtt > 150 ? 3 : 0;

      setMetrics({ rtt, packetLoss, downlink, effectiveType });

      // Determine quality based on rules
      // IF rtt < 400ms AND packetLoss < 5% → GREEN
      // IF rtt 400–800ms OR packetLoss 5–15% → YELLOW
      // IF rtt > 800ms OR packetLoss > 15% → RED
      if (rtt < 400 && packetLoss < 5 && effectiveType === '4g') {
        setQuality('excellent');
      } else if ((rtt >= 400 && rtt <= 800) || (packetLoss >= 5 && packetLoss <= 15) || effectiveType === '3g') {
        setQuality('good');
      } else if (rtt > 800 || packetLoss > 15 || effectiveType === '2g' || effectiveType === 'slow-2g') {
        setQuality('poor');
      } else {
        setQuality('good');
      }
    };

    checkNetworkQuality();
    const interval = setInterval(checkNetworkQuality, 5000);

    // Listen for online/offline events
    const handleOnline = () => checkNetworkQuality();
    const handleOffline = () => setQuality('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', checkNetworkQuality);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', checkNetworkQuality);
      }
    };
  }, []);

  return { quality, metrics };
}

export function NetworkConfidencePill({ className, showLabel = true, onQualityChange }: NetworkConfidencePillProps) {
  const { quality, metrics } = useNetworkQuality();

  useEffect(() => {
    onQualityChange?.(quality);
  }, [quality, onQualityChange]);

  const getConfig = () => {
    switch (quality) {
      case 'excellent':
        return {
          icon: Signal,
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          label: 'Network good',
          shortLabel: 'Good'
        };
      case 'good':
        return {
          icon: Wifi,
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
          label: 'Weak network · Audio recommended',
          shortLabel: 'Weak'
        };
      case 'poor':
        return {
          icon: AlertTriangle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          label: 'Very weak · Audio only',
          shortLabel: 'Poor'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          label: 'No internet',
          shortLabel: 'Offline'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={quality}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors',
          config.bg,
          config.border,
          className
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
        {showLabel && (
          <>
            <span className={cn('text-xs font-medium hidden sm:inline', config.color)}>
              {config.label}
            </span>
            <span className={cn('text-xs font-medium sm:hidden', config.color)}>
              {config.shortLabel}
            </span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper component for call hint text
export function getCallHint(quality: NetworkQuality, callType: 'voice' | 'video'): string {
  if (quality === 'offline') {
    return 'No internet connection';
  }
  
  if (callType === 'voice') {
    if (quality === 'excellent') return 'Crystal clear audio';
    if (quality === 'good') return 'Best for weak networks';
    return 'Audio only available';
  }
  
  if (callType === 'video') {
    if (quality === 'excellent') return 'HD video ready';
    if (quality === 'good') return 'Starting audio first for reliability';
    return 'Video unavailable - audio only';
  }
  
  return '';
}
