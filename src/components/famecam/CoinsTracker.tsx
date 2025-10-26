import { Coins } from "lucide-react";

interface CoinsTrackerProps {
  coins: number;
}

export default function CoinsTracker({ coins }: CoinsTrackerProps) {
  return (
    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/30">
      <Coins className="w-4 h-4 text-yellow-400" />
      <span className="text-white font-semibold text-sm">{coins.toLocaleString()}</span>
    </div>
  );
}
