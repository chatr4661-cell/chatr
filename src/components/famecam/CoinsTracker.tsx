import { Coins } from "lucide-react";
import { useEffect, useState } from "react";

interface CoinsTrackerProps {
  coins: number;
}

export default function CoinsTracker({ coins }: CoinsTrackerProps) {
  const [displayCoins, setDisplayCoins] = useState(coins);
  const [showFlash, setShowFlash] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);

  useEffect(() => {
    if (coins > displayCoins) {
      const earned = coins - displayCoins;
      setEarnedAmount(earned);
      setShowFlash(true);
      
      // Animate coin count
      const duration = 1000;
      const steps = 20;
      const increment = earned / steps;
      let current = displayCoins;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= coins) {
          setDisplayCoins(coins);
          clearInterval(interval);
        } else {
          setDisplayCoins(Math.floor(current));
        }
      }, duration / steps);

      // Hide flash after animation
      setTimeout(() => setShowFlash(false), 2000);
      
      return () => clearInterval(interval);
    } else {
      setDisplayCoins(coins);
    }
  }, [coins]);

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/30 transition-all ${showFlash ? 'scale-110 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : ''}`}>
        <Coins className={`w-4 h-4 text-yellow-400 ${showFlash ? 'animate-spin' : ''}`} />
        <span className="text-white font-semibold text-sm">{displayCoins.toLocaleString()}</span>
      </div>
      
      {/* Coin Earn Flash */}
      {showFlash && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-fade-in pointer-events-none">
          <div className="bg-yellow-400 text-black font-bold px-3 py-1 rounded-full text-xs whitespace-nowrap shadow-lg">
            +{earnedAmount} FameCoins 🪙
          </div>
        </div>
      )}
    </div>
  );
}
