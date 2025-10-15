import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Users, Plus, Send, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Circle {
  id: string;
  name: string;
  description: string | null;
  focus_area: string | null;
  member_count: number;
  is_private: boolean;
  created_by: string;
}

interface CircleMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function WellnessCircles() {
  const navigate = useNavigate();
  const { circleId } = useParams();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCircle, setNewCircle] = useState({ name: '', description: '', focus_area: '' });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    loadCircles();
  }, []);

  useEffect(() => {
    if (circleId) {
      loadCircleMessages(circleId);
    }
  }, [circleId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadCircles = async () => {
    try {
      const { data, error } = await supabase
        .from('wellness_circles')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) throw error;
      setCircles((data || []) as Circle[]);
    } catch (error: any) {
      toast.error('Failed to load wellness circles');
    }
  };

  const loadCircleMessages = async (id: string) => {
    try {
      const { data: circle } = await supabase
        .from('wellness_circles')
        .select('*')
        .eq('id', id)
        .single();

      setSelectedCircle(circle as Circle);

      const { data: msgs, error } = await supabase
        .from('circle_messages')
        .select('*, profiles!inner(username, avatar_url)')
        .eq('circle_id', id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages((msgs || []) as CircleMessage[]);

      // Subscribe to new messages
      const channel = supabase
        .channel(`circle:${id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'circle_messages',
          filter: `circle_id=eq.${id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as any]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      toast.error('Failed to load messages');
    }
  };

  const createCircle = async () => {
    if (!newCircle.name || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('wellness_circles')
        .insert({
          name: newCircle.name,
          description: newCircle.description,
          focus_area: newCircle.focus_area,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      // Join as member
      await supabase.from('wellness_circle_members').insert({
        circle_id: data.id,
        user_id: currentUser.id,
        role: 'admin'
      } as any);

      toast.success('Wellness circle created!');
      setShowCreateDialog(false);
      setNewCircle({ name: '', description: '', focus_area: '' });
      loadCircles();
    } catch (error: any) {
      toast.error('Failed to create circle');
    }
  };

  const joinCircle = async (circle: Circle) => {
    if (!currentUser) return;

    try {
      const { data: existing } = await supabase
        .from('wellness_circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existing) {
        navigate(`/wellness-circles/${circle.id}`);
        return;
      }

      await supabase.from('wellness_circle_members').insert({
        circle_id: circle.id,
        user_id: currentUser.id,
        role: 'member'
      } as any);

      await supabase
        .from('wellness_circles')
        .update({ member_count: circle.member_count + 1 })
        .eq('id', circle.id);

      toast.success('Joined wellness circle!');
      navigate(`/wellness-circles/${circle.id}`);
    } catch (error: any) {
      toast.error('Failed to join circle');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCircle || !currentUser) return;

    try {
      const { error } = await supabase
        .from('circle_messages')
        .insert({
          circle_id: selectedCircle.id,
          sender_id: currentUser.id,
          content: newMessage
        } as any);

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  if (circleId && selectedCircle) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/wellness-circles')}
                className="text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{selectedCircle.name}</h1>
                <p className="text-sm text-teal-100">{selectedCircle.description}</p>
              </div>
              <Badge variant="secondary">{selectedCircle.member_count} members</Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={msg.profiles.avatar_url} />
                <AvatarFallback>{msg.profiles.username[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{msg.profiles.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm bg-muted p-3 rounded-lg">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 max-w-4xl mx-auto w-full">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Share your thoughts..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Wellness Circles</h1>
                <p className="text-teal-100">Support groups for mental wellness</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-white text-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Circle
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map((circle) => (
            <Card key={circle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
                    <Heart className="w-6 h-6 text-teal-600" />
                  </div>
                  <Badge variant="outline">{circle.focus_area}</Badge>
                </div>
                <CardTitle className="text-lg">{circle.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {circle.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{circle.member_count} members</span>
                  </div>
                  <Button size="sm" onClick={() => joinCircle(circle)}>
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Wellness Circle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Circle Name</label>
              <Input
                value={newCircle.name}
                onChange={(e) => setNewCircle({ ...newCircle, name: e.target.value })}
                placeholder="e.g., Anxiety Support Group"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newCircle.description}
                onChange={(e) => setNewCircle({ ...newCircle, description: e.target.value })}
                placeholder="What is this circle about?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Focus Area</label>
              <Input
                value={newCircle.focus_area}
                onChange={(e) => setNewCircle({ ...newCircle, focus_area: e.target.value })}
                placeholder="e.g., Mental Health, Fitness, Meditation"
              />
            </div>
            <Button onClick={createCircle} className="w-full" disabled={!newCircle.name}>
              Create Circle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}