import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, Trophy, Clock, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Circle } from 'lucide-react';

interface MirrorMatchGameProps {
  level: number;
  onComplete: (score: number) => void;
  onBack: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right' | 'tap';

const MirrorMatchGame = ({ level, onComplete, onBack }: MirrorMatchGameProps) => {
  const [gameState, setGameState] = useState<'waiting' | 'watch' | 'mirror' | 'result'>('waiting');
  const [pattern, setPattern] = useState<Direction[]>([]);
  const [playerPattern, setPlayerPattern] = useState<Direction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [showingPattern, setShowingPattern] = useState(false);
  const [partnerSync, setPartnerSync] = useState(0);

  const generatePattern = useCallback(() => {
    const directions: Direction[] = ['up', 'down', 'left', 'right', 'tap'];
    const patternLength = Math.min(3 + level + round, 10);
    const newPattern: Direction[] = [];
    for (let i = 0; i < patternLength; i++) {
      newPattern.push(directions[Math.floor(Math.random() * directions.length)]);
    }
    return newPattern;
  }, [level, round]);

  const startRound = () => {
    const newPattern = generatePattern();
    setPattern(newPattern);
    setPlayerPattern([]);
    setCurrentIndex(0);
    setGameState('watch');
    setShowingPattern(true);

    // Show pattern one by one
    newPattern.forEach((_, i) => {
      setTimeout(() => {
        setCurrentIndex(i);
      }, i * 800);
    });

    // After showing, switch to mirror mode
    setTimeout(() => {
      setShowingPattern(false);
      setCurrentIndex(0);
      setGameState('mirror');
    }, newPattern.length * 800 + 500);
  };

  const handleInput = (direction: Direction) => {
    if (gameState !== 'mirror') return;

    const newPlayerPattern = [...playerPattern, direction];
    setPlayerPattern(newPlayerPattern);

    if (direction !== pattern[playerPattern.length]) {
      // Wrong input
      endRound(false);
      return;
    }

    if (newPlayerPattern.length === pattern.length) {
      // Completed pattern
      endRound(true);
    }
  };

  const endRound = (success: boolean) => {
    const roundScore = success ? pattern.length * 100 + level * 50 : 0;
    const syncBonus = Math.floor(Math.random() * 30) + 70; // Simulated partner sync
    setPartnerSync(syncBonus);
    setScore(prev => prev + roundScore);

    if (round >= 5 || !success) {
      setGameState('result');
    } else {
      setTimeout(() => {
        setRound(round + 1);
        startRound();
      }, 1500);
    }
  };

  const DirectionIcon = ({ dir, active }: { dir: Direction; active: boolean }) => {
    const icons = {
      up: ArrowUp,
      down: ArrowDown,
      left: ArrowLeft,
      right: ArrowRight,
      tap: Circle
    };
    const Icon = icons[dir];
    return (
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${active ? 'bg-pink-500 scale-110' : 'bg-white/10'}`}>
        <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${active ? 'text-white' : 'text-white/50'}`} />
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-pink-950 via-rose-900 to-red-950 p-3 sm:p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="max-w-lg mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70 px-2 sm:px-3 h-8 sm:h-10 text-sm touch-manipulation">
            ← Back
          </Button>
          <Badge className="bg-pink-500/30 text-pink-200 text-[10px] sm:text-xs px-2 sm:px-3">
            Level {level} • Round {round}/5
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex-1 flex flex-col">
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
              <Copy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">MirrorMatch</h2>
            <p className="text-white/60 text-xs sm:text-sm">Mirror your partner's moves perfectly!</p>
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-pink-500/30 animate-pulse" />
                <Copy className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500/30 animate-pulse" />
              </div>
              <p className="text-white/70 text-sm sm:text-base px-2">Watch the pattern, then mirror it together!</p>
              <Button onClick={startRound} className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-sm sm:text-base touch-manipulation">
                Start Matching
              </Button>
            </div>
          )}

          {gameState === 'watch' && (
            <div className="text-center space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center">
              <Badge className="bg-yellow-500/30 text-yellow-200 mb-3 sm:mb-4 text-[10px] sm:text-xs mx-auto">
                Watch the Pattern!
              </Badge>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[200px] sm:max-w-xs mx-auto">
                <div />
                <DirectionIcon dir="up" active={showingPattern && pattern[currentIndex] === 'up'} />
                <div />
                <DirectionIcon dir="left" active={showingPattern && pattern[currentIndex] === 'left'} />
                <DirectionIcon dir="tap" active={showingPattern && pattern[currentIndex] === 'tap'} />
                <DirectionIcon dir="right" active={showingPattern && pattern[currentIndex] === 'right'} />
                <div />
                <DirectionIcon dir="down" active={showingPattern && pattern[currentIndex] === 'down'} />
                <div />
              </div>
              <p className="text-white/60 text-xs sm:text-sm">Pattern: {currentIndex + 1}/{pattern.length}</p>
            </div>
          )}

          {gameState === 'mirror' && (
            <div className="text-center space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center">
              <Badge className="bg-green-500/30 text-green-200 mb-3 sm:mb-4 text-[10px] sm:text-xs mx-auto">
                Your Turn! ({playerPattern.length}/{pattern.length})
              </Badge>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[200px] sm:max-w-xs mx-auto">
                <div />
                <Button 
                  onClick={() => handleInput('up')}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-pink-500 active:bg-pink-600 transition-all touch-manipulation h-auto"
                >
                  <ArrowUp className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
                <div />
                <Button 
                  onClick={() => handleInput('left')}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-pink-500 active:bg-pink-600 transition-all touch-manipulation h-auto"
                >
                  <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
                <Button 
                  onClick={() => handleInput('tap')}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-pink-500 active:bg-pink-600 transition-all touch-manipulation h-auto"
                >
                  <Circle className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
                <Button 
                  onClick={() => handleInput('right')}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-pink-500 active:bg-pink-600 transition-all touch-manipulation h-auto"
                >
                  <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
                <div />
                <Button 
                  onClick={() => handleInput('down')}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-pink-500 active:bg-pink-600 transition-all touch-manipulation h-auto"
                >
                  <ArrowDown className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
                <div />
              </div>
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">{score}</div>
              <p className="text-white/60 text-sm sm:text-base">Points Earned</p>
              <div className="bg-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <p className="text-white/60 text-xs sm:text-sm mb-1">Partner Sync</p>
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                  <span className="text-xl sm:text-2xl font-bold text-pink-400">{partnerSync}%</span>
                </div>
              </div>
              <Button onClick={() => onComplete(score)} className="bg-gradient-to-r from-pink-500 to-red-500 px-6 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-sm sm:text-base touch-manipulation">
                Complete Level
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MirrorMatchGame;
