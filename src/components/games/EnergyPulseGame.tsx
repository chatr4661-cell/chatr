import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowLeft, Zap, Trophy, Play, Pause, Volume2, Star } from 'lucide-react';

interface EnergyPulseGameProps {
  onBack: () => void;
}

interface Beat {
  id: number;
  time: number;
  hit: 'perfect' | 'good' | 'miss' | null;
}

const THEMES = [
  { name: 'Cosmic', gradient: 'from-indigo-600 via-purple-600 to-pink-600', pulseColor: 'bg-purple-500' },
  { name: 'Ocean', gradient: 'from-cyan-500 via-blue-500 to-indigo-600', pulseColor: 'bg-cyan-400' },
  { name: 'Fire', gradient: 'from-yellow-500 via-orange-500 to-red-600', pulseColor: 'bg-orange-500' },
  { name: 'Forest', gradient: 'from-green-500 via-emerald-500 to-teal-600', pulseColor: 'bg-emerald-400' },
  { name: 'Neon', gradient: 'from-pink-500 via-fuchsia-500 to-purple-600', pulseColor: 'bg-fuchsia-400' },
];

export const EnergyPulseGame = ({ onBack }: EnergyPulseGameProps) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [goodHits, setGoodHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [bpm, setBpm] = useState(60);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [timeLeft, setTimeLeft] = useState(30);
  
  const gameLoopRef = useRef<number>();
  const lastBeatTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Calculate BPM and duration based on level
  const levelBpm = Math.min(60 + (currentLevel - 1) * 3, 180);
  const levelDuration = Math.min(30 + Math.floor(currentLevel / 5) * 5, 60);
  const perfectWindow = Math.max(200 - currentLevel * 3, 50); // ms

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const generateBeats = (bpmValue: number, duration: number) => {
    const intervalMs = (60 / bpmValue) * 1000;
    const totalBeats = Math.floor((duration * 1000) / intervalMs);
    return Array.from({ length: totalBeats }, (_, i) => ({
      id: i,
      time: i * intervalMs,
      hit: null as 'perfect' | 'good' | 'miss' | null,
    }));
  };

  const startGame = () => {
    const newBpm = levelBpm;
    const newBeats = generateBeats(newBpm, levelDuration);
    
    setBpm(newBpm);
    setBeats(newBeats);
    setCurrentBeatIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectHits(0);
    setGoodHits(0);
    setMisses(0);
    setTimeLeft(levelDuration);
    startTimeRef.current = performance.now();
    lastBeatTimeRef.current = 0;
    setGameState('playing');
    
    runGameLoop();
  };

  const runGameLoop = useCallback(() => {
    const loop = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const newTimeLeft = Math.max(0, levelDuration - Math.floor(elapsed / 1000));
      setTimeLeft(newTimeLeft);

      // Check for beats
      const beatInterval = (60 / levelBpm) * 1000;
      const expectedBeatTime = Math.floor(elapsed / beatInterval) * beatInterval;
      
      if (expectedBeatTime > lastBeatTimeRef.current) {
        lastBeatTimeRef.current = expectedBeatTime;
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 100);
        
        // Auto-miss if beat passed
        setBeats(prev => {
          const updated = [...prev];
          const currentBeat = updated.find(b => b.time <= elapsed && !b.hit);
          if (currentBeat && elapsed - currentBeat.time > perfectWindow * 2) {
            currentBeat.hit = 'miss';
            setMisses(m => m + 1);
            setCombo(0);
            setShowFeedback('MISS');
            setTimeout(() => setShowFeedback(null), 300);
          }
          return updated;
        });
      }

      if (newTimeLeft > 0) {
        gameLoopRef.current = requestAnimationFrame(loop);
      } else {
        endGame();
      }
    };
    
    gameLoopRef.current = requestAnimationFrame(loop);
  }, [levelBpm, levelDuration, perfectWindow]);

  const handleTap = () => {
    if (gameState !== 'playing') return;

    const elapsed = performance.now() - startTimeRef.current;
    const beatInterval = (60 / levelBpm) * 1000;
    const nearestBeatTime = Math.round(elapsed / beatInterval) * beatInterval;
    const timeDiff = Math.abs(elapsed - nearestBeatTime);

    setBeats(prev => {
      const updated = [...prev];
      const currentBeat = updated.find(b => Math.abs(b.time - nearestBeatTime) < beatInterval / 2 && !b.hit);
      
      if (currentBeat) {
        if (timeDiff <= perfectWindow) {
          currentBeat.hit = 'perfect';
          setPerfectHits(p => p + 1);
          setScore(s => s + 100 * (1 + combo * 0.1));
          setCombo(c => {
            const newCombo = c + 1;
            if (newCombo > maxCombo) setMaxCombo(newCombo);
            return newCombo;
          });
          setShowFeedback('PERFECT!');
        } else if (timeDiff <= perfectWindow * 2) {
          currentBeat.hit = 'good';
          setGoodHits(g => g + 1);
          setScore(s => s + 50 * (1 + combo * 0.05));
          setCombo(c => {
            const newCombo = c + 1;
            if (newCombo > maxCombo) setMaxCombo(newCombo);
            return newCombo;
          });
          setShowFeedback('GOOD');
        } else {
          currentBeat.hit = 'miss';
          setMisses(m => m + 1);
          setCombo(0);
          setShowFeedback('MISS');
        }
        setTimeout(() => setShowFeedback(null), 300);
      }
      
      return updated;
    });
  };

  const endGame = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    const finalScore = Math.floor(score);
    const earnedXp = Math.floor(finalScore / 10);
    const earnedCoins = Math.floor(finalScore / 50);
    
    setXp(prev => prev + earnedXp);
    setCoins(prev => prev + earnedCoins);
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
      toast.success('🎉 New High Score!');
    }
    
    if (xp + earnedXp >= currentLevel * 100) {
      setCurrentLevel(prev => Math.min(prev + 1, 50));
      toast.success(`⚡ Level Up! Now level ${currentLevel + 1}`);
    }
    
    setGameState('result');
  };

  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-cyan-500/20 border-cyan-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-cyan-400">{currentLevel}</p>
            <p className="text-xs text-white/60">Level</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/20 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{highScore}</p>
            <p className="text-xs text-white/60">Best</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/20 border-purple-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{xp}</p>
            <p className="text-xs text-white/60">XP</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/20 border-green-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{coins}</p>
            <p className="text-xs text-white/60">Coins</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Info */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-white/70 text-sm">Level {currentLevel}</span>
            <span className="text-cyan-400 text-sm">{levelBpm} BPM • {levelDuration}s</span>
          </div>
          <Progress value={(xp % 100) / currentLevel} className="h-2" />
        </CardContent>
      </Card>

      {/* Theme Selector */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3">Select Theme</h3>
          <div className="grid grid-cols-5 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => setSelectedTheme(theme)}
                className={`aspect-square rounded-lg bg-gradient-to-br ${theme.gradient} ${
                  selectedTheme.name === theme.name ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                title={theme.name}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Game Card */}
      <Card className={`bg-gradient-to-br ${selectedTheme.gradient} border-0 overflow-hidden`}>
        <CardContent className="p-8 text-center relative">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center"
          >
            <Zap className="h-12 w-12 text-white" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-2">Energy Pulse</h3>
          <p className="text-white/70 text-sm mb-6">
            Tap to the rhythm. Enter the flow state.
          </p>
          <Button
            onClick={startGame}
            size="lg"
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Pulse
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h4 className="text-white/70 text-sm mb-2">How to Play:</h4>
          <ul className="text-white/50 text-xs space-y-1">
            <li>• Tap anywhere on screen when the pulse hits</li>
            <li>• Perfect timing = maximum points</li>
            <li>• Build combos for score multipliers</li>
            <li>• Higher levels = faster BPM</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPlaying = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Score & Timer */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-white/50 text-xs">SCORE</p>
          <p className="text-2xl font-bold text-white">{Math.floor(score)}</p>
        </div>
        <div className="text-center">
          <p className="text-white/50 text-xs">COMBO</p>
          <p className="text-2xl font-bold text-yellow-400">{combo}x</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs">TIME</p>
          <p className="text-2xl font-bold text-white">{timeLeft}s</p>
        </div>
      </div>

      {/* Main Pulse Area */}
      <div 
        onClick={handleTap}
        className={`relative h-80 rounded-3xl bg-gradient-to-br ${selectedTheme.gradient} overflow-hidden cursor-pointer select-none`}
      >
        {/* Pulsing Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: isPulsing ? [1, 1.5, 1] : 1,
              opacity: isPulsing ? [1, 0.5, 1] : 0.3
            }}
            transition={{ duration: 0.2 }}
            className={`w-32 h-32 rounded-full ${selectedTheme.pulseColor} opacity-30`}
          />
          <motion.div
            animate={{ 
              scale: isPulsing ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.15 }}
            className={`absolute w-20 h-20 rounded-full ${selectedTheme.pulseColor}`}
          />
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              className={`absolute inset-0 flex items-center justify-center text-4xl font-black ${
                showFeedback === 'PERFECT!' ? 'text-yellow-300' :
                showFeedback === 'GOOD' ? 'text-green-300' :
                'text-red-400'
              }`}
            >
              {showFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap instruction */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-white/50 text-sm">TAP TO THE BEAT</p>
        </div>
      </div>

      {/* Progress */}
      <Progress value={(1 - timeLeft / levelDuration) * 100} className="h-2" />
    </motion.div>
  );

  const renderResult = () => {
    const totalBeats = perfectHits + goodHits + misses;
    const accuracy = totalBeats > 0 ? Math.round(((perfectHits + goodHits * 0.5) / totalBeats) * 100) : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <div className={`py-8 rounded-2xl bg-gradient-to-br ${selectedTheme.gradient} border-0`}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="text-7xl mb-4"
          >
            ⚡
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Flow Complete!</h2>
          <p className="text-6xl font-black text-white">{Math.floor(score)}</p>
          <p className="text-white/70">Points</p>
        </div>

        {/* Stats */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-yellow-400 text-2xl font-bold">{perfectHits}</p>
                <p className="text-white/50 text-xs">Perfect</p>
              </div>
              <div>
                <p className="text-green-400 text-2xl font-bold">{goodHits}</p>
                <p className="text-white/50 text-xs">Good</p>
              </div>
              <div>
                <p className="text-red-400 text-2xl font-bold">{misses}</p>
                <p className="text-white/50 text-xs">Miss</p>
              </div>
              <div>
                <p className="text-purple-400 text-2xl font-bold">{maxCombo}x</p>
                <p className="text-white/50 text-xs">Max Combo</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-white/50 text-xs mb-1">Accuracy</p>
              <Progress value={accuracy} className="h-2" />
              <p className="text-white text-sm mt-1">{accuracy}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Rewards */}
        <div className="flex justify-center gap-4">
          <Badge className="bg-purple-500/30 text-purple-300">
            +{Math.floor(score / 10)} XP
          </Badge>
          <Badge className="bg-yellow-500/30 text-yellow-300">
            +{Math.floor(score / 50)} Coins
          </Badge>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setGameState('menu')}
            variant="outline"
            className="flex-1 border-white/20 text-white"
          >
            Back to Menu
          </Button>
          <Button
            onClick={startGame}
            className={`flex-1 bg-gradient-to-r ${selectedTheme.gradient}`}
          >
            Play Again
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            Energy Pulse
          </h1>
          <Badge className="bg-cyan-500/30 text-cyan-300">
            Lv.{currentLevel}
          </Badge>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {gameState === 'menu' && renderMenu()}
          {gameState === 'playing' && renderPlaying()}
          {gameState === 'result' && renderResult()}
        </AnimatePresence>
      </main>
    </div>
  );
};
