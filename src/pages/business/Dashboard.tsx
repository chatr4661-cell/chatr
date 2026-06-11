import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, Users, TrendingUp, Clock, 
  Settings, Building2, ArrowRight, Send, UserPlus, DollarSign, Target
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
  growth_pct: number;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
  icon: typeof Users;
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
    response_time_avg: 0,
    growth_pct: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);

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
        navigate('/business/onboard');
        return;
      }

      setBusinessProfile(profile);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      // Load stats in parallel
      const [
        conversationsData,
        openConversations,
        teamData,
        recentConversations,
        recentLeads,
        thisMonthLeads,
        prevMonthLeads,
      ] = await Promise.all([
        supabase.from('business_conversations').select('*', { count: 'exact', head: true }).eq('business_id', profile.id),
        supabase.from('business_conversations').select('*', { count: 'exact', head: true }).eq('business_id', profile.id).eq('status', 'open'),
        supabase.from('business_team_members').select('*', { count: 'exact', head: true }).eq('business_id', profile.id),
        supabase.from('business_conversations').select('created_at, last_message_at, status').eq('business_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('crm_leads').select('id, name, status, deal_value, created_at, updated_at').eq('business_id', profile.id).order('updated_at', { ascending: false }).limit(8),
        supabase.from('crm_leads').select('*', { count: 'exact', head: true }).eq('business_id', profile.id).gte('created_at', monthStart),
        supabase.from('crm_leads').select('*', { count: 'exact', head: true }).eq('business_id', profile.id).gte('created_at', prevMonthStart).lt('created_at', monthStart),
      ]);

      // Average response time (mins) from conversations that have a first response
      const convs = recentConversations.data || [];
      const responseTimes = convs
        .filter((c) => c.last_message_at && c.created_at)
        .map((c) => (new Date(c.last_message_at!).getTime() - new Date(c.created_at!).getTime()) / 60000)
        .filter((m) => m >= 0 && m < 60 * 48);
      const avgResponse = responseTimes.length
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      // Growth: this month vs last month leads
      const thisCount = thisMonthLeads.count || 0;
      const prevCount = prevMonthLeads.count || 0;
      const growth = prevCount > 0
        ? Math.round(((thisCount - prevCount) / prevCount) * 100)
        : thisCount > 0 ? 100 : 0;

      setStats({
        total_conversations: conversationsData.count || 0,
        open_conversations: openConversations.count || 0,
        team_members: teamData.count || 1,
        response_time_avg: avgResponse,
        growth_pct: growth,
      });

      // Build real recent activity from leads
      const leadActivity: ActivityItem[] = (recentLeads.data || []).map((lead) => {
        const won = lead.status === 'won';
        return {
          id: lead.id,
          user: lead.name,
          action: won
            ? `Deal closed${lead.deal_value ? ` - ₹${Number(lead.deal_value).toLocaleString()}` : ''}`
            : `Lead ${lead.status || 'updated'}`,
          time: formatDistanceToNow(new Date(lead.updated_at || lead.created_at || now), { addSuffix: true }),
          icon: won ? TrendingUp : lead.status === 'new' ? UserPlus : Users,
        };
      });
      setActivity(leadActivity);
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
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">CRM</span>
              <p className="text-xs text-muted-foreground mt-1">
                Leads & pipeline
              </p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/business/broadcasts')}
            className="h-auto p-6 flex flex-col items-start gap-3 glass-card hover:shadow-glow transition-all group relative overflow-hidden"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">Broadcasts</span>
              <p className="text-xs text-muted-foreground mt-1">
                Send messages
              </p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/business/groups')}
            className="h-auto p-6 flex flex-col items-start gap-3 glass-card hover:shadow-glow transition-all group relative overflow-hidden"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left relative z-10">
              <span className="font-semibold text-base">Groups</span>
              <p className="text-xs text-muted-foreground mt-1">
                Customer communities
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
                Recent conversations
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
                {stats.growth_pct >= 0 ? '+' : ''}{stats.growth_pct}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                New leads vs last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity from real CRM data */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.user}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => navigate('/business/crm')}
                >
                  View CRM
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Customer conversations and leads will appear here</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/business/crm')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add your first lead
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
