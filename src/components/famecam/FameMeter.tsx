import { TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface FameMeterProps {
  score: number; // 0-100
}

export default function FameMeter({ score }: FameMeterProps) {
  const [displayScore, setDisplayScore] = useState(score);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    // Animate score changes with pulsing effect
    if (score !== displayScore) {
      setIsPulsing(true);
      const interval = setInterval(() => {
        setDisplayScore(prev => {
          const diff = score - prev;
          if (Math.abs(diff) < 1) {
            setIsPulsing(false);
            return score;
          }
          return prev + diff / 5;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [score, displayScore]);

  const getScoreColor = () => {
    if (displayScore >= 80) return "text-green-400";
    if (displayScore >= 50) return "text-yellow-400";
    return "text-orange-400";
  };

  const getScoreLabel = () => {
    if (displayScore >= 80) return "Viral 🔥";
    if (displayScore >= 50) return "Good 👍";
    return "Average 📊";
  };

  const getPulseIntensity = () => {
    if (displayScore >= 80) return "animate-pulse";
    return "";
  };

  return (
    <div className={`bg-black/70 backdrop-blur-md rounded-2xl p-3 border border-primary/30 w-24 transition-all duration-300 ${isPulsing ? 'scale-110 shadow-[0_0_20px_rgba(98,0,238,0.5)]' : ''}`}>
      <div className="flex flex-col items-center gap-2">
        <TrendingUp className={`w-6 h-6 ${getScoreColor()} ${getPulseIntensity()} transition-all`} />
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor()} transition-all ${isPulsing ? 'scale-125' : ''}`}>
            {Math.round(displayScore)}
          </div>
          <div className="text-xs text-white/70">Fame</div>
        </div>
        <Progress value={displayScore} className="h-2 w-full" />
        <div className="text-[10px] text-white/60 text-center">
          {getScoreLabel()}
        </div>
        {/* Heartbeat indicator */}
        {isPulsing && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
        )}
      </div>
    </div>
  );
}
