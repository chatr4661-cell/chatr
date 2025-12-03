import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, Flame, Eye, ThumbsUp, ThumbsDown, Zap, Trophy, Coins, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SocialStormGameProps {
  onBack: () => void;
}

const mockTrends = [
  { id: 1, title: "Cat learns to open fridge", category: "Pets", currentViews: 12500, thumbnail: "🐱", timePosted: "2h ago" },
  { id: 2, title: "New dance challenge #FlipIt", category: "Dance", currentViews: 8700, thumbnail: "💃", timePosted: "4h ago" },
  { id: 3, title: "AI writes a love song", category: "Tech", currentViews: 5200, thumbnail: "🤖", timePosted: "1h ago" },
  { id: 4, title: "Street food in Tokyo", category: "Food", currentViews: 22000, thumbnail: "🍜", timePosted: "6h ago" },
  { id: 5, title: "Impossible basketball trick", category: "Sports", currentViews: 45000, thumbnail: "🏀", timePosted: "3h ago" },
  { id: 6, title: "Baby's first words are meme", category: "Funny", currentViews: 3400, thumbnail: "👶", timePosted: "30m ago" },
];

export function SocialStormGame({ onBack }: SocialStormGameProps) {
  const [currentTrend, setCurrentTrend] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [prediction, setPrediction] = useState<'viral' | 'flop' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameActive, setGameActive] = useState(true);

  const trend = mockTrends[currentTrend % mockTrends.length];

  useEffect(() => {
    if (gameActive && !showResult && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      makePrediction('flop');
    }
  }, [timeLeft, gameActive, showResult]);

  const makePrediction = (pred: 'viral' | 'flop') => {
    setPrediction(pred);
    setShowResult(true);

    // Simulate outcome (random for demo)
    const isViral = Math.random() > 0.5;
    const correct = (pred === 'viral' && isViral) || (pred === 'flop' && !isViral);

    setTimeout(() => {
      if (correct) {
        setStreak(prev => prev + 1);
        setScore(prev => prev + 100 * (streak + 1));
        setCoins(prev => prev + 25 * level);
      } else {
        setStreak(0);
      }
      
      setTimeout(() => {
        setShowResult(false);
        setPrediction(null);
        setCurrentTrend(prev => prev + 1);
        setTimeLeft(10);
      }, 2000);
    }, 1500);
  };

  const viralChance = Math.min(95, Math.max(5, (trend.currentViews / 1000) + Math.random() * 30));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/30 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        {/* Trending arrows */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-orange-500/20"
            initial={{ x: Math.random() * window.innerWidth, y: window.innerHeight }}
            animate={{ y: -100 }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
          >
            <TrendingUp className="w-8 h-8" />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-orange-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-400" />
                  SocialStorm
                </h1>
                <p className="text-xs text-orange-300/70">Predict the viral future</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                🔥 {streak} streak
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Trophy className="h-3 w-3 mr-1" /> {score}
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                <Coins className="h-3 w-3 mr-1" /> {coins}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Game Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Timer */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-300/70 text-sm flex items-center gap-1">
              <Timer className="w-4 h-4" /> Time to decide
            </span>
            <span className={`font-bold ${timeLeft <= 3 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
          </div>
          <Progress value={(timeLeft / 10) * 100} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrend}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-orange-500/30 overflow-hidden">
              <CardContent className="p-0">
                {/* Trend Preview */}
                <div className="relative aspect-video bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-8xl"
                  >
                    {trend.thumbnail}
                  </motion.span>
                  <Badge className="absolute top-4 left-4 bg-black/50 text-white">
                    {trend.category}
                  </Badge>
                  <Badge className="absolute top-4 right-4 bg-black/50 text-white">
                    {trend.timePosted}
                  </Badge>
                </div>

                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-2">{trend.title}</h2>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-1 text-orange-300">
                      <Eye className="w-4 h-4" />
                      <span>{trend.currentViews.toLocaleString()} views</span>
                    </div>
                    <div className="text-white/50">•</div>
                    <div className="text-white/70">
                      Viral probability: <span className="text-orange-400 font-bold">{viralChance.toFixed(0)}%</span>
                    </div>
                  </div>

                  {!showResult ? (
                    <div className="flex gap-4">
                      <Button
                        onClick={() => makePrediction('viral')}
                        className="flex-1 py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg"
                      >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        VIRAL 🚀
                      </Button>
                      <Button
                        onClick={() => makePrediction('flop')}
                        className="flex-1 py-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-lg"
                      >
                        <ThumbsDown className="w-5 h-5 mr-2" />
                        FLOP 📉
                      </Button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-center py-4"
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className="text-6xl mb-4"
                      >
                        {prediction === 'viral' ? '🚀' : '📉'}
                      </motion.div>
                      <p className="text-white text-xl font-bold">
                        You predicted: {prediction === 'viral' ? 'VIRAL!' : 'FLOP!'}
                      </p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{currentTrend + 1}</p>
              <p className="text-white/50 text-sm">Predictions</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-400">{Math.round(score / Math.max(1, currentTrend + 1))}%</p>
              <p className="text-white/50 text-sm">Accuracy</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{streak}</p>
              <p className="text-white/50 text-sm">Best Streak</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
