import React from 'react';
import { WhatsAppStyleInput } from './WhatsAppStyleInput';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, mediaAttachments?: any[]) => Promise<void>;
  conversationId: string;
  userId: string;
  disabled?: boolean;
  lastMessage?: string;
  conversationContext?: string[];
  onAIAction?: (action: any) => void;
}

export const MessageInput = (props: MessageInputProps) => {
  // Use the new WhatsApp-style input component
  return <WhatsAppStyleInput {...props} />;
};
