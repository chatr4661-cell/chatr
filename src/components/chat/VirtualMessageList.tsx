import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { MessageListSkeleton } from './MessageListSkeleton';

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
}

export const VirtualMessageList = React.memo(({
  messages,
  userId,
  otherUser,
  onLoadMore,
  hasMore,
  isLoading = false
}: VirtualMessageListProps) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lastMessageCountRef = React.useRef(messages.length);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Optimized auto-scroll to bottom on new messages
  React.useLayoutEffect(() => {
    if (messages.length > lastMessageCountRef.current && shouldAutoScroll && scrollRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, shouldAutoScroll]);

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
    <ScrollArea className="flex-1 h-full" ref={scrollRef} onScroll={handleScroll}>
      <div className="space-y-0.5 p-3 pb-2">
        {isLoading && hasMore && (
          <div className="text-center py-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
        {messages.map((message, index) => {
          const isOwn = message.sender_id === userId;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              showAvatar={showAvatar}
              otherUser={otherUser}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
});
