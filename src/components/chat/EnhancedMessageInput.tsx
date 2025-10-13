import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Plus, Smile, Mic, X } from 'lucide-react';
import { toast } from 'sonner';
import { AttachmentMenu } from './AttachmentMenu';
import { AISmartReplyPanel } from '../AISmartReplyPanel';
import { PollCreator } from '../PollCreator';
import { EventCreator } from './EventCreator';
import { PaymentRequest } from './PaymentRequest';
import { ContactPicker } from './ContactPicker';
import { AIImageGenerator } from './AIImageGenerator';
import { capturePhoto, pickImage, getCurrentLocation } from '@/utils/mediaUtils';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedMessageInputProps {
  onSendMessage: (content: string, type?: string, mediaUrl?: string) => Promise<void>;
  disabled?: boolean;
  replyTo?: { id: string; content: string; sender: string } | null;
  onCancelReply?: () => void;
  lastMessage?: string;
}

export const EnhancedMessageInput = ({ 
  onSendMessage, 
  disabled,
  replyTo,
  onCancelReply,
  lastMessage
}: EnhancedMessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showEventCreator, setShowEventCreator] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showAIImageGen, setShowAIImageGen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoVideo = async () => {
    try {
      const imageUrl = await pickImage();
      if (!imageUrl) return;

      toast.info('Uploading image...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileExt = blob.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Send message with media_url, not embedded base64
      await onSendMessage('📷 Photo', 'image', publicUrl);
      toast.success('Image sent successfully');
    } catch (error) {
      console.error('Error picking image:', error);
      toast.error('Failed to send image');
    }
  };

  const handleCamera = async () => {
    try {
      const imageUrl = await capturePhoto();
      if (!imageUrl) return;

      toast.info('Uploading photo...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileExt = blob.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Send message with media_url, not embedded base64
      await onSendMessage('📷 Photo', 'image', publicUrl);
      toast.success('Photo sent successfully');
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        await onSendMessage(
          `📍 Location: https://maps.google.com/?q=${location.latitude},${location.longitude}`,
          'location'
        );
        toast.success('Location sent successfully');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Failed to get location');
    }
  };

  const handleDocument = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-backups')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-backups')
          .getPublicUrl(fileName);

        await onSendMessage(`[Document] ${file.name}: ${publicUrl}`, 'document');
        toast.success('Document sent successfully');
      } catch (error) {
        console.error('Error uploading document:', error);
        toast.error('Failed to upload document');
      }
    }
  };

  const handlePollSend = async (question: string, options: string[]) => {
    try {
      const pollData = {
        question,
        options: options.map(opt => ({ text: opt, votes: 0 }))
      };
      await onSendMessage(`[Poll] ${JSON.stringify(pollData)}`, 'poll');
      toast.success('Poll sent successfully');
    } catch (error) {
      console.error('Error sending poll:', error);
      toast.error('Failed to send poll');
    }
  };

  const handleEventSend = async (eventData: any) => {
    try {
      await onSendMessage(`[Event] ${JSON.stringify(eventData)}`, 'event');
      toast.success('Event sent successfully');
    } catch (error) {
      console.error('Error sending event:', error);
      toast.error('Failed to send event');
    }
  };

  const handlePaymentSend = async (paymentData: any) => {
    try {
      await onSendMessage(`[Payment Request] ${JSON.stringify(paymentData)}`, 'payment');
      toast.success('Payment request sent');
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast.error('Failed to send payment request');
    }
  };

  const handleContactSend = async (contact: any) => {
    try {
      await onSendMessage(
        `[Contact] ${contact.contact_name} - ${contact.contact_phone}`,
        'contact'
      );
      toast.success('Contact shared successfully');
    } catch (error) {
      console.error('Error sharing contact:', error);
      toast.error('Failed to share contact');
    }
  };

  const handleAIImageSend = async (imageUrl: string, prompt: string) => {
    try {
      await onSendMessage(`[AI Image] ${prompt}: ${imageUrl}`, 'ai_image');
      toast.success('AI image sent successfully');
    } catch (error) {
      console.error('Error sending AI image:', error);
      toast.error('Failed to send AI image');
    }
  };

  return (
    <>
      {showAttachments && (
        <AttachmentMenu
          onClose={() => setShowAttachments(false)}
          onPhotoVideo={handlePhotoVideo}
          onLocation={handleLocation}
          onContact={() => setShowContactPicker(true)}
          onDocument={handleDocument}
          onPoll={() => setShowPollCreator(true)}
          onEvent={() => setShowEventCreator(true)}
          onPayment={() => setShowPaymentRequest(true)}
          onAIImage={() => setShowAIImageGen(true)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
      />

      <PollCreator
        open={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onSend={handlePollSend}
      />

      <EventCreator
        open={showEventCreator}
        onClose={() => setShowEventCreator(false)}
        onSend={handleEventSend}
      />

      <PaymentRequest
        open={showPaymentRequest}
        onClose={() => setShowPaymentRequest(false)}
        onSend={handlePaymentSend}
      />

      <ContactPicker
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSend={handleContactSend}
      />

      <AIImageGenerator
        open={showAIImageGen}
        onClose={() => setShowAIImageGen(false)}
        onSend={handleAIImageSend}
      />

      <div className="border-t bg-background/95 backdrop-blur-sm pb-20 safe-bottom">
        {/* AI Smart Replies */}
        <AnimatePresence>
          {lastMessage && !message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AISmartReplyPanel 
                lastMessage={lastMessage}
                onSelectReply={(reply) => setMessage(reply)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pt-2 pb-1.5 border-b bg-muted/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-primary">Replying to {replyTo.sender}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
                </div>
                {onCancelReply && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCancelReply}
                    className="h-6 w-6 rounded-full shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-2.5">
          <div className="flex items-end gap-1.5 bg-muted/40 rounded-[28px] px-3 py-2.5 border border-border/20">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message"
                className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-1.5 text-[15px] leading-tight placeholder:text-muted-foreground/60"
                disabled={disabled || sending}
                rows={1}
              />
            </div>

            <AnimatePresence mode="wait">
              {message.trim() ? (
                <motion.div
                  key="send"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sending || disabled}
                    size="icon"
                    className="rounded-full h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-0.5"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAttachments(true)}
                    className="rounded-full shrink-0 h-9 w-9 hover:bg-muted/60"
                    disabled={disabled}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceRecord}
                    className={`rounded-full shrink-0 h-9 w-9 hover:bg-muted/60 ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
                    disabled={disabled}
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};
