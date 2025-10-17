import React, { useState, memo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Star, Reply, Forward, Copy, Trash, Download, Share2, Edit, MapPin, Pin, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MessageContextMenu } from './MessageContextMenu';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PollMessageWrapper } from './PollMessageWrapper';
import { ContactMessage } from './ContactMessage';
import { EventMessage } from './EventMessage';
import { PaymentMessage } from './PaymentMessage';

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
  onEdit
}: MessageBubbleProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const handleLongPress = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setMenuPosition({ x: touch.clientX, y: touch.clientY });
    setShowMenu(true);
    
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
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
    toast.success('Message pinned');
  };

  const handleReport = () => {
    toast.success('Message reported');
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
      toast.success('Reply to message');
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
      toast.success('Forward message');
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
      toast.success('Message deleted');
    }
  };

  const messageActions = [
    { icon: Reply, label: 'Reply', action: handleReply, show: true },
    { icon: Forward, label: 'Forward', action: handleForward, show: true },
    { icon: Star, label: message.is_starred ? 'Unstar' : 'Star', action: handleStar, show: true },
    { icon: Pin, label: 'Pin', action: handlePin, show: true },
    { icon: AlertTriangle, label: 'Report', action: handleReport, show: !isOwn },
    { icon: Trash, label: 'Delete', action: handleDelete, variant: 'destructive' as const, show: isOwn }
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
      className={`flex gap-2 mb-1 px-3 relative w-full ${isOwn ? 'justify-end flex-row-reverse' : 'justify-start'}`}
      onTouchStart={handleLongPress}
      onContextMenu={handleContextMenu}
    >
      {/* Debug badge */}
      {isOwn && <div className="absolute -top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">YOU</div>}
      
      {!isOwn && (
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
        {/* Multiple media attachments */}
        {message.media_attachments && Array.isArray(message.media_attachments) && message.media_attachments.length > 0 && (
          <div className={`grid gap-1 mb-1 ${message.media_attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} max-w-[280px]`}>
            {message.media_attachments.map((media: any, idx: number) => (
              <div key={idx} className="relative group">
                <img 
                  src={media.url} 
                  alt={`Image ${idx + 1}`} 
                  className="rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity w-full h-32" 
                  onClick={() => window.open(media.url, '_blank')} 
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Single image (legacy) */}
        {message.media_url && message.message_type === 'image' && !message.media_attachments && (
          <img 
            src={message.media_url} 
            alt="Shared media" 
            className="rounded-2xl max-w-[240px] max-h-[240px] object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
            onClick={() => window.open(message.media_url, '_blank')} 
          />
        )}

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
        {message.message_type === 'location' && message.content.includes('maps.google.com') && (
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
        )}

        {/* Document message */}
        {message.message_type === 'document' && message.content.includes('[Document]') && (() => {
          const docInfo = message.content.replace('[Document] ', '').split(': ');
          const fileName = docInfo[0];
          const fileUrl = docInfo[1];
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
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">Tap to download</p>
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
         message.message_type !== 'image' && (
          <div 
            className={`rounded-[18px] px-4 py-2.5 ${
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
            message.read_at ? (
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Check className="w-3.5 h-3.5 text-muted-foreground/50" />
            )
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
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
