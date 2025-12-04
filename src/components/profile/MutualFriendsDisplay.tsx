import React, { useEffect } from 'react';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { cn } from '@/lib/utils';

interface MutualFriendsDisplayProps {
  userId: string;
  maxDisplay?: number;
  className?: string;
}

export const MutualFriendsDisplay = ({
  userId,
  maxDisplay = 3,
  className
}: MutualFriendsDisplayProps) => {
  const { loading, fetchMutualFriends, mutualFriendsMap } = useMutualFriends();
  const mutualFriends = mutualFriendsMap.get(userId) || [];

  useEffect(() => {
    fetchMutualFriends(userId);
  }, [userId, fetchMutualFriends]);

  if (loading) {
    return <div className="animate-pulse bg-muted h-6 w-32 rounded" />;
  }

  if (mutualFriends.length === 0) return null;

  const displayFriends = mutualFriends.slice(0, maxDisplay);
  const remaining = mutualFriends.length - maxDisplay;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex -space-x-2">
        {displayFriends.map((friend) => (
          <Avatar key={friend.id} className="w-6 h-6 border-2 border-background">
            <AvatarImage src={friend.avatarUrl} />
            <AvatarFallback className="text-[10px] bg-primary/20">
              {friend.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      <span className="text-xs text-muted-foreground">
        <Users className="w-3 h-3 inline mr-1" />
        {mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? 's' : ''}
        {remaining > 0 && ` (+${remaining} more)`}
      </span>
    </div>
  );
};
