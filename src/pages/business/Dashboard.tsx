import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, Users, TrendingUp, Clock, 
  Settings, Building2, Plus, ArrowRight 
} from 'lucide-react';

interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  verified: boolean;
}

interface DashboardStats {
  total_conversations: number;
  open_conversations: number;
  team_members: number;
  response_time_avg: number;
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total_conversations: 0,
    open_conversations: 0,
    team_members: 1,
    response_time_avg: 0
  });

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load business profile
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        // No business profile, redirect to onboarding
        navigate('/business/onboard');
        return;
      }

      setBusinessProfile(profile);

      // Load stats
      const [conversationsData, teamData] = await Promise.all([
        supabase
          .from('business_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', profile.id),
        supabase
          .from('business_team_members')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', profile.id)
      ]);

      const openConversations = await supabase
        .from('business_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', profile.id)
        .eq('status', 'open');

      setStats({
        total_conversations: conversationsData.count || 0,
        open_conversations: openConversations.count || 0,
        team_members: teamData.count || 1,
        response_time_avg: 0 // TODO: Calculate from messages
      });

    } catch (error) {
      console.error('Error loading business data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business dashboard',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={businessProfile?.logo_url || ''} />
                <AvatarFallback>
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {businessProfile?.business_name}
                  {businessProfile?.verified && (
                    <Badge variant="default" className="text-xs">Verified</Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground capitalize">
                  {businessProfile?.business_type}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/business/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/business/inbox')}
            className="h-auto p-4 flex flex-col items-start gap-2"
            variant="outline"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-semibold">View Inbox</span>
            <span className="text-xs text-muted-foreground">
              {stats.open_conversations} open conversations
            </span>
          </Button>

          <Button
            onClick={() => navigate('/business/team')}
            className="h-auto p-4 flex flex-col items-start gap-2"
            variant="outline"
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold">Team</span>
            <span className="text-xs text-muted-foreground">
              {stats.team_members} members
            </span>
          </Button>

          <Button
            onClick={() => navigate('/business/analytics')}
            className="h-auto p-4 flex flex-col items-start gap-2"
            variant="outline"
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold">Analytics</span>
            <span className="text-xs text-muted-foreground">
              View insights
            </span>
          </Button>

          <Button
            onClick={() => toast({ title: 'Coming soon!' })}
            className="h-auto p-4 flex flex-col items-start gap-2"
            variant="outline"
          >
            <Plus className="h-5 w-5 text-primary" />
            <span className="font-semibold">Install Apps</span>
            <span className="text-xs text-muted-foreground">
              Explore B2B apps
            </span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_conversations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.open_conversations} currently open
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.team_members}</div>
              <p className="text-xs text-muted-foreground">
                Active members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.response_time_avg > 0 ? `${stats.response_time_avg}m` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+0%</div>
              <p className="text-xs text-muted-foreground">
                vs last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Customer conversations will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
