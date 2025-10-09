import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, isToday, isSameDay } from 'date-fns';
import { ArrowDown } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

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
  onReply?: (message: Message) => void;
  onStar?: (messageId: string) => void;
}

export const MessageThread = ({ 
  messages, 
  userId, 
  otherUser,
  onReply,
  onStar 
}: MessageThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    // Scroll to bottom when messages change and user is at bottom
    if (scrollRef.current && isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledUp = element.scrollHeight - element.scrollTop - element.clientHeight > 100;
    setShowScrollButton(isScrolledUp);
    setIsAtBottom(!isScrolledUp);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const renderDateSeparator = (date: Date) => {
    let dateText = format(date, 'MMMM dd, yyyy');
    if (isToday(date)) {
      dateText = 'Today';
    }
    
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-muted/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          {dateText}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full">
      <ScrollArea className="h-full p-4" onScroll={handleScroll}>
        <div className="space-y-1" ref={scrollRef}>
          {messages.map((message, index) => {
            const isOwn = message.sender_id === userId;
            const prevMessage = messages[index - 1];
            const showAvatar = !isOwn && (!prevMessage || prevMessage.sender_id !== message.sender_id);
            
            // Show date separator if day changed
            const showDateSeparator = !prevMessage || 
              !isSameDay(new Date(message.created_at), new Date(prevMessage.created_at));

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && renderDateSeparator(new Date(message.created_at))}
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  otherUser={otherUser}
                  onReply={onReply}
                  onStar={onStar}
                />
              </React.Fragment>
            );
          })}
        </div>
      </ScrollArea>

      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-4 right-4 rounded-full h-10 w-10 shadow-lg animate-in fade-in zoom-in"
        >
          <ArrowDown className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};
