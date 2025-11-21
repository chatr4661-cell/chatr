import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Sparkles, Globe, Heart, Briefcase, Users, UtensilsCrossed, Tag, Loader2, ArrowLeft, MapPin, Mic, Share2, Download, ExternalLink, Phone, MapPinned } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useLocationStatus } from '@/hooks/useLocationStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [userId, setUserId] = useState<string>('');
  const { status: locationStatus } = useLocationStatus(userId);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: '👋 Welcome to **Chatr World** - your conversational multiverse interface!\n\nAsk me anything and I\'ll search across Chat, Browser, Health, Business, Community, Food, and Deals to give you the perfect answer.\n\n📍 Location-based results enabled for personalized recommendations!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    getUser();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      toast.success('Voice input captured');
    };

    recognition.onerror = () => {
      toast.error('Voice input error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const shareConversation = async () => {
    const text = messages.map(m => `${m.type === 'user' ? 'You' : 'Chatr World'}: ${m.content}`).join('\n\n');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chatr World Conversation',
          text: text,
        });
        toast.success('Shared successfully');
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Conversation copied to clipboard');
    }
  };

  const exportConversation = () => {
    const text = messages.map(m => `[${m.timestamp.toLocaleString()}] ${m.type === 'user' ? 'You' : 'Chatr World'}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatr-world-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported');
  };

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
          userId: user?.id,
          location: locationStatus.latitude && locationStatus.longitude ? {
            latitude: locationStatus.latitude,
            longitude: locationStatus.longitude,
            city: locationStatus.city,
            country: locationStatus.country
          } : null
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
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground">Conversational Multiverse</p>
                    {locationStatus.city && (
                      <span className="flex items-center gap-0.5 text-xs text-primary">
                        <MapPin className="h-3 w-3" />
                        {locationStatus.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={shareConversation}
                className="h-9 w-9"
                disabled={messages.length <= 1}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportConversation}
                className="h-9 w-9"
                disabled={messages.length <= 1}
              >
                <Download className="h-4 w-4" />
              </Button>
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
                      {Object.entries(message.data).map(([key, value]: [string, any]) => {
                        const items = value.providers || value.vendors || value.deals || [];
                        return (
                          <div key={key} className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2 capitalize flex items-center justify-between">
                              <span>{key} Results ({value.count || 0})</span>
                              {value.location && (
                                <span className="text-xs text-primary flex items-center gap-1">
                                  <MapPinned className="h-3 w-3" />
                                  {value.location}
                                </span>
                              )}
                            </p>
                            {items.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {items.slice(0, 3).map((item: any, idx: number) => (
                                  <Card
                                    key={idx}
                                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                    onClick={() => setSelectedResult(item)}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{item.name || item.title || item.business_name}</p>
                                        {item.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.description}</p>
                                        )}
                                        {item.location && (
                                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {item.location}
                                          </p>
                                        )}
                                      </div>
                                      {item.price && (
                                        <Badge variant="secondary" className="shrink-0">
                                          ₹{item.price}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                      {item.phone && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                                          <Phone className="h-3 w-3 mr-1" />
                                          Call
                                        </Button>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                                {items.length > 3 && (
                                  <p className="text-xs text-center text-muted-foreground">
                                    +{items.length - 3} more results
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
            <Button
              variant="outline"
              size="icon"
              onClick={startVoiceInput}
              disabled={isLoading || isListening}
              className={isListening ? 'animate-pulse border-primary' : ''}
            >
              <Mic className="h-4 w-4" />
            </Button>
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

      {/* Result Detail Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedResult?.name || selectedResult?.title || selectedResult?.business_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {selectedResult?.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{selectedResult.description}</p>
                </div>
              )}
              {selectedResult?.location && (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedResult.location}</p>
                </div>
              )}
              {selectedResult?.price && (
                <div>
                  <p className="text-sm font-medium mb-1">Price</p>
                  <p className="text-lg font-bold text-primary">₹{selectedResult.price}</p>
                </div>
              )}
              {selectedResult?.phone && (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Contact
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedResult.phone}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={() => {
                  if (selectedResult?.phone) {
                    window.location.href = `tel:${selectedResult.phone}`;
                  }
                }}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedResult(null)}>
                  Close
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
