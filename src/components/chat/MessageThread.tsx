import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at?: string;
  message_type?: string;
  media_url?: string;
}

interface MessageThreadProps {
  messages: Message[];
  userId: string;
  otherUser?: {
    username: string;
    avatar_url?: string;
  };
}

export const MessageThread = ({ messages, userId, otherUser }: MessageThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <ScrollArea className="h-full p-4" ref={scrollRef}>
      <div className="space-y-3">
        {messages.map((message, index) => {
          const isOwn = message.sender_id === userId;
          const prevMessage = messages[index - 1];
          const showAvatar = !isOwn && (!prevMessage || prevMessage.sender_id !== message.sender_id);

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {showAvatar ? (
                <Avatar className="w-9 h-9 mt-1 border-2 border-primary/10">
                  <AvatarImage src={otherUser?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
                    {otherUser?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ) : !isOwn ? (
                <div className="w-9" />
              ) : null}

              <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {message.media_url && (
                  <img
                    src={message.media_url}
                    alt="Shared media"
                    className="rounded-2xl max-w-full h-auto shadow-md border border-border/20"
                  />
                )}
                
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground border border-border/30'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
