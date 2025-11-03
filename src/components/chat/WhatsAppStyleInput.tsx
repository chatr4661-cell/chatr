import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Mic, WifiOff, X, Plus, Camera, Image as ImageIcon, FileText, Mic2, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { useInputValidation } from '@/hooks/useInputValidation';
import { useMessageQueue } from '@/hooks/useMessageQueue';
import { supabase } from '@/integrations/supabase/client';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AIAssistantButton, AIAction } from './AIAssistantButton';
import { useAISmartReplies } from '@/hooks/useAISmartReplies';
import { MediaPreviewDialog } from './MediaPreviewDialog';
import { ContactPicker } from './ContactPicker';
import { capturePhoto, pickImage, getCurrentLocation } from '@/utils/mediaUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface WhatsAppStyleInputProps {
  onSendMessage: (content: string, type?: string, mediaAttachments?: any[]) => Promise<void>;
  conversationId: string;
  userId: string;
  disabled?: boolean;
  lastMessage?: string;
  conversationContext?: string[];
  onAIAction?: (action: AIAction) => void;
}

export const WhatsAppStyleInput: React.FC<WhatsAppStyleInputProps> = ({ 
  onSendMessage, 
  conversationId, 
  userId, 
  disabled,
  lastMessage,
  conversationContext = [],
  onAIAction
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'document'; fileName?: string } | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { validateMessage, sanitizeHtml } = useInputValidation();
  const { addToQueue, isOnline, queueLength } = useMessageQueue(userId);
  const { loading: aiLoading, generateSmartReplies } = useAISmartReplies();

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    const validation = validateMessage(message.trim());
    if (!validation.success) {
      toast.error(validation.error?.issues[0]?.message || 'Invalid message');
      return;
    }

    const sanitizedMessage = sanitizeHtml(message.trim());

    setSending(true);
    try {
      if (!isOnline) {
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

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Show preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewMedia({
          url: event.target?.result as string,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          fileName: file.name
        });
        setSelectedFile(file);
        setShowMediaPreview(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Direct upload for documents
      await uploadAndSendFile(file);
    }

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const uploadAndSendFile = async (file: File, caption?: string) => {
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${conversationId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      const messageType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 
                         file.type.startsWith('audio/') ? 'audio' : 'file';

      await onSendMessage(caption || file.name, messageType, [{ url: publicUrl, type: messageType }]);
      
      toast.success('File sent successfully!');
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      setSelectedFile(null);
    }
  };

  const handleMediaPreviewSend = async (caption?: string) => {
    if (selectedFile) {
      await uploadAndSendFile(selectedFile, caption);
      setShowMediaPreview(false);
      setPreviewMedia(null);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const photoDataUrl = await capturePhoto();
      if (photoDataUrl) {
        setPreviewMedia({
          url: photoDataUrl,
          type: 'image',
          fileName: 'Camera Photo'
        });
        
        // Convert data URL to File
        const response = await fetch(photoDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setShowMediaPreview(true);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      toast.error('Failed to capture photo');
    }
    setShowAttachMenu(false);
  };

  const handleGalleryPick = async () => {
    try {
      const imageDataUrl = await pickImage();
      if (imageDataUrl) {
        setPreviewMedia({
          url: imageDataUrl,
          type: 'image',
          fileName: 'Gallery Image'
        });
        
        // Convert data URL to File
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setShowMediaPreview(true);
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      toast.error('Failed to pick image');
    }
    setShowAttachMenu(false);
  };

  const handleLocationShare = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        const locationMessage = `📍 Location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
        await onSendMessage(locationMessage, 'text');
        toast.success('Location shared!');
      }
    } catch (error) {
      console.error('Location share error:', error);
      toast.error('Failed to share location');
    }
    setShowAttachMenu(false);
  };

  const handleContactShare = async (contact: any) => {
    try {
      const contactMessage = `👤 Contact: ${contact.contact_name}\n📞 ${contact.contact_phone}`;
      await onSendMessage(contactMessage, 'contact', [{ 
        name: contact.contact_name, 
        phone: contact.contact_phone 
      }]);
      toast.success('Contact shared!');
    } catch (error) {
      console.error('Contact share error:', error);
      toast.error('Failed to share contact');
    }
  };

  const handleVoiceMessage = async (transcription: string, audioUrl?: string) => {
    try {
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

        await onSendMessage(transcription, 'voice', [{ url: publicUrl, type: 'voice' }]);
      } else {
        await onSendMessage(transcription, 'text');
      }
      
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Voice message error:', error);
      toast.error('Failed to send voice message');
    }
  };

  const handleAIAction = (action: AIAction) => {
    if (onAIAction) {
      onAIAction(action);
    }
  };

  const attachmentOptions = [
    { icon: Camera, label: 'Camera', action: handleCameraCapture, color: 'bg-pink-500' },
    { icon: ImageIcon, label: 'Gallery', action: handleGalleryPick, color: 'bg-purple-500' },
    { icon: FileText, label: 'Document', action: () => fileInputRef.current?.click(), color: 'bg-blue-500' },
    { icon: MapPin, label: 'Location', action: handleLocationShare, color: 'bg-green-500' },
    { icon: User, label: 'Contact', action: () => { setShowContactPicker(true); setShowAttachMenu(false); }, color: 'bg-orange-500' },
  ];

  return (
    <div className="border-t bg-white dark:bg-gray-900 p-3">
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
          <WifiOff className="w-4 h-4" />
          <span>Offline - messages will be queued</span>
          {queueLength > 0 && (
            <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded-full">
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
            <div className="mb-2 flex items-center gap-2 text-sm text-primary bg-primary/5 px-3 py-2 rounded-lg">
              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Uploading {selectedFile?.name}...</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,video/*"
            />

            {/* AI Assistant Button */}
            <AIAssistantButton 
              onAction={handleAIAction}
              loading={aiLoading}
            />

            {/* Attachment Menu */}
            <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0 h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  disabled={disabled || uploadingFile}
                >
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start" side="top">
                <div className="grid gap-1">
                  {attachmentOptions.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 px-3"
                      onClick={() => {
                        option.action();
                        setShowAttachMenu(false);
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center mr-3`}>
                        <option.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Message Input */}
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message"
                className="min-h-[44px] max-h-[120px] resize-none rounded-3xl pr-12 bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-1 focus-visible:ring-primary/20 text-[15px] leading-relaxed"
                disabled={disabled || sending}
                rows={1}
              />
            </div>

            {/* Send / Voice Button */}
            {message.trim() ? (
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending || disabled}
                size="icon"
                className="rounded-full shrink-0 h-11 w-11 bg-teal-600 hover:bg-teal-700 transition-all"
              >
                <Send className="w-5 h-5 text-white" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0 h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={disabled}
                onClick={() => setShowVoiceRecorder(true)}
              >
                <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Button>
            )}
          </div>
        </>
      )}

      {/* Media Preview Dialog */}
      {previewMedia && (
        <MediaPreviewDialog
          open={showMediaPreview}
          onClose={() => {
            setShowMediaPreview(false);
            setPreviewMedia(null);
            setSelectedFile(null);
          }}
          onSend={handleMediaPreviewSend}
          mediaUrl={previewMedia.url}
          mediaType={previewMedia.type}
          fileName={previewMedia.fileName}
        />
      )}

      {/* Contact Picker */}
      <ContactPicker
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSend={handleContactShare}
      />
    </div>
  );
};
