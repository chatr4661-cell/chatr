import { Sparkles, TrendingUp, Target, Palette, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface AIGuidanceOverlayProps {
  guidance: {
    category: string;
    tips: string[];
    trendingNow: boolean;
  };
  currentCategory: string;
  onCategoryChange: (category: string) => void;
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
  onCategoryChange
}: AIGuidanceOverlayProps) {
  const [currentMode, setCurrentMode] = useState<AIMode>("viral");
  const [whisperTip, setWhisperTip] = useState("");
  const [showWhisper, setShowWhisper] = useState(false);

  // Rotate whisper tips every 4 seconds
  useEffect(() => {
    const whispers = [
      "Perfect lighting 🔥 Keep that angle!",
      "Hold it! This pose is trending!",
      "You're nailing it! 💯",
      "This angle is fire 🔥",
      "Keep steady... almost there!",
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      setWhisperTip(whispers[index]);
      setShowWhisper(true);
      setTimeout(() => setShowWhisper(false), 3000);
      index = (index + 1) % whispers.length;
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* AI Mode Switcher */}
      <div className="absolute top-20 left-4 pointer-events-auto">
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

      {/* AI Whisper Prompt */}
      {showWhisper && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-gradient-to-r from-primary/90 to-primary-glow/90 backdrop-blur-md rounded-full px-6 py-3 border border-white/30 shadow-[0_0_30px_rgba(98,0,238,0.6)] animate-fade-in">
            <p className="text-white font-semibold text-sm whitespace-nowrap">
              {whisperTip}
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

      {/* AI Tips */}
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

      {/* Frame Guidelines (subtle) */}
      <div className="absolute inset-4 border-2 border-primary/20 rounded-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 left-1/2 w-1 h-1/3 bg-primary/10" />
      <div className="absolute top-1/2 left-1/3 w-1/3 h-1 bg-primary/10" />
    </div>
  );
}
