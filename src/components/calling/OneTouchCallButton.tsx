import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOneTouchCall, CallType } from '@/hooks/useOneTouchCall';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface OneTouchCallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType?: CallType;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  onCallStarted?: (callId: string) => void;
}

export const OneTouchCallButton: React.FC<OneTouchCallButtonProps> = ({
  recipientId,
  recipientName,
  recipientAvatar,
  callType = 'audio',
  size = 'md',
  variant = 'primary',
  className,
  onCallStarted,
}) => {
  const { initiateCall, callState } = useOneTouchCall();

  const handlePress = async () => {
    // Immediate haptic feedback
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        console.log('Haptics not available');
      }
    }

    const callId = await initiateCall({
      recipientId,
      recipientName,
      recipientAvatar,
      callType,
    });

    if (callId) {
      onCallStarted?.(callId);
    }
  };

  const isInitiating = callState.status === 'initiating';

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const variantClasses = {
    primary: 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30',
    secondary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    ghost: 'bg-transparent hover:bg-accent text-foreground',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handlePress}
      disabled={isInitiating}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200",
        sizeClasses[size],
        variantClasses[variant],
        isInitiating && "opacity-70 cursor-not-allowed",
        className
      )}
      aria-label={`${callType === 'video' ? 'Video' : 'Voice'} call ${recipientName}`}
    >
      {isInitiating ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : callType === 'video' ? (
        <Video className={iconSizes[size]} />
      ) : (
        <Phone className={iconSizes[size]} />
      )}
    </motion.button>
  );
};

// Quick dial component for contacts
interface QuickDialProps {
  contacts: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  onCallStarted?: (callId: string, contactId: string) => void;
}

export const QuickDial: React.FC<QuickDialProps> = ({ contacts, onCallStarted }) => {
  return (
    <div className="flex gap-4 overflow-x-auto py-4 px-2 scrollbar-hide">
      {contacts.map((contact) => (
        <div key={contact.id} className="flex flex-col items-center gap-2 min-w-[80px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-primary">
                  {contact.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
              <OneTouchCallButton
                recipientId={contact.id}
                recipientName={contact.name}
                recipientAvatar={contact.avatar}
                callType="audio"
                size="sm"
                variant="primary"
                onCallStarted={(callId) => onCallStarted?.(callId, contact.id)}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground text-center truncate w-full">
            {contact.name.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
};
