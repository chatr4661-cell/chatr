/**
 * AI AGENTS HUB - The Gamechanger
 * A complete AI ecosystem: Digital Twins, Business Autopilot, AI Characters, Marketplace
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Bot,
  Plus,
  Search,
  Sparkles,
  Users,
  Store,
  Brain,
  Zap,
  MessageSquare,
  Mic,
  ArrowLeft,
  Star,
  TrendingUp,
  Clock,
  ChevronRight,
  Shield,
  Heart,
  Briefcase,
  Stethoscope,
  MapPin,
  Crown,
  Flame,
  Eye,
  Download,
  Play,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

// Agent categories for marketplace
const AGENT_CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'personal', label: 'Personal', icon: Heart },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'health', label: 'Health', icon: Stethoscope },
  { id: 'local', label: 'Local', icon: MapPin },
  { id: 'fun', label: 'Fun', icon: Star },
];

// Featured/trending agents (mock data - replace with DB)
const FEATURED_AGENTS = [
  {
    id: 'luna',
    name: 'Luna',
    tagline: 'Your empathetic AI friend',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna',
    category: 'fun',
    creator: 'CHATR',
    rating: 4.9,
    conversations: 125000,
    isOfficial: true,
    personality: 'Warm, understanding, always there to listen',
  },
  {
    id: 'dr-health',
    name: 'Dr. Health',
    tagline: 'AI health advisor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doctor',
    category: 'health',
    creator: 'CHATR',
    rating: 4.8,
    conversations: 89000,
    isOfficial: true,
    personality: 'Professional, caring, evidence-based',
  },
  {
    id: 'biz-assistant',
    name: 'Business Pro',
    tagline: 'Your 24/7 business assistant',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=business',
    category: 'business',
    creator: 'CHATR',
    rating: 4.7,
    conversations: 56000,
    isOfficial: true,
    personality: 'Professional, efficient, goal-oriented',
  },
];

interface UserAgent {
  id: string;
  agent_name: string;
  agent_avatar_url: string | null;
  agent_description: string | null;
  agent_personality: string;
  agent_purpose: string;
  is_active: boolean;
  auto_reply_enabled: boolean;
  total_conversations: number;
  total_messages: number;
  created_at: string;
}

export default function AIAgentsHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [myAgents, setMyAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoReplyGlobal, setAutoReplyGlobal] = useState(false);

  useEffect(() => {
    loadMyAgents();
  }, []);

  const loadMyAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('ai_agents' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyAgents((data as any) || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">AI Agents</h1>
                  <p className="text-xs text-muted-foreground">Your AI workforce</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/ai-agents/create')}
              className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Agent</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents, skills, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/50"
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto px-4">
        <TabsList className="grid grid-cols-4 h-12 mb-4 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="my-agents" className="gap-2 rounded-lg data-[state=active]:bg-background">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">My Agents</span>
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2 rounded-lg data-[state=active]:bg-background">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2 rounded-lg data-[state=active]:bg-background">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger value="brain" className="gap-2 rounded-lg data-[state=active]:bg-background">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI Brain</span>
          </TabsTrigger>
        </TabsList>

        {/* My Agents Tab */}
        <TabsContent value="my-agents" className="space-y-4">
          {/* Global Auto-Reply Toggle */}
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">AI Auto-Reply</p>
                  <p className="text-xs text-muted-foreground">Let AI handle your messages when you're away</p>
                </div>
              </div>
              <Switch 
                checked={autoReplyGlobal} 
                onCheckedChange={setAutoReplyGlobal}
                className="data-[state=checked]:bg-primary"
              />
            </CardContent>
          </Card>

          {/* Quick Create Options */}
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-2 border-dashed"
              onClick={() => navigate('/ai-agents/create?type=clone')}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold text-sm">Create AI Clone</p>
                <p className="text-xs text-muted-foreground">Your digital twin</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-2 border-dashed"
              onClick={() => navigate('/ai-agents/create?type=business')}
            >
              <CardContent className="p-4 text-center">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-2">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold text-sm">Business Agent</p>
                <p className="text-xs text-muted-foreground">24/7 support bot</p>
              </CardContent>
            </Card>
          </div>

          {/* My Agents List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Bot className="h-8 w-8 animate-pulse text-primary" />
            </div>
          ) : myAgents.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-1">No agents yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first AI agent</p>
                <Button onClick={() => navigate('/ai-agents/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-all"
                    onClick={() => navigate(`/ai-agents/chat/${agent.id}`)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={agent.agent_avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                            <Bot className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        {agent.is_active && (
                          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{agent.agent_name}</h3>
                          {agent.auto_reply_enabled && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {agent.agent_purpose || agent.agent_description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {formatNumber(agent.total_messages || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatNumber(agent.total_conversations || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ai-agents/settings/${agent.id}`);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          {/* Featured Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Featured Agents
              </h2>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {FEATURED_AGENTS.map((agent) => (
                  <Card 
                    key={agent.id}
                    className="min-w-[280px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/ai-agents/preview/${agent.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                            <Bot className="h-6 w-6 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{agent.name}</h3>
                            {agent.isOfficial && (
                              <Shield className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{agent.tagline}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {agent.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {formatNumber(agent.conversations)}
                        </span>
                        <Button size="sm" className="h-7 text-xs gap-1">
                          <Play className="h-3 w-3" />
                          Try Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Trending Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Trending Now
              </h2>
              <Button variant="ghost" size="sm">See all</Button>
            </div>
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="font-bold text-xl text-muted-foreground w-6">#{i}</div>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=trend${i}`} />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">Study Buddy {i}</h3>
                      <p className="text-xs text-muted-foreground">Helps with homework & learning</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-500 text-xs">
                        <TrendingUp className="h-3 w-3" />
                        +{25 + i * 10}%
                      </div>
                      <p className="text-xs text-muted-foreground">{(50 - i * 10)}k users</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h2 className="font-bold mb-3">Browse Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AGENT_CATEGORIES.slice(1).map((cat) => (
                <Card 
                  key={cat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setActiveTab('marketplace');
                  }}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">12 agents</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          {/* Category Pills */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {AGENT_CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap gap-1"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <cat.icon className="h-3 w-3" />
                  {cat.label}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Agent Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURED_AGENTS.map((agent) => (
              <Card 
                key={agent.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                        <Bot className="h-8 w-8 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{agent.name}</h3>
                        {agent.isOfficial && (
                          <Badge variant="secondary" className="text-xs">Official</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.tagline}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {agent.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {formatNumber(agent.conversations)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2">
                      <Play className="h-4 w-4" />
                      Chat Now
                    </Button>
                    <Button variant="outline" size="icon">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AI Brain Tab */}
        <TabsContent value="brain" className="space-y-4">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
            <CardContent className="p-6 text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-4">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">CHATR AI Brain</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Your unified AI assistant that knows everything about you and routes to the perfect specialized agent
              </p>
              <Button 
                size="lg" 
                className="gap-2 bg-gradient-to-r from-primary to-purple-600"
                onClick={() => navigate('/chat-ai')}
              >
                <Mic className="h-5 w-5" />
                Talk to AI Brain
              </Button>
            </CardContent>
          </Card>

          {/* Specialized Agents */}
          <div>
            <h3 className="font-bold mb-3">Specialized Agents</h3>
            <div className="grid gap-3">
              {[
                { name: 'Personal AI', desc: 'Learns your habits & preferences', icon: Heart, color: 'from-pink-500 to-rose-600' },
                { name: 'Work AI', desc: 'Tasks, docs, meetings', icon: Briefcase, color: 'from-blue-500 to-indigo-600' },
                { name: 'Health AI', desc: 'Symptoms, doctors, wellness', icon: Stethoscope, color: 'from-green-500 to-emerald-600' },
                { name: 'Local AI', desc: 'Find services near you', icon: MapPin, color: 'from-orange-500 to-red-600' },
              ].map((agent) => (
                <Card key={agent.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                      <agent.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{agent.name}</h4>
                      <p className="text-xs text-muted-foreground">{agent.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
