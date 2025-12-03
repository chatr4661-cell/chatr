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
      <div className={`p-4 rounded-2xl transition-all ${active ? 'bg-pink-500 scale-110' : 'bg-white/10'}`}>
        <Icon className={`w-8 h-8 ${active ? 'text-white' : 'text-white/50'}`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-950 via-rose-900 to-red-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70">
            ← Back
          </Button>
          <Badge className="bg-pink-500/30 text-pink-200">
            Level {level} • Round {round}/5
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6 rounded-3xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
              <Copy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">MirrorMatch</h2>
            <p className="text-white/60 text-sm">Mirror your partner's moves perfectly!</p>
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-pink-500/30 animate-pulse" />
                <Copy className="w-6 h-6 text-pink-400" />
                <div className="w-16 h-16 rounded-full bg-red-500/30 animate-pulse" />
              </div>
              <p className="text-white/70">Watch the pattern, then mirror it together!</p>
              <Button onClick={startRound} className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-8 py-6 rounded-2xl">
                Start Matching
              </Button>
            </div>
          )}

          {gameState === 'watch' && (
            <div className="text-center space-y-4">
              <Badge className="bg-yellow-500/30 text-yellow-200 mb-4">
                Watch the Pattern!
              </Badge>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
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
              <p className="text-white/60 text-sm">Pattern: {currentIndex + 1}/{pattern.length}</p>
            </div>
          )}

          {gameState === 'mirror' && (
            <div className="text-center space-y-4">
              <Badge className="bg-green-500/30 text-green-200 mb-4">
                Your Turn! ({playerPattern.length}/{pattern.length})
              </Badge>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <div />
                <Button 
                  onClick={() => handleInput('up')}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-pink-500 transition-all"
                >
                  <ArrowUp className="w-8 h-8" />
                </Button>
                <div />
                <Button 
                  onClick={() => handleInput('left')}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-pink-500 transition-all"
                >
                  <ArrowLeft className="w-8 h-8" />
                </Button>
                <Button 
                  onClick={() => handleInput('tap')}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-pink-500 transition-all"
                >
                  <Circle className="w-8 h-8" />
                </Button>
                <Button 
                  onClick={() => handleInput('right')}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-pink-500 transition-all"
                >
                  <ArrowRight className="w-8 h-8" />
                </Button>
                <div />
                <Button 
                  onClick={() => handleInput('down')}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-pink-500 transition-all"
                >
                  <ArrowDown className="w-8 h-8" />
                </Button>
                <div />
              </div>
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-white mb-2">{score}</div>
              <p className="text-white/60">Points Earned</p>
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-sm mb-1">Partner Sync</p>
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5 text-pink-400" />
                  <span className="text-2xl font-bold text-pink-400">{partnerSync}%</span>
                </div>
              </div>
              <Button onClick={() => onComplete(score)} className="bg-gradient-to-r from-pink-500 to-red-500 px-8 py-6 rounded-2xl">
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
