import { Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AIGuidanceOverlayProps {
  guidance: {
    category: string;
    tips: string[];
    trendingNow: boolean;
  };
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}

const trendingCategories = [
  { name: "Dance", emoji: "💃", score: 95 },
  { name: "Food", emoji: "🍕", score: 88 },
  { name: "Fashion", emoji: "👗", score: 82 },
  { name: "Comedy", emoji: "😂", score: 90 },
  { name: "Fitness", emoji: "💪", score: 75 },
];

export default function AIGuidanceOverlay({
  guidance,
  currentCategory,
  onCategoryChange
}: AIGuidanceOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Trending Category Selector */}
      <div className="absolute top-24 left-4 right-4 pointer-events-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {trendingCategories.map((cat) => (
            <Button
              key={cat.name}
              variant={currentCategory === cat.name ? "default" : "secondary"}
              size="sm"
              onClick={() => onCategoryChange(cat.name)}
              className="flex items-center gap-2 whitespace-nowrap bg-black/60 backdrop-blur-sm border border-white/20"
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
              {cat.score > 85 && <TrendingUp className="w-3 h-3 text-green-400" />}
            </Button>
          ))}
        </div>
      </div>

      {/* AI Tips */}
      <div className="absolute bottom-32 left-4 right-4 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="font-semibold text-white">AI Viral Assistant</span>
            {guidance.trendingNow && (
              <Badge variant="secondary" className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">
                🔥 Trending
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {guidance.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-primary">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frame Guidelines (subtle) */}
      <div className="absolute inset-4 border-2 border-primary/20 rounded-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 w-1 h-1/3 bg-primary/10" />
      <div className="absolute top-1/2 left-1/3 w-1/3 h-1 bg-primary/10" />
    </div>
  );
}
