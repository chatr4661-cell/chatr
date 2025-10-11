import React, { useEffect, useRef, useCallback } from 'react';
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

export const VirtualMessageList = ({
  messages,
  userId,
  otherUser,
  onLoadMore,
  hasMore,
  isLoading = false
}: VirtualMessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Load more when scrolled near top
    if (target.scrollTop < 200 && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  if (isLoading && messages.length === 0) {
    return <MessageListSkeleton />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full bg-background/30 backdrop-blur-sm" ref={scrollRef} onScroll={handleScroll}>
      <div className="space-y-2 p-4">
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
};
