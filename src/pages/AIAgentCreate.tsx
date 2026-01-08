/**
 * AI Agent Creation - Step by Step Wizard
 * Create AI Clone, Business Agent, or Custom Agent
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  Briefcase,
  Sparkles,
  Mic,
  MessageSquare,
  Zap,
  Brain,
  Heart,
  Plus,
  Trash2,
  Upload,
  Wand2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const AGENT_TYPES = [
  {
    id: 'clone',
    name: 'AI Clone',
    description: 'Creates a digital twin that talks, thinks, and replies like you',
    icon: Users,
    color: 'from-cyan-500 to-blue-600',
    features: ['Learns your style', 'Auto-replies as you', 'Voice matching'],
  },
  {
    id: 'business',
    name: 'Business Agent',
    description: 'Handles customer support, bookings, and sales 24/7',
    icon: Briefcase,
    color: 'from-orange-500 to-red-600',
    features: ['24/7 support', 'Takes bookings', 'Answers FAQs'],
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    description: 'Build any AI personality or assistant from scratch',
    icon: Sparkles,
    color: 'from-violet-500 to-fuchsia-600',
    features: ['Full control', 'Any personality', 'Custom knowledge'],
  },
];

const PERSONALITY_PRESETS = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'casual', label: 'Casual', emoji: '🤙' },
  { id: 'empathetic', label: 'Empathetic', emoji: '💕' },
  { id: 'humorous', label: 'Humorous', emoji: '😄' },
  { id: 'formal', label: 'Formal', emoji: '🎩' },
];

interface TrainingExample {
  question: string;
  answer: string;
}

export default function AIAgentCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || '';
  
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [agentType, setAgentType] = useState(initialType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [personality, setPersonality] = useState('friendly');
  const [customPersonality, setCustomPersonality] = useState('');
  const [greeting, setGreeting] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [trainingExamples, setTrainingExamples] = useState<TrainingExample[]>([
    { question: '', answer: '' }
  ]);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const generateAvatar = () => {
    const seed = name || Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const addTrainingExample = () => {
    setTrainingExamples([...trainingExamples, { question: '', answer: '' }]);
  };

  const removeTrainingExample = (index: number) => {
    setTrainingExamples(trainingExamples.filter((_, i) => i !== index));
  };

  const updateTrainingExample = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...trainingExamples];
    updated[index][field] = value;
    setTrainingExamples(updated);
  };

  const handleCreate = async () => {
    if (!name.trim() || !purpose.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the agent
      const { data: agentData, error: agentError } = await supabase
        .from('ai_agents' as any)
        .insert({
          user_id: user.id,
          agent_name: name,
          agent_description: description,
          agent_purpose: purpose,
          agent_personality: customPersonality || personality,
          knowledge_base: knowledgeBase,
          greeting_message: greeting,
          auto_reply_enabled: autoReply,
          agent_avatar_url: avatarUrl,
          is_active: true,
        })
        .select()
        .single();

      if (agentError) throw agentError;

      // Add training data
      const validExamples = trainingExamples.filter(ex => ex.question.trim() && ex.answer.trim());
      if (validExamples.length > 0 && agentData) {
        await supabase
          .from('ai_agent_training' as any)
          .insert(
            validExamples.map(ex => ({
              agent_id: (agentData as any).id,
              question: ex.question,
              answer: ex.answer,
            }))
          );
      }

      toast.success(`${name} is ready! 🎉`);
      navigate(`/ai-agents/chat/${(agentData as any).id}`);
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!agentType;
      case 2: return !!name.trim() && !!purpose.trim();
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/ai-agents')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">Create AI Agent</h1>
                <p className="text-xs text-muted-foreground">Step {step} of {totalSteps}</p>
              </div>
            </div>
            <Badge variant="outline">{progress.toFixed(0)}%</Badge>
          </div>
          <Progress value={progress} className="h-1 mt-3" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <AnimatePresence mode="wait">
          {/* Step 1: Choose Type */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">What kind of agent?</h2>
                <p className="text-muted-foreground">Choose how your AI will work</p>
              </div>

              <div className="space-y-3">
                {AGENT_TYPES.map((type) => (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all ${
                      agentType === type.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setAgentType(type.id)}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center shrink-0`}>
                        <type.icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{type.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {type.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {agentType === type.id && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Name & Purpose</h2>
                <p className="text-muted-foreground">Give your agent an identity</p>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                    <Bot className="h-12 w-12 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={generateAvatar}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Avatar
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Agent Name *</Label>
                  <Input
                    placeholder="e.g., AI Arshid, Dr. Assistant, Shop Helper"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Purpose *</Label>
                  <Input
                    placeholder="What will this agent do?"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., "Answer customer questions about my shop" or "Help students with homework"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Description</Label>
                  <Textarea
                    placeholder="Tell users what your agent does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Personality & Knowledge */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Personality & Brain</h2>
                <p className="text-muted-foreground">How should your agent talk and what should it know?</p>
              </div>

              {/* Personality Presets */}
              <div className="space-y-3">
                <Label className="font-semibold">Personality</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PERSONALITY_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={personality === preset.id ? "default" : "outline"}
                      className="h-12 gap-2"
                      onClick={() => setPersonality(preset.id)}
                    >
                      <span>{preset.emoji}</span>
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Or describe a custom personality..."
                  value={customPersonality}
                  onChange={(e) => setCustomPersonality(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              </div>

              {/* Greeting Message */}
              <div className="space-y-2">
                <Label className="font-semibold">Greeting Message</Label>
                <Input
                  placeholder="Hi! I'm here to help. Ask me anything!"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Knowledge Base */}
              <div className="space-y-2">
                <Label className="font-semibold">Knowledge Base</Label>
                <Textarea
                  placeholder="Add information your agent should know: FAQs, pricing, product details, business hours, services..."
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  💡 The more details you add, the smarter your agent becomes
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Training & Features */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Train & Configure</h2>
                <p className="text-muted-foreground">Teach your agent with examples</p>
              </div>

              {/* Feature Toggles */}
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Auto-Reply</p>
                        <p className="text-xs text-muted-foreground">AI replies automatically 24/7</p>
                      </div>
                    </div>
                    <Switch checked={autoReply} onCheckedChange={setAutoReply} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mic className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Voice Enabled</p>
                        <p className="text-xs text-muted-foreground">Talk with voice, not just text</p>
                      </div>
                    </div>
                    <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                  </div>
                </CardContent>
              </Card>

              {/* Training Examples */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Training Examples</Label>
                  <Button variant="outline" size="sm" onClick={addTrainingExample}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                {trainingExamples.map((example, index) => (
                  <Card key={index}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Example {index + 1}</Badge>
                        {trainingExamples.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeTrainingExample(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="User might ask..."
                        value={example.question}
                        onChange={(e) => updateTrainingExample(index, 'question', e.target.value)}
                      />
                      <Textarea
                        placeholder="Agent should reply..."
                        value={example.answer}
                        onChange={(e) => updateTrainingExample(index, 'answer', e.target.value)}
                        rows={2}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 bg-gradient-to-r from-primary to-purple-600"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 bg-gradient-to-r from-primary via-purple-600 to-pink-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Agent
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
