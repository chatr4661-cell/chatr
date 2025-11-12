import React, { useCallback, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageBubble } from './MessageBubble';
import { MessageListSkeleton } from './MessageListSkeleton';
import { SwipeableMessage } from '../SwipeableMessage';

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
  status?: string;
}

interface TrueVirtualMessageListProps {
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
  onPin?: (messageId: string) => void;
  onReport?: (message: Message) => void;
  selectionMode?: boolean;
  selectedMessages?: Set<string>;
  onSelectMessage?: (messageId: string) => void;
}

export const TrueVirtualMessageList = React.memo(({
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
  onEdit,
  onPin,
  onReport,
  selectionMode = false,
  selectedMessages = new Set(),
  onSelectMessage
}: TrueVirtualMessageListProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const wasAtBottom = useRef(true);

  // Auto-scroll to bottom on new messages (like WhatsApp)
  useEffect(() => {
    if (wasAtBottom.current && messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    wasAtBottom.current = atBottom;
  }, []);

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  const Header = useCallback(() => {
    if (isLoading && hasMore) {
      return (
        <div className="text-center py-3">
          <div className="w-5 h-5 border-2 border-primary/60 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      );
    }
    return null;
  }, [isLoading, hasMore]);

  const Footer = useCallback(() => {
    return <div className="h-2" />;
  }, []);

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
    <div className="flex-1 h-full bg-chat-background">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        followOutput="smooth"
        atBottomStateChange={handleAtBottomStateChange}
        startReached={handleStartReached}
        overscan={200}
        components={{
          Header,
          Footer
        }}
        itemContent={(index, message) => {
          const isOwn = message.sender_id === userId;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;

          return (
            <div className="px-2 py-1">
              <SwipeableMessage
                messageId={message.id}
                onReply={() => onReply?.(message)}
                onDelete={() => onDelete?.(message.id)}
              >
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  otherUser={otherUser}
                  onForward={onForward}
                  onStar={onStar}
                  onReply={onReply}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onPin={onPin}
                  onReport={onReport}
                  selectionMode={selectionMode}
                  isSelected={selectedMessages.has(message.id)}
                  onSelect={onSelectMessage}
                />
              </SwipeableMessage>
            </div>
          );
        }}
      />
    </div>
  );
});

TrueVirtualMessageList.displayName = 'TrueVirtualMessageList';
