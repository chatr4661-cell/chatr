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
      className={`flex gap-1.5 md:gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'} px-2 md:px-0`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <Avatar className="w-7 h-7 md:w-9 md:h-9 mt-1 border-2 border-primary/20 shrink-0">
          <AvatarImage src={otherUser?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xs font-bold">
            {otherUser?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-7 md:w-9 shrink-0" />
      ) : null}

      <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {message.media_url && (
          <img
            src={message.media_url}
            alt="Shared media"
            className="rounded-2xl max-w-full h-auto shadow-md border border-border/20 hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => toast.info('Image lightbox coming soon')}
          />
        )}
        
        <div className="relative group/bubble">
          <div
            className={`rounded-2xl px-3 py-2 md:px-4 md:py-2.5 shadow-sm backdrop-blur-sm transition-all ${
              isOwn
                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                : 'bg-gradient-to-br from-muted to-muted/80 text-foreground border border-border/40'
            }`}
          >
            <p className="text-[15px] md:text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
              {message.is_edited && (
                <span className="text-xs opacity-70 ml-2">(edited)</span>
              )}
            </p>
          </div>

          {showActions && (
            <div className={`absolute top-0 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity`}>
              {onReply && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReply(message)}
                  className="h-7 w-7 rounded-full bg-card shadow-md hover:bg-muted"
                >
                  <Reply className="w-3.5 h-3.5" />
                </Button>
              )}
              {onStar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onStar(message.id)}
                  className="h-7 w-7 rounded-full bg-card shadow-md hover:bg-muted"
                >
                  <Star className={`w-3.5 h-3.5 ${message.is_starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-card shadow-md hover:bg-muted"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleForward}>
                    <Forward className="w-4 h-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                  {isOwn && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground font-medium">
            {formatMessageTime(new Date(message.created_at))}
          </span>
          {isOwn && (
            message.read_at ? (
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
            )
          )}
          {message.is_starred && (
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 px-1">
            {message.reactions.map((reaction: any, idx: number) => (
              <div
                key={idx}
                className="text-xs bg-muted rounded-full px-2 py-0.5"
              >
                {reaction.emoji} {reaction.count}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
