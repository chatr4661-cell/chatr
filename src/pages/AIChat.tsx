import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Bot, User, Sparkles, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useChatrBrain } from '@/hooks/useChatrBrain';
import { BrainResponse, AgentType } from '@/services/chatrBrain/types';
import { motion, AnimatePresence } from 'framer-motion';

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

const agentIcons: Record<AgentType, string> = {
  personal: '👤',
  work: '💼',
  search: '🔍',
  local: '📍',
  jobs: '💼',
  health: '🏥',
};

const agentColors: Record<AgentType, string> = {
  personal: 'bg-purple-500/20 text-purple-400',
  work: 'bg-blue-500/20 text-blue-400',
  search: 'bg-green-500/20 text-green-400',
  local: 'bg-orange-500/20 text-orange-400',
  jobs: 'bg-indigo-500/20 text-indigo-400',
  health: 'bg-red-500/20 text-red-400',
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">CHATR Brain</h1>
              <p className="text-xs text-muted-foreground">
                {isReady ? '6 AI Agents Ready' : 'Initializing...'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Hi! I'm CHATR Brain</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              I can help you find doctors, search jobs, book services, get health advice, and more. Just ask!
            </p>
            
            {/* Quick Start Suggestions */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Find doctors near me',
                'Jobs matching my skills',
                'Order food nearby',
                'Health tips for today',
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
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
                            variant="secondary"
                            className={`text-xs ${agentColors[agent]}`}
                          >
                            {agentIcons[agent]} {agent}
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
        {previewIntent && input.trim() && (
          <div className="max-w-4xl mx-auto mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Routing to:</span>
              {previewIntent.agents.slice(0, 2).map((agent) => (
                <Badge key={agent} variant="outline" className="text-xs">
                  {agentIcons[agent]} {agent}
                </Badge>
              ))}
              <span className="ml-auto">
                {Math.round(previewIntent.confidence * 100)}% confident
              </span>
            </div>
          </div>
        )}
        
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
