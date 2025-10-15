import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, Users, MessageSquare, Clock, 
  ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';

export default function BusinessAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Demo data
  const stats = {
    totalRevenue: 125000,
    revenueGrowth: 23,
    totalLeads: 48,
    leadsGrowth: 15,
    conversionRate: 34,
    conversionGrowth: 8,
    avgResponseTime: 12,
    responseImprovement: -5
  };

  const monthlyData = [
    { month: 'Jan', revenue: 15000, leads: 8 },
    { month: 'Feb', revenue: 18000, leads: 12 },
    { month: 'Mar', revenue: 22000, leads: 15 },
    { month: 'Apr', revenue: 25000, leads: 18 },
    { month: 'May', revenue: 28000, leads: 22 },
    { month: 'Jun', revenue: 32000, leads: 28 }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b glass-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="max-w-7xl mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="text-muted-foreground mt-1">Track your business performance</p>
            </div>
            <Badge variant="outline" className="animate-fade-in">Demo Data</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="animate-fade-in">
          <TabsList className="glass-card">
            <TabsTrigger value="7d">Last 7 days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 days</TabsTrigger>
            <TabsTrigger value="90d">Last 90 days</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                ₹{stats.totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500 font-medium">+{stats.revenueGrowth}%</span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {stats.totalLeads}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500 font-medium">+{stats.leadsGrowth}%</span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {stats.conversionRate}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500 font-medium">+{stats.conversionGrowth}%</span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Clock className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {stats.avgResponseTime}m
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowDownRight className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500 font-medium">{stats.responseImprovement}m</span>
                <span className="text-xs text-muted-foreground">improvement</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.map((data, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-12">{data.month}</span>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-hero transition-all duration-500"
                        style={{ 
                          width: `${(data.revenue / 32000) * 100}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-20 text-right">
                      ₹{(data.revenue / 1000).toFixed(0)}k
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle>Lead Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.map((data, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-12">{data.month}</span>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
                        style={{ 
                          width: `${(data.leads / 28) * 100}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-20 text-right">
                      {data.leads} leads
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle>Top Performing Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { source: 'Website Chat', leads: 18, conversion: 42, revenue: 45000 },
                { source: 'Social Media', leads: 12, conversion: 35, revenue: 32000 },
                { source: 'Referrals', leads: 10, conversion: 55, revenue: 28000 },
                { source: 'Direct', leads: 8, conversion: 28, revenue: 20000 }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{item.source}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.leads} leads • {item.conversion}% conversion
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{(item.revenue / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
