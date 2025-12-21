import React, { useEffect, useState } from 'react';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryViewer } from './StoryViewer';
import { AddStoryDialog } from './AddStoryDialog';
import { NewChatSheet } from './NewChatSheet';
import { useChatConversations } from '@/hooks/useChatConversations';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatsListProps {
  userId: string;
}

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export function ChatsList({ userId }: ChatsListProps) {
  const navigate = useNavigate();
  const { conversations, isLoading, refresh } = useChatConversations(userId);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showNewChatSheet, setShowNewChatSheet] = useState(false);

  useEffect(() => {
    loadStories();
    loadCurrentUser();
  }, [userId]);

  const handleStartNewChat = async (contactUserId: string) => {
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (existingConv) {
      for (const conv of existingConv) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', contactUserId)
          .single();

        if (otherParticipant) {
          navigate(`/chat/${conv.conversation_id}`);
          return;
        }
      }
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ created_by: userId })
      .select()
      .single();

    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: userId },
        { conversation_id: newConv.id, user_id: contactUserId }
      ]);
      navigate(`/chat/${newConv.id}`);
    }
  };

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

  return (
    <div className="h-full safe-area-inset" style={{ background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 30%, hsl(var(--background)) 30%)' }}>
      {/* Header with safe area */}
      <div className="px-4 pt-safe pb-6">
        <div className="flex items-center justify-between mb-6 pt-4">
          <h1 className="text-3xl font-bold text-primary-foreground">CHATR</h1>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="p-2 rounded-full hover:bg-white/10">
              <RefreshCw className="w-5 h-5 text-primary-foreground" />
            </button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser?.avatar_url} />
              <AvatarFallback className="bg-white/20 text-primary-foreground">
                {currentUser?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Stories Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setShowAddStory(true)}
            className="flex flex-col items-center min-w-[60px]"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-1 ring-2 ring-white">
              <Plus className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground text-xs font-medium">Add</span>
          </button>
          
          {stories.map((story, idx) => (
            <button
              key={story.id}
              onClick={() => {
                setSelectedStoryIndex(idx);
                setShowStoryViewer(true);
              }}
              className="flex flex-col items-center min-w-[60px]"
            >
              <Avatar className="w-14 h-14 ring-2 ring-white mb-1">
                <AvatarImage src={story.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                  {story.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-primary-foreground text-xs font-medium truncate w-full text-center">{story.username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Dialogs */}
      <StoryViewer
        open={showStoryViewer}
        onOpenChange={setShowStoryViewer}
        stories={stories.map(s => ({
          ...s,
          media_url: s.avatar_url || '',
          media_type: 'image' as const,
          created_at: new Date().toISOString(),
          view_count: 0
        }))}
        initialIndex={selectedStoryIndex}
      />

      <AddStoryDialog
        open={showAddStory}
        onOpenChange={setShowAddStory}
        userId={userId}
        onStoryAdded={loadStories}
      />

      {/* Recent Conversations */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-primary-foreground font-semibold text-lg">Recent Chats</h2>
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        </div>
        
        <div className="bg-card/95 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Tap + to start a new chat</p>
            </div>
          ) : (
            conversations.map((chat, idx) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className={`flex items-center gap-3 p-3 ${idx !== conversations.length - 1 ? 'border-b border-border' : ''} active:bg-accent/50 cursor-pointer transition-colors`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={chat.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                      {chat.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {chat.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{chat.name}</span>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">{chat.lastMessageTime}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                </div>
                <div className="flex items-center gap-2">
                  {chat.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {chat.unread_count}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CHATR Updates */}
      <div className="px-4 pb-bottom-safe pb-20">
        <h2 className="font-semibold text-foreground mb-3">CHATR Updates</h2>
        <div className="bg-card rounded-2xl shadow-sm p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold text-xl">
              C
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">CHATR Updates</h3>
              <p className="text-sm text-muted-foreground">New features and announcements</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewChatSheet(true)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-40"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <NewChatSheet
        userId={userId}
        open={showNewChatSheet}
        onOpenChange={setShowNewChatSheet}
        onSelectContact={handleStartNewChat}
      />
    </div>
  );
}
