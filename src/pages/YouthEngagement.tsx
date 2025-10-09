import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Brain, Heart, Users, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SocialFeed from '@/components/youth/SocialFeed';
import ResourceLibrary from '@/components/youth/ResourceLibrary';

const YouthEngagement = () => {
  const navigate = useNavigate();

  const stats = [
    { label: 'Community Members', value: '12.5K', icon: Users, color: 'from-blue-500 to-purple-500' },
    { label: 'Resources Available', value: '850+', icon: BookOpen, color: 'from-green-500 to-teal-500' },
    { label: 'Posts This Week', value: '2.3K', icon: Heart, color: 'from-pink-500 to-rose-500' },
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
        {/* Quick Stats */}
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-glass-border">
            <TabsTrigger value="feed" className="gap-2">
              <Users className="w-4 h-4" />
              Community Feed
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Resource Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            <SocialFeed />
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <ResourceLibrary />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default YouthEngagement;
