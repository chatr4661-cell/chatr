import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Plus, Smile, Mic, X } from 'lucide-react';
import { toast } from 'sonner';
import { AttachmentMenu } from './AttachmentMenu';

interface EnhancedMessageInputProps {
  onSendMessage: (content: string, type?: string) => Promise<void>;
  disabled?: boolean;
  replyTo?: { id: string; content: string; sender: string } | null;
  onCancelReply?: () => void;
}

export const EnhancedMessageInput = ({ 
  onSendMessage, 
  disabled,
  replyTo,
  onCancelReply
}: EnhancedMessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    setSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      if (onCancelReply) onCancelReply();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info('Voice recording started');
    } else {
      toast.info('Voice recording stopped');
    }
  };

  return (
    <>
      {showAttachments && (
        <AttachmentMenu
          onClose={() => setShowAttachments(false)}
          onPhotoVideo={() => toast.info('Photo/Video picker coming soon')}
          onCamera={() => toast.info('Camera coming soon')}
          onLocation={() => toast.info('Location sharing coming soon')}
          onContact={() => toast.info('Contact sharing coming soon')}
          onDocument={() => toast.info('Document picker coming soon')}
          onPoll={() => toast.info('Poll creator coming soon')}
          onEvent={() => toast.info('Event creator coming soon')}
          onPayment={() => toast.info('Payment request coming soon')}
          onAIImage={() => toast.info('AI Image generator coming soon')}
        />
      )}

      <div className="border-t bg-card/80 backdrop-blur-lg safe-bottom">
        {replyTo && (
          <div className="px-3 md:px-4 pt-3 pb-2 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-2 touch-manipulation">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">Replying to {replyTo.sender}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              {onCancelReply && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCancelReply}
                  className="h-8 w-8 md:h-6 md:w-6 rounded-full shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="p-3">
          <div className="flex items-end gap-2 bg-muted/50 rounded-3xl px-3 py-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message..."
                className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-1.5 text-base"
                disabled={disabled || sending}
                rows={1}
              />
            </div>

            {message.trim() ? (
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending || disabled}
                size="icon"
                className="rounded-full h-11 w-11 md:h-9 md:w-9 shrink-0 touch-manipulation"
              >
                <Send className="w-5 h-5 md:w-4 md:h-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAttachments(true)}
                  className="rounded-full shrink-0 h-11 w-11 md:h-9 md:w-9 touch-manipulation"
                  disabled={disabled}
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceRecord}
                  className={`rounded-full shrink-0 h-11 w-11 md:h-9 md:w-9 touch-manipulation ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
                  disabled={disabled}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
