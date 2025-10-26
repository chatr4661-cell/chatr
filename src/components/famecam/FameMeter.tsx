import { TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FameMeterProps {
  score: number; // 0-100
}

export default function FameMeter({ score }: FameMeterProps) {
  const getScoreColor = () => {
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-orange-400";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Viral 🔥";
    if (score >= 50) return "Good 👍";
    return "Average 📊";
  };

  return (
    <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 border border-primary/30 w-24">
      <div className="flex flex-col items-center gap-2">
        <TrendingUp className={`w-6 h-6 ${getScoreColor()}`} />
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor()}`}>
            {score}
          </div>
          <div className="text-xs text-white/70">Fame</div>
        </div>
        <Progress value={score} className="h-2 w-full" />
        <div className="text-[10px] text-white/60 text-center">
          {getScoreLabel()}
        </div>
      </div>
    </div>
  );
}
