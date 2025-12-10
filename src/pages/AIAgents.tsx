import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Plus, 
  MessageSquare, 
  Settings, 
  Trash2,
  Sparkles,
  Users,
  Activity,
  ArrowLeft,
  Zap,
  Brain,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs, CrossModuleNav } from '@/components/navigation';
import { ShareDeepLink } from '@/components/sharing';
import { BrainTestPanel } from '@/components/ai/BrainTestPanel';

interface AIAgent {
  id: string;
  agent_name: string;
  agent_avatar_url: string | null;
  agent_description: string | null;
  agent_personality: string;
  agent_purpose: string;
  knowledge_base: string | null;
  auto_reply_enabled: boolean;
  response_delay_seconds: number;
  greeting_message: string | null;
  is_active: boolean;
  total_conversations: number;
  total_messages: number;
  created_at: string;
}

interface TrainingData {
  id: string;
  question: string;
  answer: string;
}

export default function AIAgents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    agent_name: '',
    agent_description: '',
    agent_personality: 'helpful and professional',
    agent_purpose: '',
    knowledge_base: '',
    auto_reply_enabled: false,
    response_delay_seconds: 2,
    greeting_message: '',
    agent_avatar_url: ''
  });

  const [newTraining, setNewTraining] = useState({ question: '', answer: '' });

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadTrainingData(selectedAgent.id);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
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
      setAgents((data as any) || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load AI agents');
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingData = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_training' as any)
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainingData((data as any) || []);
    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!formData.agent_name || !formData.agent_purpose) {
        toast.error('Please fill in required fields');
        return;
      }

      const { data, error } = await supabase
        .from('ai_agents' as any)
        .insert({
          user_id: user.id,
          ...formData
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`${formData.agent_name} created successfully! 🤖`);
      setCreateDialogOpen(false);
      setFormData({
        agent_name: '',
        agent_description: '',
        agent_personality: 'helpful and professional',
        agent_purpose: '',
        knowledge_base: '',
        auto_reply_enabled: false,
        response_delay_seconds: 2,
        greeting_message: '',
        agent_avatar_url: ''
      });
      loadAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create AI agent');
    }
  };

  const handleToggleAgent = async (agent: AIAgent) => {
    try {
      const { error } = await supabase
        .from('ai_agents' as any)
        .update({ is_active: !agent.is_active })
        .eq('id', agent.id);

      if (error) throw error;
      toast.success(`${agent.agent_name} ${!agent.is_active ? 'activated' : 'deactivated'}`);
      loadAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to update agent');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this AI agent? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_agents' as any)
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      toast.success('AI agent deleted');
      loadAgents();
      setSelectedAgent(null);
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleAddTraining = async () => {
    if (!selectedAgent || !newTraining.question || !newTraining.answer) {
      toast.error('Please fill in both question and answer');
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_agent_training' as any)
        .insert({
          agent_id: selectedAgent.id,
          question: newTraining.question,
          answer: newTraining.answer
        });

      if (error) throw error;
      toast.success('Training data added');
      setNewTraining({ question: '', answer: '' });
      loadTrainingData(selectedAgent.id);
    } catch (error) {
      console.error('Error adding training:', error);
      toast.error('Failed to add training data');
    }
  };

  const handleDeleteTraining = async (trainingId: string) => {
    try {
      const { error } = await supabase
        .from('ai_agent_training' as any)
        .delete()
        .eq('id', trainingId);

      if (error) throw error;
      toast.success('Training data removed');
      if (selectedAgent) loadTrainingData(selectedAgent.id);
    } catch (error) {
      console.error('Error deleting training:', error);
      toast.error('Failed to delete training data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading AI Agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-pink-600 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Chatr AI Agent
                  </h1>
                  <p className="text-sm text-muted-foreground">Powered by Lovable AI</p>
                </div>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Create your AI twin that works 24/7 • Auto-replies • Manages conversations • Helps customers • Grows your business
              </p>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90">
              <Sparkles className="h-5 w-5" />
              Create AI Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-6 w-6 text-primary" />
                Create Your Chatr AI Agent
              </DialogTitle>
              <DialogDescription>
                Build an AI version of yourself that chats, helps, and works 24/7
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">

              <div className="space-y-5 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    Agent Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., AI Arshid, AI Shop Bot, Dr. Assistant"
                    value={formData.agent_name}
                    onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Give your AI a unique name</p>
                </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    Purpose <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., Student helper, Shop assistant, Medical FAQ"
                    value={formData.agent_purpose}
                    onChange={(e) => setFormData({ ...formData, agent_purpose: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">What will this AI help with?</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea
                    placeholder="Tell users what your AI agent does and how it can help them..."
                    value={formData.agent_description}
                    onChange={(e) => setFormData({ ...formData, agent_description: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Personality */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Personality</Label>
                  <Input
                    placeholder="e.g., helpful and friendly, professional and formal"
                    value={formData.agent_personality}
                    onChange={(e) => setFormData({ ...formData, agent_personality: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">How should your AI talk?</p>
                </div>

                {/* Knowledge Base */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Knowledge Base</Label>
                  <Textarea
                    placeholder="Add key information: pricing, services, FAQs, product details, business hours..."
                    value={formData.knowledge_base}
                    onChange={(e) => setFormData({ ...formData, knowledge_base: e.target.value })}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">The more info you add, the smarter your AI becomes</p>
                </div>

                {/* Greeting */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Greeting Message</Label>
                  <Input
                    placeholder="Hi! I'm your AI assistant. How can I help you today?"
                    value={formData.greeting_message}
                    onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">First message users will see</p>
                </div>

                {/* Auto-Reply Toggle */}
                <Card className="border-2">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label className="font-semibold">Enable Auto-Reply</Label>
                        <p className="text-xs text-muted-foreground">AI replies automatically 24/7</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.auto_reply_enabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, auto_reply_enabled: checked })
                      }
                    />
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleCreateAgent} 
                  className="w-full h-12 bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90 text-base font-semibold" 
                  size="lg"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create AI Agent Now
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-2">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Powered</h3>
                <p className="text-xs text-muted-foreground">Smart replies using Lovable AI</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">24/7 Active</h3>
                <p className="text-xs text-muted-foreground">Never miss a message</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-600 to-orange-600 flex items-center justify-center shrink-0">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Auto-Learn</h3>
                <p className="text-xs text-muted-foreground">Gets smarter with training</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Brain Test Panel */}
        <div className="mb-8">
          <BrainTestPanel />
        </div>

        {agents.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Create Your AI Twin</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Join thousands creating AI agents that work for them. Build your first agent in 2 minutes!
              </p>
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                size="lg"
                className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Create Your First AI Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your AI Agents</h2>
              <Badge variant="outline" className="text-sm">
                {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Card 
                  key={agent.id} 
                  className="group border-2 hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <CardContent className="p-0">
                    {/* Header with gradient */}
                    <div className="h-24 bg-gradient-to-br from-primary via-purple-600 to-pink-600 relative">
                      <div className="absolute -bottom-8 left-6">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-white to-gray-100 border-4 border-background flex items-center justify-center shadow-lg">
                          <Bot className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <Badge 
                        variant={agent.is_active ? "default" : "secondary"}
                        className="absolute top-4 right-4"
                      >
                        {agent.is_active ? '🟢 Active' : '⚫ Inactive'}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-6 pt-10">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{agent.agent_name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                        {agent.agent_purpose}
                      </p>
                      
                      {agent.agent_description && (
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                          {agent.agent_description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="text-center p-3 bg-primary/5 rounded-xl border">
                          <MessageSquare className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-xl font-bold">{agent.total_messages}</p>
                          <p className="text-[10px] text-muted-foreground">Messages</p>
                        </div>
                        <div className="text-center p-3 bg-purple-600/5 rounded-xl border">
                          <Users className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                          <p className="text-xl font-bold">{agent.total_conversations}</p>
                          <p className="text-[10px] text-muted-foreground">Chats</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ai-agents/chat/${agent.id}`);
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Chat
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgent(agent);
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Agent Details Dialog */}
        {selectedAgent && (
          <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  {selectedAgent.agent_name}
                </DialogTitle>
                <DialogDescription>
                  Manage your AI agent settings, training, and analytics
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(90vh-120px)]">

                <Tabs defaultValue="settings" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="training">
                      <Brain className="h-4 w-4 mr-2" />
                      Training
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                      <Activity className="h-4 w-4 mr-2" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings" className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-2">
                        <CardContent className="p-4">
                          <Label className="mb-3 block font-semibold">Agent Status</Label>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={selectedAgent.is_active}
                                onCheckedChange={() => handleToggleAgent(selectedAgent)}
                              />
                              <span className="text-sm font-medium">
                                {selectedAgent.is_active ? '🟢 Active' : '⚫ Inactive'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2">
                        <CardContent className="p-4">
                          <Label className="mb-3 block font-semibold">Auto-Reply</Label>
                          <div className="flex items-center gap-2">
                            <Switch checked={selectedAgent.auto_reply_enabled} disabled />
                            <span className="text-sm font-medium">
                              {selectedAgent.auto_reply_enabled ? '⚡ Enabled' : '⏸️ Disabled'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle className="text-base">Agent Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-semibold">Description</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedAgent.agent_description || 'No description provided'}
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Purpose</Label>
                          <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent_purpose}</p>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Personality</Label>
                          <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent_personality}</p>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Greeting Message</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedAgent.greeting_message || 'No greeting message'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle className="text-base">Knowledge Base</CardTitle>
                        <CardDescription>Information your AI uses to respond</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={selectedAgent.knowledge_base || 'No knowledge base configured yet'}
                          readOnly
                          rows={6}
                          className="resize-none"
                        />
                      </CardContent>
                    </Card>

                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteAgent(selectedAgent.id)}
                      className="w-full h-11"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete This AI Agent
                    </Button>
                  </TabsContent>

                  <TabsContent value="training" className="space-y-4 py-4">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          Train Your AI Agent
                        </CardTitle>
                        <CardDescription>
                          Add Q&A examples to make your AI smarter and more accurate
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Question</Label>
                          <Input
                            placeholder="e.g., What are your prices? When are you open?"
                            value={newTraining.question}
                            onChange={(e) => setNewTraining({ ...newTraining, question: e.target.value })}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Answer</Label>
                          <Textarea
                            placeholder="How your AI should respond to this question..."
                            value={newTraining.answer}
                            onChange={(e) => setNewTraining({ ...newTraining, answer: e.target.value })}
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                        <Button 
                          onClick={handleAddTraining} 
                          className="w-full h-11 bg-gradient-to-r from-primary to-purple-600"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Training Example
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">
                          Training Examples ({trainingData.length})
                        </Label>
                        {trainingData.length > 0 && (
                          <Badge variant="secondary">{trainingData.length} examples</Badge>
                        )}
                      </div>
                      
                      {trainingData.length === 0 ? (
                        <Card className="border-2 border-dashed">
                          <CardContent className="p-8 text-center">
                            <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                              No training examples yet. Add Q&A pairs above to teach your AI how to respond better.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {trainingData.map((data) => (
                            <Card key={data.id} className="border-2">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1 space-y-2">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Question</Label>
                                      <p className="font-medium text-sm">{data.question}</p>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Answer</Label>
                                      <p className="text-sm text-muted-foreground">{data.answer}</p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTraining(data.id)}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-2">
                        <CardContent className="p-6 text-center">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-4xl font-bold mb-1">{selectedAgent.total_messages}</p>
                          <p className="text-sm text-muted-foreground">Total Messages Sent</p>
                        </CardContent>
                      </Card>
                      <Card className="border-2">
                        <CardContent className="p-6 text-center">
                          <div className="h-12 w-12 rounded-xl bg-purple-600/10 flex items-center justify-center mx-auto mb-3">
                            <Users className="h-6 w-6 text-purple-600" />
                          </div>
                          <p className="text-4xl font-bold mb-1">{selectedAgent.total_conversations}</p>
                          <p className="text-sm text-muted-foreground">Total Conversations</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold mb-1">Agent Created</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedAgent.created_at).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardContent className="p-6 text-center">
                        <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary" />
                        <p className="font-semibold mb-1">AI Performance</p>
                        <p className="text-xs text-muted-foreground">
                          Your AI is learning from every conversation. Add more training data to improve accuracy!
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
