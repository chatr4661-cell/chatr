import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Send, Bot, User, Sparkles, Loader2, Zap, Brain, Search, Briefcase, MapPin, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useChatrBrain } from '@/hooks/useChatrBrain';
import { BrainResponse, AgentType } from '@/services/chatrBrain/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import chatrIntelligenceIcon from '@/assets/chatr-intelligence-icon.jpeg';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agents?: AgentType[];
  action?: BrainResponse['action'];
  followUp?: string[];
  sources?: string[];
}

const agentConfig: Record<AgentType, { icon: React.ReactNode; color: string; label: string }> = {
  personal: { icon: <User className="h-3 w-3" />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Personal' },
  work: { icon: <Briefcase className="h-3 w-3" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Work' },
  search: { icon: <Search className="h-3 w-3" />, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Search' },
  local: { icon: <MapPin className="h-3 w-3" />, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Local' },
  jobs: { icon: <Briefcase className="h-3 w-3" />, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', label: 'Jobs' },
  health: { icon: <Heart className="h-3 w-3" />, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Health' },
};

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { query, isProcessing, isReady, quickDetect, error } = useChatrBrain();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await query(input.trim());
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        agents: response.agents,
        action: response.action,
        followUp: response.followUp,
        sources: response.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Chat error:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleFollowUp = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleAction = (action: BrainResponse['action']) => {
    if (action?.route) {
      navigate(action.route);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Live intent preview
  const previewIntent = input.trim() ? quickDetect(input.trim()) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)} className="hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={chatrIntelligenceIcon} 
                alt="CHATR Intelligence" 
                className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20 object-cover"
              />
              {isReady && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">CHATR Intelligence</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {isReady ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    6 AI Agents Active
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Initializing...
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-pink-500 opacity-20 blur-xl" />
              <img 
                src={chatrIntelligenceIcon} 
                alt="CHATR Intelligence" 
                className="relative w-full h-full rounded-2xl shadow-xl object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold mb-2">CHATR Intelligence</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Your unified AI assistant for healthcare, jobs, local services, and more. Ask anything!
            </p>
            
            {/* Agent Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {Object.entries(agentConfig).map(([key, config]) => (
                <Badge key={key} variant="outline" className={cn("text-xs py-1 px-3", config.color)}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
              ))}
            </div>
            
            {/* Quick Start Suggestions */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {[
                { text: 'Find doctors near me', icon: <Heart className="h-3 w-3" /> },
                { text: 'Jobs matching my skills', icon: <Briefcase className="h-3 w-3" /> },
                { text: 'Order food nearby', icon: <MapPin className="h-3 w-3" /> },
                { text: 'Health tips for today', icon: <Sparkles className="h-3 w-3" /> },
              ].map((suggestion) => (
                <Button
                  key={suggestion.text}
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  onClick={() => setInput(suggestion.text)}
                >
                  {suggestion.icon}
                  {suggestion.text}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 mb-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <Card className={`p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Agent Badges */}
                    {message.agents && message.agents.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {message.agents.map((agent) => (
                          <Badge 
                            key={agent} 
                            variant="outline"
                            className={cn("text-xs gap-1", agentConfig[agent].color)}
                          >
                            {agentConfig[agent].icon}
                            {agentConfig[agent].label}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Action Button */}
                    {message.action?.ready && (
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => handleAction(message.action)}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {message.action.buttonLabel || 'Take Action'}
                      </Button>
                    )}
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          Sources: {message.sources.join(', ')}
                        </p>
                      </div>
                    )}
                  </Card>
                  
                  {/* Follow-up Suggestions */}
                  {message.followUp && message.followUp.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {message.followUp.map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 rounded-full border border-border/50"
                          onClick={() => handleFollowUp(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {/* Loading Indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mb-4"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
            <Card className="p-3 bg-card">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </Card>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-card/80 backdrop-blur-lg border-t border-border/50 px-4 py-3 sticky bottom-0">
        {/* Intent Preview */}
        <AnimatePresence>
          {previewIntent && input.trim() && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-4xl mx-auto mb-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
                <Brain className="h-3 w-3 text-primary" />
                <span>Routing to</span>
                {previewIntent.agents.slice(0, 2).map((agent) => (
                  <Badge key={agent} variant="outline" className={cn("text-xs gap-1", agentConfig[agent].color)}>
                    {agentConfig[agent].icon}
                    {agentConfig[agent].label}
                  </Badge>
                ))}
                <span className="ml-auto text-primary font-medium">
                  {Math.round(previewIntent.confidence * 100)}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Input
            type="text"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing || !isReady}
            className="flex-1 bg-muted/50"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || !isReady}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {error && (
          <p className="text-xs text-destructive mt-2 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
