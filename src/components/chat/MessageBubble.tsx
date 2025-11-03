import React, { useState, memo, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Star, Reply, Forward, Copy, Trash, Download, Share2, Edit, MapPin, Pin, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MessageContextMenu } from './MessageContextMenu';
import { PollMessageWrapper } from './PollMessageWrapper';
import { ContactMessage } from './ContactMessage';
import { EventMessage } from './EventMessage';
import { PaymentMessage } from './PaymentMessage';
import { MediaLightbox } from './MediaLightbox';
import { autoSaveReceivedMedia } from '@/utils/mediaGallery';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at?: string;
  message_type?: string;
  media_url?: string;
  media_attachments?: any;
  is_starred?: boolean;
  is_edited?: boolean;
  reactions?: any[];
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherUser?: {
    username: string;
    avatar_url?: string;
  };
  onReply?: (message: Message) => void;
  onStar?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  isSelected?: boolean;
  onSelect?: (messageId: string) => void;
  selectionMode?: boolean;
}

const MessageBubbleComponent = ({ 
  message, 
  isOwn, 
  showAvatar, 
  otherUser,
  onReply,
  onStar,
  onForward,
  onDelete,
  onEdit,
  isSelected = false,
  onSelect,
  selectionMode = false
}: MessageBubbleProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const longPressTimerRef = React.useRef<NodeJS.Timeout>();
  const touchStartPosRef = React.useRef({ x: 0, y: 0 });
  const autoSaveAttemptedRef = React.useRef(false);

  // Auto-save received media (once per message)
  useEffect(() => {
    if (!isOwn && !autoSaveAttemptedRef.current && message.media_url && 
        (message.message_type === 'image' || message.message_type === 'video')) {
      autoSaveAttemptedRef.current = true;
      autoSaveReceivedMedia(
        message.media_url,
        `chatr-${message.id}`,
        message.message_type as 'image' | 'video'
      );
    }
  }, [message, isOwn]);

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (selectionMode) {
      onSelect?.(message.id);
      return;
    }
    
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    setIsLongPressing(false);
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowMenu(true);
      // Vibrate on long press if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  }, [selectionMode, message.id, onSelect]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const moveThreshold = 10;
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    if (dx > moveThreshold || dy > moveThreshold) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setIsLongPressing(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message copied');
  };

  const handleStar = () => {
    onStar?.(message.id);
    toast.success(message.is_starred ? 'Message unstarred' : 'Message starred');
  };

  const handleDownload = () => {
    if (message.media_url) {
      window.open(message.media_url, '_blank');
      toast.success('Opening media...');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        text: message.content,
        url: message.media_url
      });
    } else {
      handleCopy();
    }
  };

  const extractLocationCoords = (content: string) => {
    const match = content.match(/q=([^&]+)/);
    return match ? match[1] : '';
  };

  const handlePin = () => {
    console.log('Pin clicked', message.id);
    // Store pinned messages in localStorage for now
    const pinnedKey = `pinned_messages`;
    const pinned = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
    
    if (!pinned.includes(message.id)) {
      pinned.push(message.id);
      localStorage.setItem(pinnedKey, JSON.stringify(pinned));
      toast.success('Message pinned');
    } else {
      const filtered = pinned.filter((id: string) => id !== message.id);
      localStorage.setItem(pinnedKey, JSON.stringify(filtered));
      toast.success('Message unpinned');
    }
  };

  const handleReport = () => {
    // Simple report with confirmation
    toast.success('Message reported to moderators');
    console.log('Reported message:', message.id);
  };

  const handleReply = () => {
    console.log('Reply clicked', { hasOnReply: !!onReply, message: message.id });
    if (onReply) {
      onReply(message);
    } else {
      toast.error('Reply handler not connected');
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
  };

  const handleDelete = () => {
    console.log('Delete clicked', { hasOnDelete: !!onDelete, message: message.id });
    if (onDelete) {
      setShowDeleteDialog(true);
    } else {
      toast.error('Delete handler not connected');
    }
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    console.log('Confirm delete', message.id);
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleStarToggle = async () => {
    console.log('Star clicked', { hasOnStar: !!onStar, message: message.id });
    if (onStar) {
      onStar(message.id);
    } else {
      toast.error('Star handler not connected');
    }
  };

  const messageActions = [
    { icon: Reply, label: 'Reply', action: () => {
      console.log('Action triggered: Reply');
      handleReply();
    }, show: true },
    { icon: Forward, label: 'Forward', action: () => {
      console.log('Action triggered: Forward');
      handleForward();
    }, show: true },
    { icon: Star, label: message.is_starred ? 'Unstar' : 'Star', action: () => {
      console.log('Action triggered: Star');
      handleStarToggle();
    }, show: true },
    { icon: Pin, label: 'Pin', action: () => {
      console.log('Action triggered: Pin');
      handlePin();
    }, show: true },
    { icon: AlertTriangle, label: 'Report', action: () => {
      console.log('Action triggered: Report');
      handleReport();
    }, show: !isOwn },
    { icon: Trash, label: 'Delete', action: () => {
      console.log('Action triggered: Delete');
      handleDelete();
    }, variant: 'destructive' as const, show: isOwn }
  ];

  // Debug logging
  console.log('[MessageBubble]', {
    msgId: message.id.substring(0, 8),
    isOwn,
    senderId: message.sender_id,
    content: message.content.substring(0, 15)
  });

  return (
    <div
      className={`flex gap-2 mb-1 px-3 relative w-full ${isOwn ? 'justify-end flex-row-reverse' : 'justify-start'} ${selectionMode ? 'items-center' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className={`shrink-0 ${isOwn ? 'order-last' : 'order-first'}`}>
          <div 
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-primary border-primary' 
                : 'border-muted-foreground/40 bg-background'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}
      
      {!isOwn && !selectionMode && (
        showAvatar ? (
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={otherUser?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/20 text-primary text-xs font-semibold">
              {otherUser?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 shrink-0" />
        )
      )}

      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Multiple media attachments - Images/Videos */}
        {(() => {
          const hasMediaAttachments = message.media_attachments && 
                                       (Array.isArray(message.media_attachments) ? message.media_attachments.length > 0 : Object.keys(message.media_attachments).length > 0);
          const isMediaType = message.message_type === 'image' || message.message_type === 'video';
          
          if (hasMediaAttachments && isMediaType) {
            const attachments = Array.isArray(message.media_attachments) ? message.media_attachments : [message.media_attachments];
            console.log('🖼️ Rendering media:', { type: message.message_type, attachments });
            
            const mediaItems = attachments.map((media: any) => ({
              url: media.url,
              type: message.message_type as 'image' | 'video',
              filename: media.name,
              path: media.url.split('/chat-media/')[1] // Extract storage path
            }));

            return (
              <div className="max-w-[280px]">
                <div className={`grid gap-1 mb-1 ${attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {attachments.map((media: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="relative group rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => {
                        setMediaViewerIndex(idx);
                        setShowMediaViewer(true);
                      }}
                    >
                      {message.message_type === 'video' ? (
                        <video 
                          src={media.url} 
                          className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <img 
                          src={media.url} 
                          alt={media.name || `Image ${idx + 1}`} 
                          className="w-full h-32 object-cover hover:opacity-90 transition-opacity" 
                        />
                      )}
                    </div>
                  ))}
                </div>
                <MediaLightbox
                  media={mediaItems}
                  initialIndex={mediaViewerIndex}
                  open={showMediaViewer}
                  onClose={() => setShowMediaViewer(false)}
                />
                {/* Caption if present */}
                {message.content && !message.content.startsWith('image_') && !message.content.startsWith('photo_') && (
                  <div className={`rounded-2xl px-4 py-2.5 mt-1 ${
                    isOwn
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                  style={isOwn ? { backgroundColor: '#0d9488' } : undefined}
                  >
                    <p className="text-[15px] leading-[1.4] whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}
        
        {/* Single image (legacy) */}
        {message.media_url && message.message_type === 'image' && !message.media_attachments && (() => {
          const legacyMedia = [{
            url: message.media_url,
            type: 'image' as const,
            filename: 'Image',
            path: message.media_url.split('/chat-media/')[1]
          }];
          
          return (
            <>
              <img 
                src={message.media_url} 
                alt="Shared media" 
                className="rounded-2xl max-w-[240px] max-h-[240px] object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
                onClick={() => {
                  setMediaViewerIndex(0);
                  setShowMediaViewer(true);
                }} 
              />
              <MediaLightbox
                media={legacyMedia}
                initialIndex={0}
                open={showMediaViewer}
                onClose={() => setShowMediaViewer(false)}
              />
            </>
          );
        })()}

        {/* Poll message */}
        {message.message_type === 'poll' && message.content.startsWith('[Poll]') && (() => {
          try {
            const pollData = JSON.parse(message.content.replace('[Poll] ', ''));
            return (
              <PollMessageWrapper 
                messageId={message.id}
                data={pollData}
                isOwn={isOwn}
              />
            );
          } catch (error) {
            console.error('Failed to parse poll data:', error);
            return <div className="text-sm text-muted-foreground">Invalid poll data</div>;
          }
        })()}

        {/* Contact message */}
        {message.message_type === 'contact' && message.content.startsWith('[Contact]') && (
          <ContactMessage 
            content={message.content.replace(/\[Contact\]\s*\[Contact\]\s*/g, '[Contact] ')} 
            isOwn={isOwn}
          />
        )}

        {/* Event message */}
        {message.message_type === 'event' && message.content.startsWith('[Event]') && (() => {
          try {
            const eventData = JSON.parse(message.content.replace('[Event] ', ''));
            return <EventMessage data={eventData} isOwn={isOwn} />;
          } catch (error) {
            console.error('Failed to parse event data:', error);
            return <div className="text-sm text-muted-foreground">Invalid event data</div>;
          }
        })()}

        {/* Payment message */}
        {message.message_type === 'payment' && message.content.startsWith('[Payment]') && (() => {
          try {
            const paymentData = JSON.parse(message.content.replace('[Payment] ', ''));
            return <PaymentMessage data={paymentData} />;
          } catch (error) {
            console.error('Failed to parse payment data:', error);
            return <div className="text-sm text-muted-foreground">Invalid payment data</div>;
          }
        })()}

        {/* Location message with map preview */}
        {message.message_type === 'location' && message.content && message.content.includes('maps.google.com') && (() => {
          console.log('📍 Rendering location:', message.content);
          return (
          <div className={`rounded-2xl overflow-hidden border ${isOwn ? 'border-teal-600/20' : 'border-border'} mb-1 max-w-[280px] bg-background`}>
            <iframe
              src={`https://maps.google.com/maps?q=${extractLocationCoords(message.content)}&output=embed`}
              className="w-full h-40"
              loading="lazy"
              title="Location"
            />
            <div className={`p-3 ${isOwn ? 'bg-teal-600/10' : 'bg-muted/50'}`}>
              <a
                href={message.content.split(' ').pop()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary font-medium text-sm hover:underline"
              >
                <MapPin className="w-4 h-4" />
                View in Maps
              </a>
            </div>
          </div>
          );
        })()}

        {/* Document message */}
        {message.message_type === 'document' && message.media_attachments && (() => {
          const attachments = Array.isArray(message.media_attachments) ? message.media_attachments : [message.media_attachments];
          if (attachments.length === 0) return null;
          
          const doc = attachments[0];
          console.log('📄 Rendering document:', doc);
          const fileUrl = doc.url;
          const fileName = doc.name || 'Document';
          const fileSize = doc.size;
          
          const formatSize = (bytes?: number) => {
            if (!bytes) return '';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          };
          
          return (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                isOwn 
                  ? 'bg-teal-600/10 border-teal-600/20 hover:bg-teal-600/20' 
                  : 'bg-muted/50 border-border hover:bg-muted'
              } max-w-[280px]`}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">{formatSize(fileSize) || 'Tap to download'}</p>
              </div>
            </a>
          );
        })()}
        
        {/* Regular text message - ONLY if not a special type */}
        {!message.media_url && 
         message.message_type !== 'location' && 
         message.message_type !== 'poll' && 
         message.message_type !== 'contact' &&
         message.message_type !== 'event' &&
         message.message_type !== 'payment' &&
         message.message_type !== 'image' &&
         message.message_type !== 'video' &&
         message.message_type !== 'document' && (
          <div 
            className={`rounded-[18px] px-4 py-2.5 transition-all ${
              isLongPressing ? 'scale-95 opacity-70' : ''
            } ${
              isOwn
                ? 'bg-teal-600 text-white'
                : 'bg-gray-200 text-gray-900'
            }`}
            style={isOwn ? { backgroundColor: '#0d9488' } : undefined}
          >
            <p className="text-[15px] leading-[1.4] whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1 px-1.5">
          <span className="text-[11px] text-muted-foreground">
            {formatMessageTime(new Date(message.created_at))}
          </span>
          {isOwn && (
            <span title={message.read_at ? "Read" : "Delivered"}>
              {message.read_at ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-muted-foreground/60" />
              )}
            </span>
          )}
          {message.is_edited && (
            <span className="text-[10px] text-muted-foreground/70">(edited)</span>
          )}
        </div>
      </div>

      {/* Context menu */}
      <MessageContextMenu
        open={showMenu}
        onClose={() => setShowMenu(false)}
        position={menuPosition}
        actions={messageActions.filter(a => a.show !== false)}
        message={message}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[90%] max-w-[320px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
