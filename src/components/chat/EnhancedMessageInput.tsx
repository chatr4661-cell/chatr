import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Plus, Smile, Mic, X } from 'lucide-react';
import { toast } from 'sonner';
import { AttachmentMenu } from './AttachmentMenu';
import { AISmartReplyPanel } from '../AISmartReplyPanel';
import { EmojiPicker } from '../EmojiPicker';
import { PollCreator } from '../PollCreator';
import { EventCreator } from './EventCreator';
import { PaymentRequest } from './PaymentRequest';
import { ContactPicker } from './ContactPicker';
import { AIImageGenerator } from './AIImageGenerator';
import { MultiImagePicker } from './MultiImagePicker';
import { capturePhoto, pickImage, getCurrentLocation } from '@/utils/mediaUtils';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaPreviewDialog } from './MediaPreviewDialog';

interface EnhancedMessageInputProps {
  onSendMessage: (content: string, type?: string, mediaAttachments?: any[]) => Promise<void>;
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
  const [showMultiImagePicker, setShowMultiImagePicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: 'image' | 'video';
  } | null>(null);
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
    if ((!message.trim() && selectedImages.length === 0) || sending || disabled) return;

    setSending(true);
    try {
      // Upload images if any
      let mediaAttachments: any[] = [];
      
      if (selectedImages.length > 0) {
        toast.info(`Uploading ${selectedImages.length} image(s)...`);
        
        for (const file of selectedImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('social-media')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('social-media')
            .getPublicUrl(filePath);

          mediaAttachments.push({
            url: publicUrl,
            type: 'image',
            filename: file.name,
            size: file.size
          });
        }
      }

      await onSendMessage(message.trim() || '📷 Image', 'text', mediaAttachments);
      setMessage('');
      setSelectedImages([]);
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

      // Show preview instead of sending immediately
      setMediaPreview({ url: imageUrl, type: 'image' });
    } catch (error) {
      console.error('Error picking image:', error);
      toast.error('Failed to pick image');
    }
  };

  const handleCamera = async () => {
    try {
      const imageUrl = await capturePhoto();
      if (!imageUrl) return;

      // Show preview instead of sending immediately
      setMediaPreview({ url: imageUrl, type: 'image' });
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

  const handleSendMedia = async (caption?: string) => {
    if (!mediaPreview) return;

    try {
      toast.info('Uploading media...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(mediaPreview.url);
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

      await onSendMessage(caption || '📷 Photo', 'image', [{url: publicUrl, type: 'image'}]);
      toast.success('Media sent successfully');
      setMediaPreview(null);
    } catch (error) {
      console.error('Media upload error:', error);
      toast.error('Failed to send media');
      setMediaPreview(null);
    }
  };

  const handleDocument = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error('File size exceeds 5MB limit');
        e.target.value = ''; // Reset input
        return;
      }

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
    e.target.value = ''; // Reset input after processing
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

  const handleMultiImageSelect = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      toast.info(`Uploading ${files.length} images...`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.type.split('/')[1] || 'jpg';
        const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('social-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Send all images as media attachments
      await onSendMessage(
        `📷 ${files.length} photo${files.length > 1 ? 's' : ''}`,
        'image',
        uploadedUrls.map(url => ({ type: 'image', url }))
      );

      setSelectedImages([]);
      setShowMultiImagePicker(false);
      toast.success(`${files.length} images sent successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    }
  };

  return (
    <>
      {showAttachments && (
        <AttachmentMenu
          onClose={() => setShowAttachments(false)}
          onCamera={handleCamera}
          onPhotoVideo={handlePhotoVideo}
          onMultiImage={() => setShowMultiImagePicker(true)}
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

      {/* Multi-Image Picker Dialog */}
      <Dialog open={showMultiImagePicker} onOpenChange={setShowMultiImagePicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Multiple Images</DialogTitle>
          </DialogHeader>
          <MultiImagePicker 
            onImagesSelected={handleMultiImageSelect}
            maxImages={10}
          />
        </DialogContent>
      </Dialog>

      {/* AI Smart Reply Panel */}
      <AISmartReplyPanel
        lastMessage={lastMessage || ''}
        onSelectReply={(reply) => {
          setMessage(reply);
          textareaRef.current?.focus();
        }}
      />

      <div className="border-t bg-white/95 backdrop-blur-sm safe-bottom">
        <div className="p-3 pb-6">
          <div className="flex items-center gap-2 bg-[hsl(200,25,95%)] rounded-[24px] px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAttachments(true)}
              className="h-8 w-8 rounded-full hover:bg-muted/50 shrink-0"
              disabled={disabled}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </Button>

            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message"
                className="min-h-[32px] max-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-1 text-[15px] placeholder:text-muted-foreground/50"
                disabled={disabled || sending}
                rows={1}
              />
            </div>

            <EmojiPicker onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)} />

            {message.trim() ? (
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending || disabled}
                size="icon"
                className="h-8 w-8 rounded-full bg-[hsl(185,75%,40%)] hover:bg-[hsl(185,75%,35%)] text-white shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceRecord}
                className={`h-8 w-8 rounded-full hover:bg-muted/50 shrink-0 ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
                disabled={disabled}
              >
                <Mic className="w-5 h-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <MediaPreviewDialog
        open={!!mediaPreview}
        onClose={() => setMediaPreview(null)}
        mediaUrl={mediaPreview?.url || ''}
        mediaType={mediaPreview?.type || 'image'}
        onSend={handleSendMedia}
      />
    </>
  );
};
