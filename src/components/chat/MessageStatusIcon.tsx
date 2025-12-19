import React from 'react';
import { Check, CheckCheck, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusIconProps {
  status: MessageStatus;
  className?: string;
}

export const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'sending':
      return (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={className}
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
        </motion.div>
      );
    
    case 'sent':
      return <Check className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} />;
    
    case 'delivered':
      return <CheckCheck className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} />;
    
    case 'read':
      return <CheckCheck className={`w-3.5 h-3.5 text-blue-500 ${className}`} />;
    
    case 'failed':
      return <AlertTriangle className={`w-3.5 h-3.5 text-red-500 ${className}`} />;
    
    default:
      return <Check className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} />;
  }
};

// Helper to determine status from message object
export const getMessageStatus = (message: {
  read_at?: string;
  delivered_at?: string;
  sent_at?: string;
  created_at?: string;
  failed?: boolean;
  sending?: boolean;
}): MessageStatus => {
  if (message.sending) return 'sending';
  if (message.failed) return 'failed';
  if (message.read_at) return 'read';
  if (message.delivered_at) return 'delivered';
  if (message.sent_at || message.created_at) return 'sent';
  return 'sending';
};
