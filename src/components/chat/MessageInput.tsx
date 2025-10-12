import React, { useState, KeyboardEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Mic, WifiOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInputValidation } from '@/hooks/useInputValidation';
import { useMessageQueue } from '@/hooks/useMessageQueue';
import { supabase } from '@/integrations/supabase/client';
import { VoiceRecorder } from '@/components/VoiceRecorder';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, mediaUrl?: string) => Promise<void>;
  conversationId: string;
  userId: string;
  disabled?: boolean;
}

export const MessageInput = ({ onSendMessage, conversationId, userId, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setUploadingFile(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${conversationId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Determine message type based on file type
      const messageType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 
                         file.type.startsWith('audio/') ? 'audio' : 'file';

      await onSendMessage(file.name, messageType, publicUrl);
      
      toast.success('File sent successfully!');
      setSelectedFile(null);
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVoiceMessage = async (transcription: string, audioUrl?: string) => {
    try {
      // If we have an audio URL, upload it to storage first
      if (audioUrl) {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        
        const fileName = `${userId}/${conversationId}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob, {
            contentType: 'audio/webm',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);

        await onSendMessage(transcription, 'voice', publicUrl);
      } else {
        await onSendMessage(transcription, 'text');
      }
      
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Voice message error:', error);
      toast.error('Failed to send voice message');
    }
  };

  return (
    <div className="border-t bg-background p-4 pb-20">
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
      {showVoiceRecorder ? (
        <VoiceRecorder
          onTranscription={handleVoiceMessage}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      ) : (
        <>
          {uploadingFile && (
            <div className="mb-2 flex items-center gap-2 text-sm text-primary">
              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Uploading {selectedFile?.name}...</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full shrink-0"
              disabled={disabled || uploadingFile}
              onClick={() => fileInputRef.current?.click()}
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
              onClick={() => setShowVoiceRecorder(true)}
            >
              <Mic className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
