/**
 * Call Handoff Banner
 * 
 * Shows incoming call handoff notification with accept/reject actions.
 * Displayed as a floating banner when another device initiates a transfer.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneForwarded, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallHandoffBannerProps {
  callState: {
    partnerName: string;
    callType: 'voice' | 'video';
    duration: number;
  };
  fromDevice: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function CallHandoffBanner({
  callState,
  fromDevice,
  onAccept,
  onReject,
}: CallHandoffBannerProps) {
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-4 right-4 z-[9999] mx-auto max-w-md"
    >
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <PhoneForwarded className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Call Transfer Available
            </p>
            <p className="text-xs text-muted-foreground">
              {callState.callType === 'video' ? '📹' : '📞'} {callState.partnerName} • {formatDuration(callState.duration)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Smartphone className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{fromDevice}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onAccept}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10"
          >
            <Phone className="w-4 h-4 mr-1.5" />
            Continue Here
          </Button>
          <Button
            onClick={onReject}
            variant="outline"
            className="rounded-xl h-10 px-3"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
