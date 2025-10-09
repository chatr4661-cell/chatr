import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Brain, Heart, Users, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const YouthEngagement = () => {
  const navigate = useNavigate();

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
      features: ['Mood tracking', 'Anonymous posting', 'Real-time updates', 'Community engagement']
    },
    {
      title: 'Resource Library',
      description: 'Access 850+ professional mental health resources',
      icon: BookOpen,
      features: ['Expert articles', 'Video guides', 'Self-help tools', 'Professional content']
    },
    {
      title: 'Community Support',
      description: 'Connect with others on similar wellness journeys',
      icon: Heart,
      features: ['Peer support', 'Discussion threads', 'Shared experiences', 'Safe space']
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
        {/* Migration Notice */}
        <Alert className="bg-gradient-card backdrop-blur-glass border-glass-border border-2 border-primary/20">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-bold">🎉 Mental Health Platform Ready!</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-foreground">
              Please approve the database migration above to activate the complete Mental Health Hub with:
            </p>
            <div className="grid md:grid-cols-2 gap-2 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Real-time social feed with mood tracking</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>850+ educational resources</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Anonymous posting support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Professional mental health content</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Community engagement tools</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Secure with Row-Level Security</span>
              </div>
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
                    {feature.features.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-glass border-glass-border">
          <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your Mental Health Journey Starts Here
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Approve the migration to unlock a complete platform for mental wellness, community support, and professional resources.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="shadow-glow">
              Approve Migration
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default YouthEngagement;
