import React, { useState, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Star, Reply, Forward, Copy, Trash, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at?: string;
  message_type?: string;
  media_url?: string;
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
}

const MessageBubbleComponent = ({ 
  message, 
  isOwn, 
  showAvatar, 
  otherUser,
  onReply,
  onStar 
}: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message copied');
  };

  const handleDelete = () => {
    toast.info('Delete functionality coming soon');
  };

  const handleForward = () => {
    toast.info('Forward functionality coming soon');
  };

  return (
    <div
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} mb-1 px-3`}
    >
      {showAvatar ? (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={otherUser?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/20 text-primary text-xs font-semibold">
            {otherUser?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-8 shrink-0" />
      ) : null}

      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {message.media_url && (
          <img
            src={message.media_url}
            alt="Shared media"
            className="rounded-2xl max-w-[240px] max-h-[240px] object-cover mb-1"
          />
        )}
        
        <div className={`rounded-[18px] px-4 py-2.5 ${
          isOwn
            ? 'bg-[hsl(185,75%,40%)] text-white'
            : 'bg-[hsl(200,25%,94%)] text-foreground'
        }`}>
          <p className="text-[15px] leading-[1.4] whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

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
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
