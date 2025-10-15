import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Users, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CommunityGroup {
  id: string;
  group_name: string;
  community_description: string | null;
  member_count: number;
  created_at: string;
}

export default function BusinessGroups() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('is_community', true)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!groupName) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          group_name: groupName,
          community_description: description,
          is_group: true,
          is_community: true,
          created_by: user.id,
          member_count: 1
        }])
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from('conversation_participants')
        .insert([{
          conversation_id: data.id,
          user_id: user.id,
          role: 'admin'
        }]);

      toast({
        title: 'Success',
        description: 'Group created successfully'
      });

      setDialogOpen(false);
      setGroupName('');
      setDescription('');
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 border-b glass-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/business')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Business Groups</h1>
                <p className="text-sm text-muted-foreground">Create and manage customer communities</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Business Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Group Name *</Label>
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., VIP Customers, Product Updates"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this group about?"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreate} className="flex-1 bg-gradient-hero">
                      <Users className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {groups.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create groups to engage with your customers and build communities
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-hero">
                <Plus className="h-4 w-4 mr-2" />
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="glass-card hover:shadow-glow transition-all cursor-pointer"
                onClick={() => navigate(`/chat/${group.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {group.group_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {group.community_description || 'No description'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {group.member_count || 0} members
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
