import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Mic, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useInputValidation } from '@/hooks/useInputValidation';
import { useMessageQueue } from '@/hooks/useMessageQueue';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string) => Promise<void>;
  conversationId: string;
  userId: string;
  disabled?: boolean;
}

export const MessageInput = ({ onSendMessage, conversationId, userId, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { validateMessage, sanitizeHtml } = useInputValidation();
  const { addToQueue, isOnline, queueLength } = useMessageQueue(userId);

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    // Validate message
    const validation = validateMessage(message.trim());
    if (!validation.success) {
      toast.error(validation.error?.issues[0]?.message || 'Invalid message');
      return;
    }

    const sanitizedMessage = sanitizeHtml(message.trim());

    setSending(true);
    try {
      if (!isOnline) {
        // Queue message for later delivery
        addToQueue({
          conversation_id: conversationId,
          content: sanitizedMessage,
          message_type: 'text',
        });
        setMessage('');
        toast.info('Message queued - will send when back online');
      } else {
        await onSendMessage(sanitizedMessage);
        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Queue failed message for retry
      addToQueue({
        conversation_id: conversationId,
        content: sanitizedMessage,
        message_type: 'text',
      });
      
      toast.error('Failed to send - message queued for retry');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <WifiOff className="w-4 h-4" />
          <span>Offline - messages will be queued</span>
          {queueLength > 0 && (
            <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full">
              {queueLength} queued
            </span>
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-none rounded-2xl pr-12"
            disabled={disabled || sending}
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending || disabled}
            size="icon"
            className="absolute right-2 bottom-2 rounded-full h-8 w-8"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          disabled={disabled}
        >
          <Mic className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
