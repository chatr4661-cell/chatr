/**
 * Encryption Status Indicator
 * Shows encryption status for messages and conversations
 */

import { Shield, ShieldCheck, ShieldOff, Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EncryptionIndicatorProps {
  isEncrypted?: boolean;
  decrypted?: boolean;
  decryptionFailed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const EncryptionIndicator = ({
  isEncrypted = false,
  decrypted = false,
  decryptionFailed = false,
  size = 'sm',
  showLabel = false,
  className,
}: EncryptionIndicatorProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const getIcon = () => {
    if (!isEncrypted) {
      return <LockOpen className={cn(sizeClasses[size], 'text-muted-foreground/50')} />;
    }
    if (decryptionFailed) {
      return <ShieldOff className={cn(sizeClasses[size], 'text-destructive')} />;
    }
    if (decrypted) {
      return <ShieldCheck className={cn(sizeClasses[size], 'text-green-500')} />;
    }
    return <Shield className={cn(sizeClasses[size], 'text-primary')} />;
  };

  const getLabel = () => {
    if (!isEncrypted) return 'Not encrypted';
    if (decryptionFailed) return 'Decryption failed';
    if (decrypted) return 'End-to-end encrypted';
    return 'Encrypted';
  };

  const getTooltip = () => {
    if (!isEncrypted) return 'This message is not encrypted';
    if (decryptionFailed) return 'Unable to decrypt this message. You may not have the required keys.';
    if (decrypted) return 'This message is end-to-end encrypted. Only you and the recipient can read it.';
    return 'This message is encrypted';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center gap-1', className)}>
            {getIcon()}
            {showLabel && (
              <span className="text-xs text-muted-foreground">{getLabel()}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Chat Header Encryption Badge
 */
interface ConversationEncryptionBadgeProps {
  encryptionEnabled: boolean;
  recipientHasKey?: boolean;
}

export const ConversationEncryptionBadge = ({
  encryptionEnabled,
  recipientHasKey = false,
}: ConversationEncryptionBadgeProps) => {
  const isFullyEncrypted = encryptionEnabled && recipientHasKey;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
              isFullyEncrypted 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isFullyEncrypted ? (
              <Lock className="w-3 h-3" />
            ) : (
              <LockOpen className="w-3 h-3" />
            )}
            <span>{isFullyEncrypted ? 'Encrypted' : 'Standard'}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">
            {isFullyEncrypted 
              ? 'Messages in this conversation are end-to-end encrypted. Only you and the recipient can read them.'
              : 'Messages are transmitted securely but not end-to-end encrypted. Enable E2E encryption for maximum privacy.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
