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
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'document'; fileName?: string; fileSize?: number } | null>(null);
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

    // Check file size limit
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    // Show preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewMedia({
            url: event.target?.result as string,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            fileName: file.name,
            fileSize: file.size
          });
          setSelectedFile(file);
          setShowMediaPreview(true);
        };
        reader.onerror = () => {
          toast.error('Failed to read file');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('File read error:', error);
        toast.error('Failed to process file');
      }
    } else {
      // Show preview for documents too
      setPreviewMedia({
        url: '',
        type: 'document',
        fileName: file.name,
        fileSize: file.size
      });
      setSelectedFile(file);
      setShowMediaPreview(true);
    }

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    setShowAttachMenu(false);
  };

  const uploadAndSendFile = async (file: File, caption?: string) => {
    setUploadingFile(true);
    
    try {
      // Show upload progress
      toast.info(`Uploading ${file.name}...`);
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
      const timestamp = Date.now();
      const fileName = `${userId}/${conversationId}/${timestamp}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Determine message type
      let messageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      else if (file.type.includes('pdf') || file.type.includes('document')) messageType = 'document';

      // Create media attachment
      const mediaAttachment = {
        url: publicUrl,
        type: messageType,
        name: file.name,
        size: file.size,
        mimeType: file.type
      };

      // Format content based on type
      let messageContent = caption || file.name;
      if (messageType === 'document' && !caption) {
        messageContent = `[Document] ${file.name}: ${publicUrl}`;
      }

      // Send message with attachment
      await onSendMessage(
        messageContent, 
        messageType, 
        [mediaAttachment]
      );
      
      toast.success(`${file.name} sent successfully!`);
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error(error.message || 'Failed to upload file. Please try again.');
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
      toast.info('Opening camera...');
      const photoDataUrl = await capturePhoto();
      
      if (photoDataUrl) {
        setPreviewMedia({
          url: photoDataUrl,
          type: 'image',
          fileName: `Photo ${new Date().toLocaleTimeString()}`,
          fileSize: undefined
        });
        
        // Convert data URL to File
        const response = await fetch(photoDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setShowMediaPreview(true);
      } else {
        toast.error('No photo captured');
      }
    } catch (error: any) {
      console.error('Camera capture error:', error);
      toast.error(error.message || 'Failed to access camera. Please enable camera permissions.');
    }
    setShowAttachMenu(false);
  };

  const handleGalleryPick = async () => {
    try {
      toast.info('Opening gallery...');
      const imageDataUrl = await pickImage();
      
      if (imageDataUrl) {
        setPreviewMedia({
          url: imageDataUrl,
          type: 'image',
          fileName: `Image ${new Date().toLocaleTimeString()}`,
          fileSize: undefined
        });
        
        // Convert data URL to File
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setShowMediaPreview(true);
      } else {
        toast.error('No image selected');
      }
    } catch (error: any) {
      console.error('Gallery pick error:', error);
      toast.error(error.message || 'Failed to access gallery. Please enable photo permissions.');
    }
    setShowAttachMenu(false);
  };

  const handleLocationShare = async () => {
    try {
      toast.info('Getting your location...');
      const location = await getCurrentLocation();
      if (location) {
        // Create rich location message
        const locationData = {
          latitude: location.latitude,
          longitude: location.longitude,
          mapUrl: `https://maps.google.com/?q=${location.latitude},${location.longitude}`
        };
        
        await onSendMessage(
          `📍 Location\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}`,
          'location',
          [locationData]
        );
        toast.success('Location shared successfully!');
      } else {
        toast.error('Could not get your location');
      }
    } catch (error: any) {
      console.error('Location share error:', error);
      toast.error(error.message || 'Failed to share location. Please enable location permissions.');
    }
    setShowAttachMenu(false);
  };

  const handleContactShare = async (contact: any) => {
    try {
      // Format: [Contact] Name - Phone
      const formattedContact = `[Contact] ${contact.contact_name} - ${contact.contact_phone}`;
      
      const contactCard = {
        name: contact.contact_name,
        phone: contact.contact_phone,
        avatar: contact.avatar_url
      };
      
      await onSendMessage(
        formattedContact, 
        'contact', 
        [contactCard]
      );
      
      toast.success(`Shared ${contact.contact_name}'s contact`);
      setShowContactPicker(false);
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
    { 
      icon: Camera, 
      label: 'Camera', 
      action: handleCameraCapture, 
      color: 'bg-gradient-to-br from-pink-500 to-pink-600',
      description: 'Take a photo'
    },
    { 
      icon: ImageIcon, 
      label: 'Gallery', 
      action: handleGalleryPick, 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      description: 'Choose from gallery'
    },
    { 
      icon: FileText, 
      label: 'Document', 
      action: () => { fileInputRef.current?.click(); setShowAttachMenu(false); }, 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      description: 'Share a file'
    },
    { 
      icon: MapPin, 
      label: 'Location', 
      action: handleLocationShare, 
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      description: 'Share your location'
    },
    { 
      icon: User, 
      label: 'Contact', 
      action: () => { setShowContactPicker(true); setShowAttachMenu(false); }, 
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      description: 'Share a contact'
    },
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
            <div className="mb-3 flex items-center gap-3 text-sm bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 rounded-2xl border border-primary/20">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="flex-1">
                <p className="font-medium text-primary">Uploading...</p>
                <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
              </div>
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
              <PopoverContent className="w-64 p-2" align="start" side="top">
                <div className="grid gap-1">
                  {attachmentOptions.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 px-3 hover:bg-accent transition-colors"
                      onClick={() => {
                        option.action();
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center mr-3 shadow-md`}>
                        <option.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
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
          fileSize={previewMedia.fileSize}
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
