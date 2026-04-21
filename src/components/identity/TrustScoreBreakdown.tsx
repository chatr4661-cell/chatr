import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Phone, Image as ImageIcon, Users, Award, PhoneCall, MessageSquare, Sparkles, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TrustTask {
  id: string;
  label: string;
  description: string;
  points: number;
  icon: React.ReactNode;
  done: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface TrustScoreBreakdownProps {
  userId: string;
  currentScore: number;
  onOpenBadge: () => void;
}

export const TrustScoreBreakdown: React.FC<TrustScoreBreakdownProps> = ({
  userId,
  currentScore,
  onOpenBadge,
}) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TrustTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const [profileRes, contactsRes, callsRes, badgeRes] = await Promise.all([
        supabase.from('profiles').select('phone_number, avatar_url, username, bio').eq('id', userId).maybeSingle(),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('calls').select('id', { count: 'exact', head: true }).eq('caller_id', userId).eq('status', 'completed'),
        supabase.from('user_badges' as any).select('badge_type').eq('user_id', userId).eq('is_active', true).maybeSingle() as any,
      ]);

      const profile = profileRes.data;
      const contactCount = contactsRes.count || 0;
      const callCount = callsRes.count || 0;
      const badge = badgeRes.data;

      setTasks([
        {
          id: 'phone',
          label: 'Verify phone number',
          description: 'Confirm your phone to prove you are a real person',
          points: 20,
          icon: <Phone className="h-4 w-4" />,
          done: !!profile?.phone_number,
          actionLabel: 'Verify',
          action: () => navigate('/auth'),
        },
        {
          id: 'photo',
          label: 'Add a profile photo',
          description: 'Real photos build instant trust',
          points: 10,
          icon: <ImageIcon className="h-4 w-4" />,
          done: !!profile?.avatar_url,
          actionLabel: 'Upload',
          action: () => navigate('/profile'),
        },
        {
          id: 'bio',
          label: 'Complete your bio',
          description: 'Tell people who you are',
          points: 5,
          icon: <Sparkles className="h-4 w-4" />,
          done: !!profile?.bio && profile.bio.length > 10,
          actionLabel: 'Edit',
          action: () => navigate('/profile'),
        },
        {
          id: 'contacts',
          label: 'Sync 5+ contacts',
          description: 'A real network proves real identity',
          points: 10,
          icon: <Users className="h-4 w-4" />,
          done: contactCount >= 5,
          actionLabel: 'Add',
          action: () => navigate('/contacts'),
        },
        {
          id: 'calls',
          label: 'Complete 3 successful calls',
          description: 'Active communicators rank higher',
          points: 15,
          icon: <PhoneCall className="h-4 w-4" />,
          done: callCount >= 3,
          actionLabel: 'Call',
          action: () => navigate('/dialer'),
        },
        {
          id: 'verified',
          label: 'Get the Verified badge',
          description: 'Boost your trust with the blue check',
          points: 20,
          icon: <Award className="h-4 w-4" />,
          done: !!badge?.badge_type,
          actionLabel: 'Get',
          action: onOpenBadge,
        },
        {
          id: 'message',
          label: 'Send your first message',
          description: 'Show you are an active member',
          points: 5,
          icon: <MessageSquare className="h-4 w-4" />,
          done: false, // computed below
          actionLabel: 'Chat',
          action: () => navigate('/chat'),
        },
      ]);

      // Quick check for messages
      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId);
      setTasks((prev) =>
        prev.map((t) => (t.id === 'message' ? { ...t, done: (msgCount || 0) > 0 } : t))
      );
    } finally {
      setLoading(false);
    }
  };

  const earned = tasks.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
  const remaining = tasks.filter((t) => !t.done);
  const possible = tasks.reduce((s, t) => s + t.points, 0);

  if (loading) return null;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm">Boost Your Trust Score</h3>
          </div>
          <Badge variant="outline" className="text-[10px]">
            +{remaining.reduce((s, t) => s + t.points, 0)}% available
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Earned <span className="font-semibold text-foreground">{earned}</span> of {possible} trust points. Complete tasks to unlock priority calling, spam immunity, and faster pickup rates.
        </p>

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                task.done
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-muted/30 border-border hover:bg-muted/50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  task.done
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {task.done ? <CheckCircle2 className="h-4 w-4" /> : task.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                    {task.label}
                  </p>
                  <Badge
                    variant={task.done ? 'secondary' : 'default'}
                    className="text-[10px] flex-shrink-0"
                  >
                    +{task.points}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>
              </div>
              {!task.done && task.action && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs flex-shrink-0"
                  onClick={task.action}
                >
                  {task.actionLabel}
                </Button>
              )}
            </div>
          ))}
        </div>

        {remaining.length === 0 && (
          <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <p className="text-sm font-semibold text-green-600">🎉 Maximum trust achieved!</p>
            <p className="text-xs text-muted-foreground mt-1">You're a fully trusted CHATR member.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
