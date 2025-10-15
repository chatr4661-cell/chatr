import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Video, Calendar, Clock, Users, CheckCircle2, Play, Star } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Session {
  id: string;
  session_title: string;
  description: string;
  expert_name: string;
  expert_title: string;
  session_date: string;
  duration_minutes: number;
  max_participants: number;
  participant_count: number;
  is_live: boolean;
  recording_url: string | null;
}

export default function ExpertSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    loadSessions();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('expert_sessions')
        .select('*')
        .gte('session_date', new Date().toISOString())
        .order('session_date', { ascending: true });

      if (error) throw error;
      setSessions((data || []) as Session[]);
    } catch (error: any) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const registerForSession = async (session: Session) => {
    if (!currentUser) {
      toast.error('Please sign in to register');
      return;
    }

    if (session.participant_count >= session.max_participants) {
      toast.error('Session is full');
      return;
    }

    try {
      const { data: existing } = await (supabase as any)
        .from('session_attendees')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existing) {
        toast.info('You are already registered');
        return;
      }

      const { error } = await (supabase as any)
        .from('session_attendees')
        .insert({
          session_id: session.id,
          user_id: currentUser.id,
          registered_at: new Date().toISOString()
        });

      if (error) throw error;

      await (supabase as any)
        .from('expert_sessions')
        .update({ participant_count: session.participant_count + 1 })
        .eq('id', session.id);

      toast.success('Successfully registered!');
      setSelectedSession(null);
      loadSessions();
    } catch (error: any) {
      toast.error('Failed to register');
    }
  };

  const joinSession = (session: Session) => {
    if (!session.recording_url) {
      toast.error('Meeting link not available');
      return;
    }
    window.open(session.recording_url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Expert Live Sessions</h1>
              <p className="text-purple-100">Learn from health & wellness experts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Live Sessions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.filter(s => s.is_live).map((session) => (
              <Card key={session.id} className="border-red-200 bg-gradient-to-br from-red-50 to-pink-50">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-red-500">LIVE</Badge>
                  </div>
                  <CardTitle className="text-lg">{session.session_title}</CardTitle>
                  <CardDescription>{session.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarFallback>{session.expert_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{session.expert_name}</p>
                      <p className="text-xs text-muted-foreground">{session.expert_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.participant_count}/{session.max_participants}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {session.duration_minutes}min
                      </div>
                    </div>
                    <Button onClick={() => joinSession(session)} className="bg-red-500">
                      <Play className="w-4 h-4 mr-2" />
                      Join Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {sessions.filter(s => s.is_live).length === 0 && (
            <Card className="p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No live sessions at the moment</p>
            </Card>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Upcoming Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.filter(s => !s.is_live).map((session) => (
              <Card 
                key={session.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedSession(session)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    {session.participant_count >= session.max_participants && (
                      <Badge variant="destructive">Full</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{session.session_title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{session.expert_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{session.expert_name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs text-muted-foreground">{session.expert_title}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(session.session_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(new Date(session.session_date), 'hh:mm a')} ({session.duration_minutes}min)
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {session.participant_count}/{session.max_participants} registered
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSession?.session_title}</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback>{selectedSession.expert_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{selectedSession.expert_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSession.expert_title}</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSession.session_date), 'EEEE, MMMM dd, yyyy • hh:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{selectedSession.duration_minutes} minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Attendees</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.participant_count} / {selectedSession.max_participants} registered
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">About this session</h4>
                <p className="text-sm text-muted-foreground">{selectedSession.description}</p>
              </div>

              <Button 
                onClick={() => registerForSession(selectedSession)} 
                className="w-full"
                disabled={selectedSession.participant_count >= selectedSession.max_participants}
              >
                {selectedSession.participant_count >= selectedSession.max_participants ? (
                  'Session Full'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Register for Session
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}