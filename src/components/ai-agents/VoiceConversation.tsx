/**
 * Voice Conversation Component
 * Real-time voice chat with AI agents using Web Speech API + Lovable AI TTS
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  Loader2,
  Waves
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceConversationProps {
  agentId: string;
  agentName: string;
  agentPersonality?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onClose?: () => void;
}

export function VoiceConversation({ 
  agentId, 
  agentName, 
  agentPersonality,
  onTranscript,
  onClose 
}: VoiceConversationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [muted, setMuted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationHistory = useRef<{role: string; content: string}[]>([]);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        handleUserInput(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        toast.error('Voice recognition error');
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsListening(false);
    setIsProcessing(true);
    setTranscript('');
    
    // Stop listening while processing
    recognitionRef.current?.stop();

    onTranscript?.(text, 'user');
    conversationHistory.current.push({ role: 'user', content: text });

    try {
      // Get AI response
      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          agentId,
          message: text,
          conversationHistory: conversationHistory.current.slice(-10)
        }
      });

      if (error) throw error;

      const reply = data.reply;
      setAiResponse(reply);
      onTranscript?.(reply, 'assistant');
      conversationHistory.current.push({ role: 'assistant', content: reply });

      // Speak the response if not muted
      if (!muted) {
        await speakResponse(reply);
      }

    } catch (error) {
      console.error('AI response error:', error);
      toast.error('Failed to get response');
    } finally {
      setIsProcessing(false);
      
      // Resume listening if call still active
      if (isActive) {
        startListening();
      }
    }
  }, [agentId, muted, isActive, onTranscript]);

  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    
    try {
      // Use Lovable AI TTS
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-voice-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text, 
            personality: agentPersonality || 'friendly' 
          }),
        }
      );

      if (!response.ok) throw new Error('TTS failed');

      const data = await response.json();
      
      if (data.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => setIsSpeaking(false);
        await audioRef.current.play();
      } else {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (error) {
      // Already started
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startCall = () => {
    setIsActive(true);
    startListening();
    toast.success(`Voice call started with ${agentName}`);
  };

  const endCall = () => {
    setIsActive(false);
    stopListening();
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setTranscript('');
    setAiResponse('');
    conversationHistory.current = [];
    onClose?.();
    toast.info('Voice call ended');
  };

  const toggleMute = () => {
    setMuted(!muted);
    if (!muted) {
      speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsSpeaking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
    >
      {/* Voice Visualizer */}
      <div className="relative mb-8">
        <motion.div
          animate={{
            scale: isListening ? [1, 1.2, 1] : isSpeaking ? [1, 1.15, 1] : 1,
            opacity: isActive ? 1 : 0.5
          }}
          transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
          className={`w-32 h-32 rounded-full flex items-center justify-center ${
            isListening 
              ? 'bg-red-500/20 ring-4 ring-red-500' 
              : isSpeaking 
                ? 'bg-primary/20 ring-4 ring-primary'
                : 'bg-muted'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : isListening ? (
            <Mic className="h-12 w-12 text-red-500" />
          ) : isSpeaking ? (
            <Waves className="h-12 w-12 text-primary animate-pulse" />
          ) : (
            <Volume2 className="h-12 w-12 text-muted-foreground" />
          )}
        </motion.div>

        {/* Audio waves animation */}
        {(isListening || isSpeaking) && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2, 
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                className={`absolute w-32 h-32 rounded-full border-2 ${
                  isListening ? 'border-red-500' : 'border-primary'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Agent Name */}
      <h2 className="text-2xl font-bold mb-2">{agentName}</h2>
      <p className="text-muted-foreground mb-4">
        {isProcessing ? 'Thinking...' : isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
      </p>

      {/* Live Transcript */}
      <AnimatePresence>
        {(transcript || aiResponse) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md text-center mb-8 p-4 rounded-lg bg-muted/50"
          >
            {transcript && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">You:</span> {transcript}
              </p>
            )}
            {aiResponse && !transcript && (
              <p className="text-sm">
                <span className="font-medium text-primary">{agentName}:</span> {aiResponse.slice(0, 100)}...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={toggleMute}
          disabled={!isActive}
        >
          {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>

        {!isActive ? (
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
            onClick={startCall}
          >
            <Phone className="h-7 w-7" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
            onClick={endCall}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          className={`h-14 w-14 rounded-full ${isListening ? 'bg-red-500 text-white border-red-500' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={!isActive || isProcessing || isSpeaking}
        >
          {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        className="mt-8"
        onClick={endCall}
      >
        Close
      </Button>
    </motion.div>
  );
}
