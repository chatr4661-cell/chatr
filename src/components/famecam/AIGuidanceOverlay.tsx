import { Sparkles, TrendingUp, Target, Palette, DollarSign, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface AIGuidanceOverlayProps {
  guidance: {
    category: string;
    tips: string[];
    trendingNow: boolean;
    realtimeGuidance?: string;
    fameScore?: number;
    captureNow?: boolean;
  };
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  onVoiceToggle?: (enabled: boolean) => void;
}

type AIMode = "viral" | "creative" | "brand";

const trendingCategories = [
  { name: "Dance", emoji: "💃", score: 95, creators: "1.2k", challenges: 3 },
  { name: "Food", emoji: "🍕", score: 88, creators: "890", challenges: 5 },
  { name: "Fashion", emoji: "👗", score: 82, creators: "650", challenges: 2 },
  { name: "Comedy", emoji: "😂", score: 90, creators: "1.5k", challenges: 4 },
  { name: "Fitness", emoji: "💪", score: 75, creators: "420", challenges: 1 },
];

const aiModes = [
  { id: "viral" as AIMode, label: "Viral", icon: Target, color: "text-green-400" },
  { id: "creative" as AIMode, label: "Creative", icon: Palette, color: "text-purple-400" },
  { id: "brand" as AIMode, label: "Brand", icon: DollarSign, color: "text-yellow-400" },
];

export default function AIGuidanceOverlay({
  guidance,
  currentCategory,
  onCategoryChange,
  onVoiceToggle
}: AIGuidanceOverlayProps) {
  const [currentMode, setCurrentMode] = useState<AIMode>("viral");
  const [whisperTip, setWhisperTip] = useState("");
  const [showWhisper, setShowWhisper] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Voice synthesis for AI guidance
  const speakGuidance = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    onVoiceToggle?.(newState);
    
    if (newState) {
      speakGuidance("AI voice guidance enabled. I'll help you create viral content.");
    }
  };

  // Real-time whisper tips rotation
  useEffect(() => {
    const tips = guidance.realtimeGuidance 
      ? [guidance.realtimeGuidance]
      : [
          "Perfect lighting 🔥 Keep that angle!",
          "Hold it! This pose is trending!",
          "You're nailing it! 💯",
          "This angle is fire 🔥",
          "Keep steady... almost there!",
        ];
    
    let index = 0;
    const interval = setInterval(() => {
      const tip = tips[index % tips.length];
      setWhisperTip(tip);
      setShowWhisper(true);
      
      // Speak the tip if voice enabled
      if (voiceEnabled) {
        speakGuidance(tip);
      }
      
      setTimeout(() => setShowWhisper(false), 3000);
      index++;
    }, 5000);

    return () => {
      clearInterval(interval);
      window.speechSynthesis?.cancel();
    };
  }, [guidance.realtimeGuidance, voiceEnabled]);

  // Announce capture moment
  useEffect(() => {
    if (guidance.captureNow && voiceEnabled) {
      speakGuidance("Perfect! Capture now for maximum viral potential!");
    }
  }, [guidance.captureNow, voiceEnabled]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Voice Toggle & AI Mode Switcher */}
      <div className="absolute top-20 left-4 pointer-events-auto flex gap-2">
        {/* Voice Toggle */}
        <button
          onClick={toggleVoice}
          className={`p-2 rounded-full transition-all ${
            voiceEnabled 
              ? 'bg-primary text-white shadow-[0_0_20px_rgba(98,0,238,0.6)] animate-pulse' 
              : 'bg-black/60 text-white/70 border border-white/20'
          } backdrop-blur-md`}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* AI Mode Switcher */}
        <div className="flex gap-2 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/20">
          {aiModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setCurrentMode(mode.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  currentMode === mode.id
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Icon className={`w-3 h-3 inline mr-1 ${currentMode === mode.id ? '' : mode.color}`} />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Orb Whisper Prompt - Floating purple-glow AI assistant */}
      {showWhisper && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="relative">
            {/* Glowing AI Orb */}
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary shadow-[0_0_40px_rgba(98,0,238,0.8)] animate-pulse flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            
            {/* Whisper Bubble */}
            <div className="bg-gradient-to-r from-primary/90 to-primary-glow/90 backdrop-blur-md rounded-full px-6 py-3 border border-white/30 shadow-[0_0_30px_rgba(98,0,238,0.6)] animate-fade-in ml-2">
              <p className="text-white font-semibold text-sm whitespace-nowrap">
                {whisperTip}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Capture Now Pulse */}
      {guidance.captureNow && (
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-green-500/90 backdrop-blur-md rounded-full px-8 py-4 border-2 border-white shadow-[0_0_40px_rgba(34,197,94,0.8)] animate-bounce">
            <p className="text-white font-bold text-lg whitespace-nowrap">
              🎯 CAPTURE NOW! Peak Viral Moment!
            </p>
          </div>
        </div>
      )}

      {/* Trending Category Selector with Stats */}
      <div className="absolute top-32 left-4 right-4 pointer-events-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {trendingCategories.map((cat) => (
            <Button
              key={cat.name}
              variant={currentCategory === cat.name ? "default" : "secondary"}
              size="sm"
              onClick={() => onCategoryChange(cat.name)}
              className="flex flex-col items-start gap-0.5 whitespace-nowrap bg-black/60 backdrop-blur-sm border border-white/20 h-auto py-2 px-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <span className="font-semibold">{cat.name}</span>
                {cat.score > 85 && <TrendingUp className="w-3 h-3 text-green-400 animate-bounce" />}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/60">
                <span>🔥 {cat.creators} creators</span>
                <span>⚡ {cat.challenges} challenges</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* AI Tips Panel */}
      <div className="absolute bottom-32 left-4 right-4 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-primary/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="font-semibold text-white">
              {currentMode === "viral" ? "Viral Coach" : currentMode === "creative" ? "Creative Guide" : "Brand Advisor"}
            </span>
            {guidance.trendingNow && (
              <Badge variant="secondary" className="ml-auto bg-green-500/20 text-green-300 border-green-500/30 animate-pulse">
                🔥 Trending
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {guidance.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-white/90 animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                <span className="text-primary">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frame Guidelines (rule of thirds) */}
      <div className="absolute inset-4 border-2 border-primary/20 rounded-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 right-0 h-px bg-primary/10" />
      <div className="absolute top-2/3 left-0 right-0 h-px bg-primary/10" />
      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-primary/10" />
      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-primary/10" />
    </div>
  );
}
