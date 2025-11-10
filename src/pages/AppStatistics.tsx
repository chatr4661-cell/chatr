import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, TrendingUp, Award, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AppUsageStats {
  app_id: string;
  app_name: string;
  icon_url: string;
  total_duration_seconds: number;
  session_count: number;
  avg_session_seconds: number;
  last_used: string;
}

interface DailyUsage {
  date: string;
  total_hours: number;
}

const AppStatistics = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [appStats, setAppStats] = useState<AppUsageStats[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Calculate date range
    let startDate = new Date(0); // All time
    if (timeRange === 'week') {
      startDate = subDays(new Date(), 7);
    } else if (timeRange === 'month') {
      startDate = subDays(new Date(), 30);
    }

    try {
      // Get app usage stats
      const { data: sessions } = await supabase
        .from('app_usage_sessions' as any)
        .select(`
          app_id,
          duration_seconds,
          session_start,
          session_end,
          mini_apps (
            app_name,
            icon_url
          )
        `)
        .eq('user_id', user.id)
        .gte('session_start', startDate.toISOString())
        .not('session_end', 'is', null) as any;

      if (sessions) {
        // Aggregate stats by app
        const statsMap = new Map<string, AppUsageStats>();
        
        sessions.forEach((session: any) => {
          const appId = session.app_id;
          const appName = session.mini_apps?.app_name || 'Unknown App';
          const iconUrl = session.mini_apps?.icon_url || '';
          const duration = session.duration_seconds || 0;

          if (statsMap.has(appId)) {
            const existing = statsMap.get(appId)!;
            existing.total_duration_seconds += duration;
            existing.session_count += 1;
            if (new Date(session.session_start) > new Date(existing.last_used)) {
              existing.last_used = session.session_start;
            }
          } else {
            statsMap.set(appId, {
              app_id: appId,
              app_name: appName,
              icon_url: iconUrl,
              total_duration_seconds: duration,
              session_count: 1,
              avg_session_seconds: duration,
              last_used: session.session_start,
            });
          }
        });

        // Calculate averages
        const stats = Array.from(statsMap.values()).map(stat => ({
          ...stat,
          avg_session_seconds: Math.round(stat.total_duration_seconds / stat.session_count),
        }));

        // Sort by total duration
        stats.sort((a, b) => b.total_duration_seconds - a.total_duration_seconds);
        setAppStats(stats);

        // Calculate total time
        const total = stats.reduce((sum, stat) => sum + stat.total_duration_seconds, 0);
        setTotalTime(total);

        // Calculate daily usage for the chart
        const dailyMap = new Map<string, number>();
        sessions.forEach((session: any) => {
          const date = format(new Date(session.session_start), 'MMM dd');
          const duration = session.duration_seconds || 0;
          dailyMap.set(date, (dailyMap.get(date) || 0) + duration);
        });

        const daily = Array.from(dailyMap.entries()).map(([date, seconds]) => ({
          date,
          total_hours: Math.round((seconds / 3600) * 10) / 10,
        }));

        setDailyUsage(daily);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }

    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const pieData = appStats.slice(0, 5).map((stat, index) => ({
    name: stat.app_name,
    value: stat.total_duration_seconds,
    color: COLORS[index % COLORS.length],
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/mini-apps-store')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">App Usage Statistics</h1>
              <p className="text-sm text-muted-foreground">Track your mini-app activity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Time Range Selector */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={timeRange === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={timeRange === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            Last 30 Days
          </Button>
          <Button
            variant={timeRange === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('all')}
          >
            All Time
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{formatDuration(totalTime)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Apps Used</p>
                <p className="text-2xl font-bold">{appStats.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-chart-1/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {appStats.reduce((sum, stat) => sum + stat.session_count, 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bar">Daily Usage</TabsTrigger>
            <TabsTrigger value="pie">App Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="bar" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Daily Usage Trend
              </h3>
              {dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="total_hours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No usage data available
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="pie" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top 5 Apps by Time</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatDuration(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No app data available
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* App List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Used Apps</h3>
          <div className="space-y-3">
            {appStats.length > 0 ? (
              appStats.map((stat, index) => (
                <div
                  key={stat.app_id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                      {stat.icon_url && (stat.icon_url.startsWith('http') || stat.icon_url.startsWith('/')) ? (
                        <img src={stat.icon_url} alt={stat.app_name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <span className="text-2xl">{stat.icon_url || stat.app_name[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{stat.app_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {stat.session_count} session{stat.session_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatDuration(stat.total_duration_seconds)}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatDuration(stat.avg_session_seconds)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No app usage data yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start using mini-apps to see your statistics
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AppStatistics;
