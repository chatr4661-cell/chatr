import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Brain, Heart, Users, BookOpen, TrendingUp } from 'lucide-react';
import { SocialFeed } from '@/components/youth/SocialFeed';
import { ResourceLibrary } from '@/components/youth/ResourceLibrary';
import { motion } from 'framer-motion';

const YouthEngagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('feed');

  const stats = [
    { label: 'Community Members', value: '12.5K', icon: Users, color: 'from-blue-500 to-purple-500' },
    { label: 'Resources Available', value: '850+', icon: BookOpen, color: 'from-green-500 to-teal-500' },
    { label: 'Posts This Week', value: '2.3K', icon: TrendingUp, color: 'from-pink-500 to-rose-500' },
    { label: 'Support Sessions', value: '450', icon: Heart, color: 'from-orange-500 to-red-500' },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="feed" className="gap-2">
              <Users className="w-4 h-4" />
              Community Feed
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <SocialFeed />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResourceLibrary />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default YouthEngagement;
