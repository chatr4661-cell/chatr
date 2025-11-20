import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface ChatsListProps {
  userId: string;
}

export function ChatsList({ userId }: ChatsListProps) {
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
    loadStories();
  }, [userId]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          group_name,
          group_icon_url,
          updated_at,
          conversation_participants!inner (
            user_id,
            profiles (
              id,
              username,
              avatar_url
            )
          ),
          messages (
            content,
            created_at
          )
        `)
        .eq('conversation_participants.user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Mock data for demo
      const mockChats = [
        {
          id: '1',
          name: 'Ammar',
          lastMessage: 'Sounds good',
          timestamp: new Date(),
          unreadCount: 0,
          isOnline: true,
          avatar: '👤',
        },
        {
          id: '2',
          name: 'Sanobar',
          lastMessage: 'See you tomorrow!',
          timestamp: new Date(Date.now() - 300000),
          unreadCount: 2,
          isOnline: true,
          avatar: '👤',
        },
        {
          id: '3',
          name: 'Ag go',
          lastMessage: 'Thanks!',
          timestamp: new Date(Date.now() - 18000000),
          unreadCount: 0,
          isOnline: false,
          avatar: '👤',
        },
      ];

      setChats(mockChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles(username, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStories(data);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Stories Bar */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-xl font-bold">
              +
            </div>
            <span className="text-xs text-muted-foreground">Your Story</span>
          </div>
          {['Chats', 'Arshel', 'Ammar', 'Sana', 'Gatay'].map((name, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary-glow to-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl">
                  👤
                </div>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[60px]">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-0"
          />
        </div>

        {/* Scortes Section */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            Scortes
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          </h3>
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center text-2xl">
                    {chat.avatar}
                  </div>
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{chat.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(chat.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{chat.lastMessage}</span>
                    {chat.unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHATR Updates */}
        <div className="p-4 bg-gradient-to-br from-primary/5 to-primary-glow/5 rounded-2xl">
          <h3 className="font-semibold mb-1">CHATR Updates</h3>
          <p className="text-sm text-muted-foreground">New features and announcements</p>
        </div>
      </div>

      {/* FABs */}
      <Button
        size="lg"
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-glow"
        onClick={() => navigate('/contacts')}
      >
        <Plus className="w-6 h-6" />
      </Button>
      
      <Button
        size="lg"
        variant="secondary"
        className="fixed bottom-24 left-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary-glow text-white border-0"
        onClick={() => navigate('/prechu-ai')}
      >
        AI
      </Button>
    </div>
  );
}
