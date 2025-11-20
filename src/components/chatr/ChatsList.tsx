import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface ChatsListProps {
  userId: string;
}

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  name: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  is_online: boolean;
  unread_count: number;
}

export function ChatsList({ userId }: ChatsListProps) {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadStories();
    loadConversations();
    loadCurrentUser();
  }, [userId]);

  const loadCurrentUser = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setCurrentUser(data);
  };

  const loadStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select(`
        id,
        user_id,
        profiles!inner(username, avatar_url)
      `)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setStories(data.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        username: s.profiles.username,
        avatar_url: s.profiles.avatar_url
      })));
    }
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner(
          id,
          is_group,
          group_name,
          group_icon_url,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('conversations(updated_at)', { ascending: false });

    if (data) {
      const conversationsData = await Promise.all(
        data.map(async (cp: any) => {
          const conv = cp.conversations;
          
          // Get other participant
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, profiles!inner(username, avatar_url, is_online, last_seen)')
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .limit(1);

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Get unread count - simplified
          const unreadCount = 0; // TODO: Implement unread count properly

          const otherUser = participants?.[0]?.profiles;
          
          return {
            id: conv.id,
            name: conv.is_group ? conv.group_name : otherUser?.username || 'Unknown',
            avatar_url: conv.is_group ? conv.group_icon_url : otherUser?.avatar_url,
            lastMessage: lastMsg?.[0]?.content || 'No messages yet',
            lastMessageTime: lastMsg?.[0]?.created_at ? formatDistanceToNow(new Date(lastMsg[0].created_at), { addSuffix: false }) : '',
            is_online: otherUser?.is_online || false,
            unread_count: unreadCount
          };
        })
      );

      setConversations(conversationsData.filter(c => c !== null));
    }
  };

  return (
    <div className="h-full" style={{ background: 'linear-gradient(180deg, hsl(263, 70%, 50%) 0%, hsl(263, 70%, 55%) 30%, hsl(0, 0%, 98%) 30%)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">CHATR</h1>
          <Avatar className="w-10 h-10">
            <AvatarImage src={currentUser?.avatar_url} />
            <AvatarFallback className="bg-white/20 text-white">
              {currentUser?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Stories Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex flex-col items-center min-w-[60px]">
            <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center text-2xl mb-1 ring-2 ring-white">
              💬
            </div>
            <span className="text-white text-xs font-medium">Chats</span>
          </div>
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center min-w-[60px]">
              <Avatar className="w-14 h-14 ring-2 ring-white mb-1">
                <AvatarImage src={story.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                  {story.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-xs font-medium truncate w-full text-center">{story.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">Recent Chats</h2>
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        </div>
        
        <div className="bg-white/95 rounded-3xl shadow-lg">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            conversations.map((chat, idx) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className={`flex items-center gap-3 p-3 ${idx !== conversations.length - 1 ? 'border-b border-gray-100' : ''} active:bg-gray-50 cursor-pointer`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={chat.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                      {chat.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {chat.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{chat.name}</span>
                    {chat.lastMessageTime && <span className="text-xs text-gray-500">{chat.lastMessageTime}</span>}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                </div>
                <div className="flex items-center gap-2">
                  {chat.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[hsl(263,70%,50%)] text-white text-xs flex items-center justify-center font-medium">
                      {chat.unread_count}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CHATR Updates */}
      <div className="px-4 pb-20">
        <h2 className="font-semibold text-gray-700 mb-3">CHATR Updates</h2>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">CHATR Updates</h3>
              <p className="text-sm text-gray-600">New features and announcements</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
