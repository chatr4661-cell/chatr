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
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`flex gap-1.5 group ${isOwn ? 'flex-row-reverse' : 'flex-row'} mb-0.5`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <Avatar className="w-7 h-7 shrink-0 mt-0.5 ring-1 ring-border/10">
          <AvatarImage src={otherUser?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-[10px] font-semibold">
            {otherUser?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={`flex flex-col gap-0.5 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {message.media_url && (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={message.media_url}
            alt="Shared media"
            className="rounded-2xl max-w-[200px] max-h-[200px] object-cover shadow-md border border-border/10 hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => toast.info('Image lightbox coming soon')}
          />
        )}
        
        <div className="relative group/bubble">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
            className={`rounded-[18px] px-3.5 py-2 shadow-sm transition-all active:scale-95 ${
              isOwn
                ? 'bg-gradient-to-br from-primary via-primary to-primary/95 text-primary-foreground shadow-primary/20'
                : 'bg-muted/80 backdrop-blur-sm text-foreground'
            }`}
          >
            <p className="text-[14px] whitespace-pre-wrap break-words leading-[1.4]">
              {message.content}
              {message.is_edited && (
                <span className="text-[9px] opacity-60 ml-1.5">(edited)</span>
              )}
            </p>
          </motion.div>

          {showActions && (
            <motion.div
              initial={{ opacity: 0, x: isOwn ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-0 ${isOwn ? 'right-full mr-1.5' : 'left-full ml-1.5'} flex items-center gap-0.5`}
            >
              {onReply && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReply(message)}
                  className="h-7 w-7 rounded-full bg-background/95 backdrop-blur-sm shadow-md hover:bg-muted border border-border/40"
                >
                  <Reply className="w-3 h-3" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/95 backdrop-blur-sm shadow-md hover:bg-muted border border-border/40"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-44">
                  {onStar && (
                    <DropdownMenuItem onClick={() => onStar(message.id)}>
                      <Star className={`w-3.5 h-3.5 mr-2 ${message.is_starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                      {message.is_starred ? 'Unstar' : 'Star'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleForward}>
                    <Forward className="w-3.5 h-3.5 mr-2" />
                    Forward
                  </DropdownMenuItem>
                  {isOwn && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash className="w-3.5 h-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-1 px-1"
        >
          <span className="text-[10px] text-muted-foreground/80">
            {formatMessageTime(new Date(message.created_at))}
          </span>
          {isOwn && (
            message.read_at ? (
              <CheckCheck className="w-3 h-3 text-primary/80" />
            ) : (
              <Check className="w-3 h-3 text-muted-foreground/50" />
            )
          )}
          {message.is_starred && (
            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 ml-0.5" />
          )}
        </motion.div>

        {message.reactions && message.reactions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-1 px-1"
          >
            {message.reactions.map((reaction: any, idx: number) => (
              <div
                key={idx}
                className="text-[11px] bg-muted/80 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border/10"
              >
                {reaction.emoji} {reaction.count}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
