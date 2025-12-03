import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  conversationId: string;
  onMentionSelect?: (userId: string, username: string) => void;
  className?: string;
  placeholder?: string;
  children: (props: {
    showMentions: boolean;
    mentionQuery: string;
    filteredParticipants: Participant[];
    selectMention: (participant: Participant) => void;
    mentionPosition: { top: number; left: number };
  }) => React.ReactNode;
}

export const useMentions = (conversationId: string, inputValue: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadParticipants();
    loadCurrentUser();
  }, [conversationId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadParticipants = async () => {
    try {
      const { data } = await supabase
        .from('conversation_participants')
        .select('user_id, profiles!inner(id, username, avatar_url)')
        .eq('conversation_id', conversationId);

      if (data) {
        setParticipants(data as unknown as Participant[]);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const checkForMention = useCallback((text: string, cursorPosition: number) => {
    // Find the last @ before cursor
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowMentions(false);
      return;
    }

    // Check if there's a space between @ and cursor (mention complete)
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
    if (textAfterAt.includes(' ')) {
      setShowMentions(false);
      return;
    }

    // Check if @ is at start or after a space
    if (lastAtIndex > 0 && text[lastAtIndex - 1] !== ' ') {
      setShowMentions(false);
      return;
    }

    setMentionStartIndex(lastAtIndex);
    setMentionQuery(textAfterAt.toLowerCase());
    setShowMentions(true);
  }, []);

  const filteredParticipants = participants.filter(p => {
    if (p.user_id === currentUserId) return false;
    if (!mentionQuery) return true;
    return p.profiles.username.toLowerCase().includes(mentionQuery);
  });

  const insertMention = (text: string, participant: Participant): string => {
    if (mentionStartIndex === -1) return text;
    
    const before = text.slice(0, mentionStartIndex);
    const after = text.slice(mentionStartIndex + mentionQuery.length + 1);
    const mention = `@${participant.profiles.username} `;
    
    return before + mention + after;
  };

  return {
    showMentions,
    setShowMentions,
    mentionQuery,
    filteredParticipants,
    checkForMention,
    insertMention,
    participants
  };
};

export const MentionDropdown = ({
  show,
  participants,
  onSelect,
  position = { top: 0, left: 0 }
}: {
  show: boolean;
  participants: Participant[];
  onSelect: (participant: Participant) => void;
  position?: { top: number; left: number };
}) => {
  if (!show || participants.length === 0) return null;

  return (
    <div 
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
      style={{ 
        bottom: '100%',
        left: position.left,
        marginBottom: '8px'
      }}
    >
      {participants.map((p) => (
        <button
          key={p.user_id}
          className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
          onClick={() => onSelect(p)}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={p.profiles.avatar_url} />
            <AvatarFallback>
              {p.profiles.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">@{p.profiles.username}</span>
        </button>
      ))}
    </div>
  );
};

// Utility to extract mentioned user IDs from message content
export const extractMentions = (content: string, participants: Participant[]): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    const participant = participants.find(
      p => p.profiles.username.toLowerCase() === username.toLowerCase()
    );
    if (participant) {
      mentions.push(participant.user_id);
    }
  }

  return [...new Set(mentions)];
};

// Highlight mentions in message content
export const highlightMentions = (content: string): React.ReactNode => {
  const parts = content.split(/(@\w+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
};