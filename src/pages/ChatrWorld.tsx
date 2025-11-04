import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Sparkles, Globe, Heart, Briefcase, Users, UtensilsCrossed, Tag, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  modules?: string[];
  data?: any;
  timestamp: Date;
}

const moduleIcons: Record<string, any> = {
  browser: Globe,
  health: Heart,
  business: Briefcase,
  community: Users,
  food: UtensilsCrossed,
  deals: Tag
};

const moduleColors: Record<string, string> = {
  browser: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  health: 'bg-red-500/10 text-red-600 border-red-500/20',
  business: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  community: 'bg-green-500/10 text-green-600 border-green-500/20',
  food: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  deals: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
};

export default function ChatrWorld() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: '👋 Welcome to **Chatr World** - your conversational multiverse interface!\n\nAsk me anything and I\'ll search across Chat, Browser, Health, Business, Community, Food, and Deals to give you the perfect answer.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('chatr-world', {
        body: { 
          query: input,
          userId: user?.id
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        modules: data.analysis.modules,
        data: data.modules,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatr World error:', error);
      toast.error('Failed to process your query. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: UtensilsCrossed, label: 'Find restaurants nearby', query: 'affordable restaurants near me' },
    { icon: Heart, label: 'Book a doctor', query: 'find a general physician' },
    { icon: Briefcase, label: 'Browse services', query: 'home cleaning services' },
    { icon: Tag, label: 'Hot deals', query: 'latest discounts and deals' }
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Chatr World</h1>
                  <p className="text-xs text-muted-foreground">Conversational Multiverse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                {message.type === 'assistant' && message.modules && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {message.modules.map(module => {
                      const Icon = moduleIcons[module];
                      return (
                        <Badge 
                          key={module} 
                          variant="outline"
                          className={`${moduleColors[module]} border`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {module}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                <Card className={`p-4 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card'
                }`}>
                  {message.type === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  
                  {message.data && Object.keys(message.data).length > 0 && (
                    <div className="mt-4 space-y-3">
                      {Object.entries(message.data).map(([key, value]: [string, any]) => (
                        <div key={key} className="border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                            {key} Results ({value.count || 0})
                          </p>
                          {value.count > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Data available: {value.type}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                
                <p className="text-xs text-muted-foreground mt-1 px-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <Card className="p-4 bg-card">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Searching across the multiverse...</p>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-4">
          <div className="container mx-auto max-w-4xl">
            <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                  onClick={() => setInput(action.query)}
                >
                  <action.icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs text-left">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything across Chat, Browser, Health, Business..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
