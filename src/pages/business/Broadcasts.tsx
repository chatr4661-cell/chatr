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
import { ArrowLeft, Plus, Send, MessageSquare, Users, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  status: string;
  recipient_count: number;
  created_at: string;
  sent_at: string | null;
}

export default function BusinessBroadcasts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>('');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        navigate('/business/onboard');
        return;
      }

      setBusinessId(profile.id);

      const { data, error } = await supabase
        .from('business_broadcasts')
        .select('*')
        .eq('business_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error) {
      console.error('Error loading broadcasts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load broadcasts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('business_broadcasts')
        .insert([{
          business_id: businessId,
          title,
          message,
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipient_count: 0
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Broadcast sent successfully'
      });

      setDialogOpen(false);
      setTitle('');
      setMessage('');
      loadBroadcasts();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to send broadcast',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'secondary',
      scheduled: 'default',
      sent: 'default',
      failed: 'destructive'
    };
    return <Badge variant={colors[status as keyof typeof colors] as any}>{status}</Badge>;
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
                <h1 className="text-xl font-bold">Broadcasts</h1>
                <p className="text-sm text-muted-foreground">Send messages to your customers</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  New Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Broadcast</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Broadcast title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Your message to customers..."
                      rows={6}
                    />
                  </div>

                  <div className="p-3 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">
                        Will be sent to all customers who have interacted with your business
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSend} className="flex-1 bg-gradient-hero">
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
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
        {broadcasts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No broadcasts yet</h3>
              <p className="text-muted-foreground mb-4">
                Start engaging with your customers by creating your first broadcast
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-hero">
                <Plus className="h-4 w-4 mr-2" />
                Create Broadcast
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((broadcast) => (
              <Card key={broadcast.id} className="glass-card hover:shadow-glow transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{broadcast.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(broadcast.status)}
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {broadcast.recipient_count} recipients
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(broadcast.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {broadcast.message}
                  </p>
                  {broadcast.sent_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Sent: {new Date(broadcast.sent_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
