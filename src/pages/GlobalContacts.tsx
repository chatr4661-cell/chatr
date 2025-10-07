import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, MessageCircle, Phone, Video, UserPlus } from 'lucide-react';

export default function GlobalContacts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllUsers();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    setUser(profile);
  };

  const loadAllUsers = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('is_online', { ascending: false })
      .order('username');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } else {
      setAllUsers(data || []);
    }
    
    setIsLoading(false);
  };

  const startChat = (contact: any) => {
    navigate(`/chat?contact=${contact.id}`);
  };

  const filteredUsers = allUsers.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">All Users</h1>
          <p className="text-sm text-muted-foreground">Message anyone on Chatr</p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            filteredUsers.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-4 hover:bg-accent/10 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {contact.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.is_online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {contact.username}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.is_online ? (
                      <span className="text-green-500">Online</span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startChat(contact)}
                  className="rounded-full hover:bg-primary/10"
                >
                  <MessageCircle className="h-5 w-5 text-primary" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
