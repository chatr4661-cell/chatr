/**
 * CHATR INTELLIGENCE - Clean & Smooth AI Chat
 * 6 Specialized Agents | Minimal | Fast
 */

import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Send, Bot, Sparkles, Loader2, Brain, 
  Mic, MicOff, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useChatrBrain } from '@/hooks/useChatrBrain';
import { BrainResponse, AgentType } from '@/services/chatrBrain/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import chatrIntelligenceIcon from '@/assets/chatr-intelligence-icon.jpeg';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const quickSuggestions = [
  'Find doctors near me',
  'Jobs matching my skills',
  'Order food nearby',
  'Write an email',
  'What\'s the weather?',
  'Set a reminder',
];

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  
  const { query, isProcessing, isReady, error } = useChatrBrain();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition failed');
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');

    // Add streaming placeholder
    const streamingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const response = await query(currentInput);
      
      setMessages(prev => prev.map(msg => 
        msg.id === streamingId 
          ? { ...msg, content: response.answer, isStreaming: false }
          : msg
      ));
    } catch (err) {
      console.error('AI Chat error:', err);
      setMessages(prev => prev.map(msg => 
        msg.id === streamingId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
          : msg
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const renderEmptyState = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full px-6"
    >
      {/* Logo */}
      <motion.div 
        className="relative mb-6"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <img 
          src={chatrIntelligenceIcon} 
          alt="CHATR Intelligence" 
          className="w-20 h-20 rounded-2xl shadow-xl object-cover"
        />
        <motion.div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-3 w-3 text-white" />
        </motion.div>
      </motion.div>

      <h2 className="text-xl font-semibold mb-1">CHATR Intelligence</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
        6 AI agents ready to help with health, jobs, local services & more
      </p>

      {/* Quick Suggestions */}
      <div className="flex flex-wrap justify-center gap-2 max-w-sm">
        {quickSuggestions.map((text, idx) => (
          <motion.button
            key={text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => handleSuggestion(text)}
            className="px-3 py-2 text-sm rounded-full bg-muted hover:bg-muted/80 border border-border transition-colors"
          >
            {text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {message.isStreaming ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Brain className="h-4 w-4 text-primary" />
            )}
          </div>
        )}
        
        <div className={cn("max-w-[75%] group", isUser && "order-first")}>
          <div className={cn(
            "px-4 py-2.5 rounded-2xl text-sm",
            isUser 
              ? "bg-primary text-primary-foreground rounded-br-md" 
              : "bg-muted rounded-bl-md"
          )}>
            {message.isStreaming ? (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}
          </div>
          
          {/* Copy button - only for assistant messages */}
          {!isUser && !message.isStreaming && (
            <button
              onClick={() => copyToClipboard(message.content, message.id)}
              className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copiedId === message.id ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedId === message.id ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Minimal */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2.5 flex-1">
          <div className="relative">
            <img 
              src={chatrIntelligenceIcon} 
              alt="AI" 
              className="w-9 h-9 rounded-xl object-cover"
            />
            {isReady && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">CHATR Intelligence</h1>
            <p className="text-xs text-muted-foreground">
              {isReady ? '6 agents active' : 'Connecting...'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? renderEmptyState() : (
          <AnimatePresence mode="popLayout">
            {messages.map(renderMessage)}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Clean */}
      <div className="px-4 pb-4 pt-2 bg-background border-t border-border/30">
        <div className="flex items-end gap-2 bg-muted/50 rounded-xl p-1.5 border border-border/50 focus-within:border-primary/40 transition-colors">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-lg shrink-0",
              isListening && "bg-red-500/15 text-red-500"
            )}
            onClick={toggleVoiceInput}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <textarea
            ref={inputRef}
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || !isReady}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none focus:outline-none py-2 px-1 text-sm min-h-[36px] max-h-[100px]"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 100) + 'px';
            }}
          />
          
          <Button 
            size="icon" 
            className="h-9 w-9 rounded-lg shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || !isReady}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
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
