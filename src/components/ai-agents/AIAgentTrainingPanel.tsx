import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, Plus, Settings, MessageSquare, Brain, Sparkles,
  Users, BarChart3, Pencil, Trash2, Play, Pause, Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIAgent {
  id: string;
  agent_name: string;
  agent_purpose: string;
  agent_personality: string;
  agent_description?: string;
  greeting_message?: string;
  knowledge_base?: string;
  is_active: boolean;
  auto_reply_enabled: boolean;
  total_conversations: number;
  total_messages: number;
}

interface TrainingExample {
  id: string;
  question: string;
  answer: string;
}

export function AIAgentTrainingPanel({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingExample, setAddingExample] = useState(false);

  useEffect(() => {
    loadAgentData();
  }, [agentId]);

  const loadAgentData = async () => {
    try {
      // Load agent details
      const { data: agentData } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentData) setAgent(agentData);

      // Load training data
      const { data: training } = await supabase
        .from('ai_agent_training')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      setTrainingData(training || []);
    } catch (error) {
      console.error('Error loading agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrainingExample = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Please enter both question and answer');
      return;
    }

    setAddingExample(true);
    try {
      const { error } = await supabase
        .from('ai_agent_training')
        .insert({
          agent_id: agentId,
          question: newQuestion.trim(),
          answer: newAnswer.trim()
        });

      if (error) throw error;

      toast.success('Training example added');
      setNewQuestion('');
      setNewAnswer('');
      loadAgentData();
    } catch (error) {
      console.error('Error adding training:', error);
      toast.error('Failed to add training example');
    } finally {
      setAddingExample(false);
    }
  };

  const deleteTrainingExample = async (id: string) => {
    try {
      await supabase
        .from('ai_agent_training')
        .delete()
        .eq('id', id);
      
      toast.success('Training example deleted');
      loadAgentData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const toggleAgentActive = async () => {
    if (!agent) return;
    
    try {
      await supabase
        .from('ai_agents')
        .update({ is_active: !agent.is_active })
        .eq('id', agentId);
      
      setAgent({ ...agent, is_active: !agent.is_active });
      toast.success(agent.is_active ? 'Agent deactivated' : 'Agent activated');
    } catch (error) {
      toast.error('Failed to update agent');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!agent) {
    return <div className="text-center py-8 text-muted-foreground">Agent not found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Agent Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg">{agent.agent_name}</h2>
                <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{agent.agent_purpose}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {agent.total_messages || 0} messages
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {agent.total_conversations || 0} conversations
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAgentActive}
              className="gap-1"
            >
              {agent.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {agent.is_active ? 'Pause' : 'Activate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Training Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Training Data ({trainingData.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Example */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-xs">User Question</Label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="What would a user ask?"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Agent Response</Label>
              <Textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="How should the agent respond?"
                rows={3}
                className="mt-1"
              />
            </div>
            <Button
              onClick={addTrainingExample}
              disabled={addingExample}
              size="sm"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              {addingExample ? 'Adding...' : 'Add Training Example'}
            </Button>
          </div>

          {/* Training Examples List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {trainingData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No training examples yet. Add some to improve your agent.
                </div>
              ) : (
                trainingData.map((example) => (
                  <motion.div
                    key={example.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 border rounded-lg hover:bg-muted/50 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{example.question}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{example.answer}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => deleteTrainingExample(example.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Training Tips
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Add at least 10-20 examples for best results</li>
            <li>• Include variations of common questions</li>
            <li>• Match the tone to your agent's personality</li>
            <li>• Update training data based on user interactions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}