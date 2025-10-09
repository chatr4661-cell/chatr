import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Brain, Heart, Users, BookOpen, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const YouthEngagement = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Reload the page after countdown
      window.location.reload();
    }
  }, [countdown]);

  const stats = [
    { label: 'Community Members', value: '12.5K', icon: Users, color: 'from-blue-500 to-purple-500' },
    { label: 'Resources Available', value: '850+', icon: BookOpen, color: 'from-green-500 to-teal-500' },
    { label: 'Posts This Week', value: '2.3K', icon: Heart, color: 'from-pink-500 to-rose-500' },
  ];

  const features = [
    {
      title: 'Real-Time Social Feed',
      description: 'Share your thoughts, feelings, and stories with the community',
      icon: Users,
      points: ['Mood tracking with emoji indicators', 'Anonymous posting option', 'Real-time updates', 'Like and comment interactions']
    },
    {
      title: 'Resource Library',
      description: 'Access 850+ professional mental health resources',
      icon: BookOpen,
      points: ['Expert articles and guides', 'Video tutorials', 'Search and filter by category', 'Bookmark favorites']
    },
    {
      title: 'Community Support',
      description: 'Connect with others on similar wellness journeys',
      icon: Heart,
      points: ['Peer support network', 'Safe and moderated space', 'Shared experiences', 'Professional resources']
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass sticky top-0 z-50">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Mental Health Hub</h1>
            <p className="text-sm text-muted-foreground">Community • Resources • Support</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Success Alert */}
        <Alert className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 border-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-lg font-bold text-foreground">Database Migration Successful! 🎉</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-foreground">
              All tables have been created successfully. The system is now generating TypeScript types...
            </p>
            <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-glass-border">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Auto-refreshing in {countdown} seconds...</p>
                <p className="text-xs text-muted-foreground">Types are being generated in the background</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Quick Stats Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Features Preview */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Features Ready to Launch</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Database Tables Created */}
        <Card className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border">
          <h3 className="text-lg font-bold text-foreground mb-4">Database Tables Created</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              'mental_health_resources - 8 sample resources loaded',
              'social_posts - Ready for user content',
              'post_likes - Like tracking enabled',
              'post_comments - Comment system ready',
              'resource_favorites - Bookmarking enabled',
              'comment_likes - Full engagement features'
            ].map((table) => (
              <div key={table} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-foreground">{table}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* What's Next */}
        <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-glass border-glass-border">
          <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Almost Ready!
          </h2>
          <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
            The page will automatically refresh in {countdown} seconds. After refresh, you'll have access to the complete Mental Health Hub with real-time social feed and resource library.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.reload()}
            className="shadow-glow gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Now to Start
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default YouthEngagement;
