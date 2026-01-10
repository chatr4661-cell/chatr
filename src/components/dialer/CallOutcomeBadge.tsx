import { 
  Phone, Video, PhoneMissed, PhoneOff, PhoneIncoming, PhoneOutgoing,
  AlertTriangle, Wifi, WifiOff, ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type CallOutcome = 
  | 'connected' 
  | 'missed' 
  | 'failed' 
  | 'rejected' 
  | 'no_answer'
  | 'busy'
  | 'network_weak'
  | 'downgraded';

interface CallOutcomeBadgeProps {
  status: string;
  callType: 'audio' | 'video';
  duration?: number;
  isOutgoing: boolean;
  connectionQuality?: string;
  className?: string;
}

export function CallOutcomeBadge({ 
  status, 
  callType, 
  duration, 
  isOutgoing,
  connectionQuality,
  className 
}: CallOutcomeBadgeProps) {
  const getOutcomeConfig = () => {
    // Check for downgrade
    const wasDowngraded = callType === 'video' && connectionQuality === 'poor';

    // Determine outcome from status
    if (status === 'ended' && duration && duration > 0) {
      if (wasDowngraded) {
        return {
          icon: ArrowDown,
          text: 'Video → Audio · Network weak',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500/10'
        };
      }
      return {
        icon: callType === 'video' ? Video : Phone,
        text: `${callType === 'video' ? 'Video' : 'Voice'} · Connected`,
        color: 'text-green-600',
        bgColor: 'bg-green-500/10'
      };
    }

    if (status === 'missed') {
      return {
        icon: PhoneMissed,
        text: connectionQuality === 'poor' ? 'Missed · No internet' : 'Missed',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10'
      };
    }

    if (status === 'rejected') {
      return {
        icon: PhoneOff,
        text: 'Declined',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted'
      };
    }

    if (status === 'no_answer' || status === 'timeout') {
      return {
        icon: PhoneOff,
        text: 'No answer',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted'
      };
    }

    if (status === 'failed') {
      return {
        icon: AlertTriangle,
        text: connectionQuality === 'poor' ? 'Failed · Poor network' : 'Failed',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10'
      };
    }

    if (status === 'busy') {
      return {
        icon: Phone,
        text: 'Busy',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500/10'
      };
    }

    // Default - ended without duration means failed
    if (status === 'ended' && (!duration || duration === 0)) {
      return {
        icon: PhoneOff,
        text: isOutgoing ? 'Not answered' : 'Missed',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted'
      };
    }

    // Fallback
    return {
      icon: callType === 'video' ? Video : Phone,
      text: callType === 'video' ? 'Video' : 'Voice',
      color: 'text-muted-foreground',
      bgColor: ''
    };
  };

  const config = getOutcomeConfig();
  const Icon = config.icon;

  // Direction icon
  const DirectionIcon = isOutgoing ? PhoneOutgoing : PhoneIncoming;
  const directionColor = status === 'missed' || status === 'failed' 
    ? 'text-destructive' 
    : isOutgoing 
      ? 'text-green-500' 
      : 'text-blue-500';

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      <DirectionIcon className={cn('h-3.5 w-3.5', directionColor)} />
      <span className={cn('font-medium', config.color)}>{config.text}</span>
    </div>
  );
}

// Get preferred call mode for a contact based on history
export function getPreferredCallMode(
  successfulAudioCalls: number,
  successfulVideoCalls: number,
  failedVideoCalls: number
): 'audio' | 'video' | null {
  // If last 3 calls succeeded only in audio, prefer audio
  if (successfulAudioCalls >= 3 && successfulVideoCalls === 0) {
    return 'audio';
  }
  // If video calls fail often, prefer audio
  if (failedVideoCalls >= 2 && successfulVideoCalls < failedVideoCalls) {
    return 'audio';
  }
  return null;
}

// Generate reliability label for favorites
export function getReliabilityLabel(preferredMode: 'audio' | 'video' | null): string | null {
  if (preferredMode === 'audio') {
    return 'Audio preferred · Reliable';
  }
  return null;
}
