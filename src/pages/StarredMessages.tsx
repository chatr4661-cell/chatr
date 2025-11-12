import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Search, MessageCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StarredMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  starred_at: string;
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    message_type?: string;
    media_url?: string;
  };
  conversation?: {
    id: string;
    is_group: boolean;
    group_name?: string;
  };
  sender?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export default function StarredMessages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [starredMessages, setStarredMessages] = useState<StarredMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'text' | 'media'>('all');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadStarredMessages();
  }, []);

  const loadStarredMessages = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('starred_messages')
        .select(`
          *,
          message:messages(
            id,
            content,
            sender_id,
            created_at,
            message_type,
            media_url
          )
        `)
        .eq('user_id', user.id)
        .order('starred_at', { ascending: false });

      if (error) throw error;

      // Fetch conversation and sender details
      const enrichedMessages = await Promise.all(
        (data || []).map(async (starred) => {
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, is_group, group_name')
            .eq('id', starred.conversation_id)
            .single();

          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', (starred.message as any).sender_id)
            .single();

          return {
            ...starred,
            conversation,
            sender,
          } as StarredMessage;
        })
      );

      setStarredMessages(enrichedMessages);
    } catch (error) {
      console.error('Error loading starred messages:', error);
      toast.error('Failed to load starred messages');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('starred_messages')
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId);

      if (error) throw error;

      setStarredMessages(prev => prev.filter(m => m.message_id !== messageId));
      toast.success('Message unstarred');
    } catch (error) {
      console.error('Error unstarring message:', error);
      toast.error('Failed to unstar message');
    }
  };

  const handleMessageClick = (conversationId: string, messageId: string) => {
    navigate('/chat', { 
      state: { 
        conversationId, 
        highlightMessageId: messageId 
      } 
    });
  };

  const filteredMessages = starredMessages
    .filter(starred => {
      const message = starred.message;
      const matchesSearch = message.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        filter === 'all' ||
        (filter === 'text' && (!message.message_type || message.message_type === 'text')) ||
        (filter === 'media' && (message.message_type === 'image' || message.message_type === 'video'));
      
      return matchesSearch && matchesFilter;
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 backdrop-blur-sm bg-card/95">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => navigate('/chat')}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <h1 className="text-lg font-semibold">Starred Messages</h1>
          </div>
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="sticky top-[57px] z-10 bg-background border-b px-4 py-3">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search starred messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Messages List */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No starred messages</h2>
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'No messages match your search'
                : 'Star important messages to find them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMessages.map((starred) => (
              <div
                key={starred.id}
                onClick={() => handleMessageClick(starred.conversation_id, starred.message_id)}
                className="bg-card rounded-lg p-4 border hover:bg-accent/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={starred.sender?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/20 text-primary">
                      {starred.sender?.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">
                        {starred.sender?.username || 'Unknown'}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(starred.message.created_at), 'MMM dd, yyyy • HH:mm')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                      {starred.message.content}
                    </p>
                    
                    {starred.message.media_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                        <MessageCircle className="h-3 w-3" />
                        Media message
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {starred.conversation?.is_group 
                        ? starred.conversation.group_name 
                        : 'Direct Message'}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnstar(starred.message_id);
                    }}
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
