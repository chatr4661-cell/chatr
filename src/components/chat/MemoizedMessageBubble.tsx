import { memo } from 'react';
import { MessageBubble } from './MessageBubble';

// Memoized version to prevent unnecessary re-renders
export const MemoizedMessageBubble = memo(MessageBubble, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.read_at === next.message.read_at &&
    prev.message.reactions === next.message.reactions &&
    prev.message.is_starred === next.message.is_starred &&
    prev.isOwn === next.isOwn
  );
});

MemoizedMessageBubble.displayName = 'MemoizedMessageBubble';
