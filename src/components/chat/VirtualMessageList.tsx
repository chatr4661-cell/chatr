import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { MessageListSkeleton } from './MessageListSkeleton';
import { LazyImage } from '@/components/LazyImage';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  read_at?: string;
  is_starred?: boolean;
  is_edited?: boolean;
  reactions?: any[];
}

interface VirtualMessageListProps {
  messages: Message[];
  userId: string;
  otherUser?: {
    username: string;
    avatar_url?: string;
  };
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onForward?: (message: Message) => void;
  onStar?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
}

export const VirtualMessageList = React.memo(({
  messages,
  userId,
  otherUser,
  onLoadMore,
  hasMore,
  isLoading = false,
  onForward,
  onStar,
  onReply,
  onDelete,
  onEdit
}: VirtualMessageListProps) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lastMessageCountRef = React.useRef(messages.length);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Optimized auto-scroll to bottom on new messages
  React.useLayoutEffect(() => {
    if (scrollRef.current) {
      const shouldScroll = messages.length > lastMessageCountRef.current || 
                          (messages.length > 0 && lastMessageCountRef.current === 0);
      
      if (shouldScroll) {
        // Always scroll to bottom for new messages
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 100;
    setShouldAutoScroll(isAtBottom);
    
    // Load more when scrolled near top
    if (target.scrollTop < 300 && hasMore && onLoadMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore, isLoading]);

  if (isLoading && messages.length === 0) {
    return <MessageListSkeleton />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
        <p className="text-center">No messages yet. Start the conversation!</p>
      </div>
    );
  }


  return (
    <ScrollArea className="flex-1 h-full bg-[hsl(200,25%,97%)]" ref={scrollRef} onScroll={handleScroll}>
      <div className="py-3 w-full">
        {isLoading && hasMore && (
          <div className="text-center py-2">
            <div className="w-4 h-4 border-2 border-primary/60 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
        {messages.map((message, index) => {
          const isOwn = message.sender_id === userId;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
          
          // Debug first 3 messages
          if (index < 3) {
            console.log(`[MSG ${index}]`, {
              msgId: message.id.substring(0, 8),
              senderId: message.sender_id,
              userId: userId,
              isOwn,
              content: message.content.substring(0, 20)
            });
          }

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              showAvatar={showAvatar}
              otherUser={otherUser}
              onForward={onForward}
              onStar={onStar}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
});
