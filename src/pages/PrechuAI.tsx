import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Languages, Sparkles, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PrechuAI() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m Prechu AI, your smart chat companion. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickActions = [
    {
      icon: FileText,
      label: 'Summarize my chats',
      action: 'summarize',
    },
    {
      icon: Sparkles,
      label: 'Rewrite professionally',
      action: 'rewrite',
    },
    {
      icon: Languages,
      label: 'Translate by last message',
      action: 'translate',
    },
    {
      icon: Trash2,
      label: 'Clean old media',
      action: 'clean',
    },
  ];

  const handleQuickAction = async (action: string) => {
    let prompt = '';
    switch (action) {
      case 'summarize':
        prompt = 'Summarize my recent chats';
        break;
      case 'rewrite':
        prompt = 'Rewrite my last message professionally';
        break;
      case 'translate':
        prompt = 'Translate my last message to English';
        break;
      case 'clean':
        prompt = 'Help me clean old media files';
        break;
    }
    
    if (prompt) {
      setInput(prompt);
      await sendMessage(prompt);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { message: text, model: 'google/gemini-2.5-flash' },
      });

      if (error) throw error;

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I\'m here to help! Ask me anything.',
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response');
      
      // Mock response for demo
      const mockMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I understand! I can help with that. Here\'s what I suggest...',
      };
      setMessages((prev) => [...prev, mockMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary via-primary-glow to-primary">
      {/* Header */}
      <div className="p-4 text-white">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">Prechu AI</h1>
            <p className="text-sm opacity-90">Your smart chat companion</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Profile */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.action)}
                className="flex items-center gap-2 p-3 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-colors text-left"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-white/90 text-primary'
                  : 'bg-white/20 text-white backdrop-blur-sm'
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/10 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 bg-white/90 border-0"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-white text-primary hover:bg-white/90"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
