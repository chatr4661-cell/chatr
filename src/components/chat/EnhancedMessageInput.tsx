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

      <div className="border-t bg-card/80 backdrop-blur-lg pb-24 md:pb-20 safe-bottom">
        {/* AI Smart Replies */}
        {lastMessage && !message && (
          <AISmartReplyPanel 
            lastMessage={lastMessage}
            onSelectReply={(reply) => setMessage(reply)}
          />
        )}
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

        <div className="p-4">
          <div className="flex items-end gap-2 bg-muted/50 rounded-3xl px-4 py-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-2 text-base"
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
