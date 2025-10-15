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
  const [showDemoData, setShowDemoData] = useState(false);

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

      const totalConvs = conversationsData.count || 0;
      const openConvs = openConversations.count || 0;
      
      // Show demo data if no real data exists
      if (totalConvs === 0) {
        setShowDemoData(true);
        setStats({
          total_conversations: 24,
          open_conversations: 8,
          team_members: teamData.count || 1,
          response_time_avg: 12
        });
      } else {
        setStats({
          total_conversations: totalConvs,
          open_conversations: openConvs,
          team_members: teamData.count || 1,
          response_time_avg: 0
        });
      }

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
      {/* Header with gradient */}
      <div className="border-b glass-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="max-w-7xl mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 animate-fade-in">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-20 rounded-full transition-opacity blur-lg" />
                <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-glow">
                  <AvatarImage src={businessProfile?.logo_url || ''} />
                  <AvatarFallback className="bg-gradient-hero">
                    <Building2 className="h-7 w-7 text-white" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  {businessProfile?.business_name}
                  {businessProfile?.verified && (
                    <Badge variant="default" className="text-xs bg-gradient-hero animate-fade-in">Verified</Badge>
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
              className="hover:shadow-glow transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {showDemoData && (
          <div className="glass-card p-4 animate-fade-in border-l-4 border-accent">
            <p className="text-sm text-muted-foreground">
              <strong className="text-accent">Demo Mode:</strong> Showing sample data. Start using the CRM to see your real data here.
            </p>
          </div>
        )}
        {/* Quick Actions with gradients */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <Button
            onClick={() => navigate('/business/inbox')}
            className="h-auto p-6 flex flex-col items-start gap-3 glass-card hover:shadow-glow transition-all group relative overflow-hidden"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">Inbox</span>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.open_conversations} open
              </p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/business/crm')}
            className="h-auto p-6 flex flex-col items-start gap-3 glass-card hover:shadow-glow transition-all group relative overflow-hidden"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">CRM</span>
              <p className="text-xs text-muted-foreground mt-1">
                Manage leads
              </p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/business/analytics')}
            className="h-auto p-6 flex flex-col items-start gap-3 glass-card hover:shadow-glow transition-all group relative overflow-hidden"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">Analytics</span>
              <p className="text-xs text-muted-foreground mt-1">
                View insights
              </p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/business/team')}
            className="h-auto p-6 flex flex-col items-start gap-3 glass-card hover:shadow-glow transition-all group relative overflow-hidden"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">Team</span>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.team_members} member{stats.team_members !== 1 ? 's' : ''}
              </p>
            </div>
          </Button>
        </div>

        {/* Stats Cards with animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {stats.total_conversations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.open_conversations} currently open
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {stats.team_members}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active members
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {stats.response_time_avg > 0 ? `${stats.response_time_avg}m` : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {showDemoData ? '+18%' : '+0%'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity with demo data */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              {showDemoData && <Badge variant="outline" className="text-xs">Demo</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {showDemoData ? (
              <div className="space-y-4">
                {[
                  { user: 'Sarah Johnson', action: 'New lead created', time: '5 minutes ago', icon: Users },
                  { user: 'Mike Chen', action: 'Message received', time: '12 minutes ago', icon: MessageSquare },
                  { user: 'Emma Davis', action: 'Deal closed - ₹45,000', time: '1 hour ago', icon: TrendingUp },
                  { user: 'John Smith', action: 'Follow-up scheduled', time: '2 hours ago', icon: Clock }
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => navigate('/business/inbox')}
                >
                  View All Activity
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Customer conversations will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
