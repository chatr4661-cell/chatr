import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Plus, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  Trash2,
  Upload,
  Sparkles,
  Users,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            <Sparkles className="h-10 w-10 text-primary" />
            Create Your AI Self
          </h1>
          <p className="text-muted-foreground mt-2">
            Build AI agents that work for you 24/7 - auto-reply, manage DMs, and more
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create AI Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Your AI Agent</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Agent Name *</Label>
                <Input
                  placeholder="AI Arshid, AI Shop Bot, Dr. AI Assistant..."
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="A brief description of what your AI agent does..."
                  value={formData.agent_description}
                  onChange={(e) => setFormData({ ...formData, agent_description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label>Purpose *</Label>
                <Input
                  placeholder="E.g., Student helper, Shop assistant, Medical FAQ bot..."
                  value={formData.agent_purpose}
                  onChange={(e) => setFormData({ ...formData, agent_purpose: e.target.value })}
                />
              </div>

              <div>
                <Label>Personality</Label>
                <Input
                  placeholder="helpful and professional, friendly and casual, formal and expert..."
                  value={formData.agent_personality}
                  onChange={(e) => setFormData({ ...formData, agent_personality: e.target.value })}
                />
              </div>

              <div>
                <Label>Knowledge Base</Label>
                <Textarea
                  placeholder="Add information your AI should know... pricing, services, FAQs, etc."
                  value={formData.knowledge_base}
                  onChange={(e) => setFormData({ ...formData, knowledge_base: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label>Greeting Message</Label>
                <Input
                  placeholder="Hi! I'm your AI assistant. How can I help?"
                  value={formData.greeting_message}
                  onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Auto-Reply</Label>
                <Switch
                  checked={formData.auto_reply_enabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, auto_reply_enabled: checked })
                  }
                />
              </div>

              <Button onClick={handleCreateAgent} className="w-full" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Create AI Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="h-20 w-20 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No AI Agents Yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first AI agent to automate conversations and grow your business
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Agent
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card 
              key={agent.id} 
              className="p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{agent.agent_name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.agent_purpose}</p>
                  </div>
                </div>
                <Badge variant={agent.is_active ? "default" : "secondary"}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {agent.agent_description || 'No description'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <MessageSquare className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{agent.total_messages}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{agent.total_conversations}</p>
                  <p className="text-xs text-muted-foreground">Conversations</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleAgent(agent);
                  }}
                >
                  {agent.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAgent(agent);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Details Dialog */}
      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Bot className="h-6 w-6" />
                {selectedAgent.agent_name}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={selectedAgent.is_active}
                        onCheckedChange={() => handleToggleAgent(selectedAgent)}
                      />
                      <span className="text-sm">
                        {selectedAgent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Auto-Reply</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch checked={selectedAgent.auto_reply_enabled} disabled />
                      <span className="text-sm">
                        {selectedAgent.auto_reply_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAgent.agent_description || 'No description'}
                  </p>
                </div>

                <div>
                  <Label>Purpose</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent_purpose}</p>
                </div>

                <div>
                  <Label>Personality</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent_personality}</p>
                </div>

                <div>
                  <Label>Knowledge Base</Label>
                  <Textarea
                    value={selectedAgent.knowledge_base || ''}
                    readOnly
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteAgent(selectedAgent.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Agent
                </Button>
              </TabsContent>

              <TabsContent value="training" className="space-y-4">
                <div className="space-y-3">
                  <Label>Add Training Example</Label>
                  <Input
                    placeholder="Question users might ask..."
                    value={newTraining.question}
                    onChange={(e) => setNewTraining({ ...newTraining, question: e.target.value })}
                  />
                  <Textarea
                    placeholder="How your AI should respond..."
                    value={newTraining.answer}
                    onChange={(e) => setNewTraining({ ...newTraining, answer: e.target.value })}
                    rows={3}
                  />
                  <Button onClick={handleAddTraining} className="w-full">
                    Add Training Data
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Training Data ({trainingData.length})</Label>
                  {trainingData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No training data yet. Add examples to improve your AI's responses.
                    </p>
                  ) : (
                    trainingData.map((data) => (
                      <Card key={data.id} className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-1">Q: {data.question}</p>
                            <p className="text-sm text-muted-foreground">A: {data.answer}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTraining(data.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{selectedAgent.total_messages}</p>
                    <p className="text-sm text-muted-foreground">Total Messages</p>
                  </Card>
                  <Card className="p-6 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{selectedAgent.total_conversations}</p>
                    <p className="text-sm text-muted-foreground">Conversations</p>
                  </Card>
                </div>
                <Card className="p-6 text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(selectedAgent.created_at).toLocaleDateString()}
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
