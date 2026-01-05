/**
 * SMS/RCS Fallback Indicator
 * Shows when messaging non-CHATR users
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Smartphone, Zap, AlertCircle, Send } from 'lucide-react';
import { RecipientCapability } from '@/services/messaging/SMSGatewayService';
import { Button } from '@/components/ui/button';

interface SMSFallbackIndicatorProps {
  capability: RecipientCapability | null;
  onSendInvite?: () => void;
  compact?: boolean;
}

export function SMSFallbackIndicator({ 
  capability, 
  onSendInvite,
  compact = false 
}: SMSFallbackIndicatorProps) {
  if (!capability || capability.isChatrUser) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 
                      bg-amber-500/10 rounded-full">
        {capability.rcsCapable ? (
          <>
            <Zap className="w-3 h-3 text-amber-500" />
            <span>RCS</span>
          </>
        ) : (
          <>
            <MessageSquare className="w-3 h-3 text-amber-500" />
            <span>SMS</span>
          </>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-amber-500/20">
          {capability.rcsCapable ? (
            <Zap className="w-5 h-5 text-amber-500" />
          ) : (
            <MessageSquare className="w-5 h-5 text-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {capability.rcsCapable ? 'Rich Messaging (RCS)' : 'SMS Messaging'}
          </h4>
          
          <p className="text-xs text-muted-foreground mt-0.5">
            This contact is not on CHATR. Messages will be sent via{' '}
            {capability.rcsCapable ? 'RCS with rich features' : 'standard SMS'}.
          </p>

          {capability.rcsCapable && capability.rcsFeatures && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {capability.rcsFeatures.features.readReceipts && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                  ✓ Read Receipts
                </span>
              )}
              {capability.rcsFeatures.features.typingIndicators && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                  ✓ Typing
                </span>
              )}
              {capability.rcsFeatures.features.fileTransfer && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                  ✓ Media
                </span>
              )}
            </div>
          )}

          {!capability.rcsCapable && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-500">
              <AlertCircle className="w-3 h-3" />
              <span>Standard rates may apply</span>
            </div>
          )}
        </div>

        {onSendInvite && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSendInvite}
            className="shrink-0 text-xs h-8"
          >
            <Send className="w-3 h-3 mr-1" />
            Invite
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Inline badge for chat input
 */
export function SMSBadge({ type }: { type: 'sms' | 'rcs' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                     ${type === 'rcs' 
                       ? 'bg-green-500/10 text-green-500' 
                       : 'bg-amber-500/10 text-amber-500'}`}
    >
      {type === 'rcs' ? (
        <>
          <Zap className="w-2.5 h-2.5" />
          RCS
        </>
      ) : (
        <>
          <MessageSquare className="w-2.5 h-2.5" />
          SMS
        </>
      )}
    </span>
  );
}
