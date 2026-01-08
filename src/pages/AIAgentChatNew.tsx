/**
 * AI Agent Chat - WhatsApp-Style Interface
 * Full-featured chat with voice, actions, memory indicators
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Mic, 
  MicOff,
  Phone,
  Video,
  MoreVertical,
  Sparkles,
  Brain,
  Zap,
  Clock,
  CheckCheck,
  Volume2,
  VolumeX,
  Paperclip,
  Image as ImageIcon,
  Smile,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { VoiceConversation } from '@/components/ai-agents/VoiceConversation';
import { AgentActionCard, useAgentActions, parseActionsFromResponse, AgentAction } from '@/components/ai-agents/AgentActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  isStreaming?: boolean;
  feedback?: 'positive' | 'negative';
  actions?: ActionButton[];
}

interface ActionButton {
  label: string;
  type: 'book' | 'call' | 'order' | 'link';
  data: string;
}

interface Agent {
  id: string;
  agent_name: string;
  agent_avatar_url: string | null;
  agent_description: string | null;
  greeting_message: string | null;
  is_active: boolean;
  agent_personality: string;
}

export default function AIAgentChatNew() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Agent actions hook
  const { actions, addAction, confirmAction, cancelAction } = useAgentActions();

  useEffect(() => {
    if (agentId) {
      loadAgent();
    }
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadAgent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('ai_agents' as any)
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;

      const agentData = data as any;
      setAgent(agentData);

      // Add greeting message
      if (agentData?.greeting_message) {
        setMessages([{
          id: 'greeting',
          role: 'assistant',
          content: agentData.greeting_message,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      toast.error('Failed to load AI agent');
      navigate('/ai-agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputMessage.trim();
    if (!messageText || !agent || sending) return;

    setInputMessage('');
    setSending(true);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Add streaming indicator
    const streamingId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true
    }]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          agentId: agent.id,
          message: messageText,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      // Replace streaming message with actual response
      setMessages(prev => prev.map(m => 
        m.id === streamingId 
          ? { ...m, content: data.reply, isStreaming: false }
          : m
      ));

      // Parse and add any actions from the response
      const detectedActions = parseActionsFromResponse(data.reply);
      detectedActions.forEach(actionData => {
        if (actionData.type && actionData.title) {
          addAction(actionData as any);
        }
      });

      // Speak response if voice enabled
      if (voiceEnabled && data.reply) {
        speakText(data.reply);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response');
      setMessages(prev => prev.filter(m => m.id !== streamingId && m.id !== userMessage.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
      // Auto-send after voice input
      setTimeout(() => handleSendMessage(transcript), 500);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition failed');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied!');
  };

  const giveFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: type } : m
    ));
    toast.success(type === 'positive' ? '👍 Thanks for feedback!' : '👎 We\'ll improve!');
  };

  const regenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;

    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    // Remove the old response
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Regenerate
    await handleSendMessage(userMessage.content);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ai-agents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <Avatar className="h-11 w-11">
              <AvatarImage src={agent.agent_avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                <Bot className="h-5 w-5 text-white" />
              </AvatarFallback>
            </Avatar>
            {agent.is_active && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{agent.agent_name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" />
              <span>AI Agent • {agent.is_active ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={voiceEnabled ? 'text-primary' : ''}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            
            {/* Voice Call Button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowVoiceCall(true)}
              className="text-green-500 hover:text-green-600"
            >
              <Phone className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/ai-agents/settings/${agent.id}`)}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMessages([])}>
                  Clear Chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/ai-agents')}>
                  All Agents
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {message.role === 'assistant' ? (
                  <>
                    <AvatarImage src={agent.agent_avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-muted">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                )}
              </Avatar>

              <div className={`max-w-[80%] space-y-1 ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <Card
                  className={`p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  }`}
                >
                  {message.isStreaming ? (
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </Card>

                {/* Message Actions (for assistant messages) */}
                {message.role === 'assistant' && !message.isStreaming && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => copyMessage(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-7 w-7 ${message.feedback === 'positive' ? 'text-green-500' : ''}`}
                      onClick={() => giveFeedback(message.id, 'positive')}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-7 w-7 ${message.feedback === 'negative' ? 'text-red-500' : ''}`}
                      onClick={() => giveFeedback(message.id, 'negative')}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => regenerateResponse(message.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    {voiceEnabled && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(message.content)}
                      >
                        {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {message.role === 'user' && <CheckCheck className="h-3 w-3 text-primary" />}
                </span>
              </div>
            </motion.div>
          ))}
          
          {/* Agent Actions */}
          {actions.filter(a => a.status === 'pending').map(action => (
            <AgentActionCard
              key={action.id}
              action={action}
              onConfirm={confirmAction}
              onCancel={cancelAction}
            />
          ))}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-background/80 backdrop-blur-xl p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          {/* Voice input button */}
          <Button
            variant={isListening ? "default" : "ghost"}
            size="icon"
            onClick={toggleVoiceInput}
            className={isListening ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Text input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? 'Listening...' : `Message ${agent.agent_name}...`}
              disabled={sending || !agent.is_active || isListening}
              className="pr-12 h-12 rounded-xl"
            />
            {inputMessage && (
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={sending || !agent.is_active}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg bg-primary"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {!agent.is_active && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            This agent is currently inactive
          </p>
        )}
      </div>

      {/* Voice Call Modal */}
      <AnimatePresence>
        {showVoiceCall && agent && (
          <VoiceConversation
            agentId={agent.id}
            agentName={agent.agent_name}
            agentPersonality={agent.agent_personality}
            onTranscript={(text, role) => {
              setMessages(prev => [...prev, {
                id: `${role}-${Date.now()}`,
                role,
                content: text,
                created_at: new Date().toISOString()
              }]);
            }}
            onClose={() => setShowVoiceCall(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
