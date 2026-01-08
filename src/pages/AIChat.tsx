/**
 * CHATR INTELLIGENCE - World's Best Unified AI
 * 6 Specialized Agents | Voice | Streaming | Actions
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Send, Bot, User, Sparkles, Loader2, Zap, Brain, Search, 
  Briefcase, MapPin, Heart, Mic, MicOff, Volume2, VolumeX, 
  ChevronDown, Wand2, Copy, Check, RefreshCw, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useChatrBrain } from '@/hooks/useChatrBrain';
import { BrainResponse, AgentType, DetectedIntent } from '@/services/chatrBrain/types';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  isStreaming?: boolean;
}

const agentConfig: Record<AgentType, { icon: React.ReactNode; color: string; gradient: string; label: string; desc: string }> = {
  personal: { 
    icon: <User className="h-3.5 w-3.5" />, 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', 
    gradient: 'from-purple-500 to-violet-600',
    label: 'Personal', 
    desc: 'Memory & Identity'
  },
  work: { 
    icon: <Briefcase className="h-3.5 w-3.5" />, 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', 
    gradient: 'from-blue-500 to-indigo-600',
    label: 'Work', 
    desc: 'Tasks & Docs'
  },
  search: { 
    icon: <Search className="h-3.5 w-3.5" />, 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', 
    gradient: 'from-emerald-500 to-teal-600',
    label: 'Search', 
    desc: 'Knowledge & Facts'
  },
  local: { 
    icon: <MapPin className="h-3.5 w-3.5" />, 
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', 
    gradient: 'from-orange-500 to-red-600',
    label: 'Local', 
    desc: 'Services Near You'
  },
  jobs: { 
    icon: <Briefcase className="h-3.5 w-3.5" />, 
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', 
    gradient: 'from-indigo-500 to-purple-600',
    label: 'Jobs', 
    desc: 'Career & Skills'
  },
  health: { 
    icon: <Heart className="h-3.5 w-3.5" />, 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', 
    gradient: 'from-rose-500 to-pink-600',
    label: 'Health', 
    desc: 'Wellness & Doctors'
  },
};

const quickSuggestions = [
  { text: 'Find doctors near me', icon: Heart, agent: 'health' as AgentType },
  { text: 'Jobs matching my skills', icon: Briefcase, agent: 'jobs' as AgentType },
  { text: 'Order food nearby', icon: MapPin, agent: 'local' as AgentType },
  { text: 'Write an email for leave', icon: Briefcase, agent: 'work' as AgentType },
  { text: 'Who is the PM of India?', icon: Search, agent: 'search' as AgentType },
  { text: 'Remember my name', icon: User, agent: 'personal' as AgentType },
];

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  
  const { query, isProcessing, isReady, quickDetect, error } = useChatrBrain();
  
  // Animated counter for typing effect
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

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

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
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
      const response = await query(input.trim());
      
      // Replace streaming message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === streamingId 
          ? {
              ...msg,
              content: response.answer,
              agents: response.agents,
              action: response.action,
              followUp: response.followUp,
              sources: response.sources,
              isStreaming: false,
            }
          : msg
      ));
    } catch (err) {
      console.error('AI Chat error:', err);
      setMessages(prev => prev.map(msg => 
        msg.id === streamingId 
          ? {
              ...msg,
              content: 'Sorry, I encountered an error. Please try again.',
              isStreaming: false,
            }
          : msg
      ));
    }
  };

  const handleFollowUp = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleAction = (action: BrainResponse['action']) => {
    if (action?.route) {
      navigate(action.route);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Live intent preview
  const previewIntent = input.trim() ? quickDetect(input.trim()) : null;

  const renderEmptyState = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      {/* Animated Brain Logo */}
      <div className="relative mb-8">
        <motion.div 
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary via-purple-600 to-pink-500 opacity-30 blur-2xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <img 
            src={chatrIntelligenceIcon} 
            alt="CHATR Intelligence" 
            className="w-24 h-24 rounded-3xl shadow-2xl shadow-primary/30 object-cover ring-4 ring-primary/20"
          />
          <motion.div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="h-4 w-4 text-white" />
          </motion.div>
        </motion.div>
      </div>

      <motion.h2 
        className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-purple-500 bg-clip-text text-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        CHATR Intelligence
      </motion.h2>
      
      <motion.p 
        className="text-muted-foreground text-center mb-6 max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        6 AI Agents working together. Healthcare, Jobs, Local Services, and more — all in one place.
      </motion.p>

      {/* Agent Orbit Animation */}
      <motion.div 
        className="relative w-64 h-16 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex justify-center gap-2">
          {Object.entries(agentConfig).map(([key, config], idx) => (
            <motion.div
              key={key}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg cursor-pointer",
                `bg-gradient-to-br ${config.gradient}`
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              whileHover={{ scale: 1.15, y: -5 }}
              onClick={() => setShowAgentPanel(!showAgentPanel)}
            >
              <span className="text-white">{config.icon}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Agent Details Panel */}
      <AnimatePresence>
        {showAgentPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-md mb-6 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted/30 rounded-2xl border border-border/50">
              {Object.entries(agentConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br", config.gradient)}>
                    <span className="text-white">{config.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Suggestions Grid */}
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {quickSuggestions.map((suggestion, idx) => (
          <motion.button
            key={suggestion.text}
            className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all text-left group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setInput(suggestion.text)}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
              agentConfig[suggestion.agent].gradient
            )}>
              <suggestion.icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
              {suggestion.text}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}
      >
        {!isUser && (
          <motion.div 
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.1 }}
          >
            {message.isStreaming ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Brain className="h-4 w-4 text-white" />
            )}
          </motion.div>
        )}
        
        <div className={cn("max-w-[80%] space-y-2", isUser && "order-first")}>
          <Card className={cn(
            "p-4 relative overflow-hidden",
            isUser 
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
              : "bg-card border-border/50"
          )}>
            {/* Streaming animation */}
            {message.isStreaming && (
              <div className="flex items-center gap-2">
                <motion.div 
                  className="flex gap-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            )}
            
            {!message.isStreaming && (
              <>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                
                {/* Agent Badges */}
                {message.agents && message.agents.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {message.agents.map((agent) => (
                      <Badge 
                        key={agent} 
                        variant="outline"
                        className={cn("text-xs gap-1 font-medium", agentConfig[agent].color)}
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
                    className="mt-3 w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                    onClick={() => handleAction(message.action)}
                  >
                    <Zap className="h-4 w-4" />
                    {message.action.buttonLabel || 'Take Action'}
                  </Button>
                )}
                
                {/* Message Actions */}
                {!isUser && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => copyToClipboard(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => speakText(message.content)}
                    >
                      {isSpeaking ? (
                        <VolumeX className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                      {isSpeaking ? 'Stop' : 'Listen'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
          
          {/* Follow-up Suggestions */}
          {message.followUp && message.followUp.length > 0 && !message.isStreaming && (
            <div className="flex gap-2 flex-wrap">
              {message.followUp.map((suggestion) => (
                <motion.button
                  key={suggestion}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/30 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFollowUp(suggestion)}
                >
                  <Wand2 className="h-3 w-3 inline mr-1" />
                  {suggestion}
                </motion.button>
              ))}
            </div>
          )}
        </div>
        
        {isUser && (
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4" />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => navigate(-1)} className="hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
              >
                <img 
                  src={chatrIntelligenceIcon} 
                  alt="CHATR Intelligence" 
                  className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20 object-cover ring-2 ring-primary/20"
                />
                {isReady && (
                  <motion.span 
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border-2 border-background"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <div>
                <h1 className="text-lg font-bold">CHATR Intelligence</h1>
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
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setShowAgentPanel(!showAgentPanel)}
          >
            <Brain className="h-4 w-4" />
            Agents
            <ChevronDown className={cn("h-3 w-3 transition-transform", showAgentPanel && "rotate-180")} />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        {messages.length === 0 ? renderEmptyState() : (
          <AnimatePresence mode="popLayout">
            {messages.map(renderMessage)}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-card/80 backdrop-blur-xl border-t border-border/30 px-4 py-4 sticky bottom-0">
        {/* Intent Preview */}
        <AnimatePresence>
          {previewIntent && input.trim() && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-4xl mx-auto mb-3"
            >
              <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-xl px-4 py-2 border border-border/50">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Brain className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-muted-foreground">Routing to</span>
                <div className="flex gap-1.5">
                  {previewIntent.agents.slice(0, 2).map((agent) => (
                    <Badge key={agent} variant="outline" className={cn("text-xs gap-1", agentConfig[agent].color)}>
                      {agentConfig[agent].icon}
                      {agentConfig[agent].label}
                    </Badge>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${previewIntent.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-primary font-semibold">
                    {Math.round(previewIntent.confidence * 100)}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 bg-muted/50 rounded-2xl p-2 border border-border/50 focus-within:border-primary/50 transition-colors">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 rounded-xl transition-colors",
                isListening && "bg-red-500/20 text-red-500"
              )}
              onClick={toggleVoiceInput}
            >
              {isListening ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <MicOff className="h-5 w-5" />
                </motion.div>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            
            <textarea
              ref={inputRef}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing || !isReady}
              rows={1}
              className="flex-1 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 py-2 px-1 text-sm min-h-[40px] max-h-[120px]"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            
            <Button 
              size="icon" 
              className={cn(
                "shrink-0 rounded-xl transition-all",
                input.trim() && !isProcessing
                  ? "bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/30"
                  : ""
              )}
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
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive mt-2 text-center"
            >
              {error}
            </motion.p>
          )}
          
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
            CHATR Intelligence can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
