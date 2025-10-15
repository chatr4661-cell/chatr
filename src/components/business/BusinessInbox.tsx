import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Filter, MoreVertical, MessageSquare, 
  User, Clock, Tag, CheckCircle2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BusinessConversation {
  id: string;
  customer_id: string;
  status: string;
  priority: string;
  tags: string[];
  last_message_at: string;
  customer: {
    username: string;
    avatar_url: string | null;
  };
  conversation: {
    id: string;
  };
}

interface BusinessInboxProps {
  businessId: string;
}

export function BusinessInbox({ businessId }: BusinessInboxProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<BusinessConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<BusinessConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
  }, [businessId]);

  useEffect(() => {
    filterConversations();
  }, [conversations, filter, searchQuery]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('business_conversations')
        .select(`
          *,
          customer:profiles!customer_id(username, avatar_url),
          conversation:conversations(id)
        `)
        .eq('business_id', businessId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('business-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_conversations',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterConversations = () => {
    let filtered = conversations;

    if (filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter);
    }

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.customer?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredConversations(filtered);
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('business_conversations')
        .update({ status })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Conversation marked as ${status}`
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation',
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            {filteredConversations.length} conversations
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status Tabs */}
      <Tabs value={filter} onValueChange={(value: any) => setFilter(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Conversations List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {filteredConversations.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No conversations found</p>
            </Card>
          ) : (
            filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={conversation.customer?.avatar_url || ''} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">
                        {conversation.customer?.username || 'Unknown User'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(conversation.priority)} className="text-xs">
                          {conversation.priority}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                    </div>

                    {conversation.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-2">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {conversation.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => updateConversationStatus(conversation.id, 'closed')}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Close
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                      >
                        View Chat
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
