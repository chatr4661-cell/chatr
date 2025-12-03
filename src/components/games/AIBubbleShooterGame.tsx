import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Circle, Trophy, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AIBubbleShooterGameProps {
  level: number;
  onComplete: (score: number) => void;
  onExit: () => void;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  color: string;
  popping?: boolean;
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

const AIBubbleShooterGame: React.FC<AIBubbleShooterGameProps> = ({ level, onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [currentBubble, setCurrentBubble] = useState<string>(COLORS[0]);
  const [nextBubble, setNextBubble] = useState<string>(COLORS[1]);
  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(30 + level * 5);
  const [aiMessage, setAiMessage] = useState('');
  const [aimAngle, setAimAngle] = useState(90);

  const targetScore = 500 + (level * 200);

  const generateInitialBubbles = () => {
    const initialBubbles: Bubble[] = [];
    const rows = 4 + Math.floor(level / 3);
    
    for (let row = 0; row < rows; row++) {
      const cols = row % 2 === 0 ? 8 : 7;
      const offset = row % 2 === 0 ? 0 : 6;
      
      for (let col = 0; col < cols; col++) {
        // AI creates strategic patterns
        const colorIndex = (row + col + level) % COLORS.length;
        initialBubbles.push({
          id: row * 10 + col,
          x: offset + col * 12 + 6,
          y: row * 10 + 5,
          color: COLORS[colorIndex]
        });
      }
    }
    return initialBubbles;
  };

  const startGame = () => {
    setGameState('playing');
    setBubbles(generateInitialBubbles());
    setScore(0);
    setShotsLeft(30 + level * 5);
    setCurrentBubble(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setNextBubble(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setAiMessage('AI is analyzing the board...');
    setTimeout(() => setAiMessage(''), 2000);
  };

  const shoot = () => {
    if (gameState !== 'playing' || shotsLeft <= 0) return;

    const radians = (aimAngle * Math.PI) / 180;
    const targetX = 50 + Math.cos(radians) * 45;
    const targetY = Math.sin(radians) * 45;

    // Find nearest position
    const newBubble: Bubble = {
      id: Date.now(),
      x: Math.max(6, Math.min(94, targetX)),
      y: Math.max(5, Math.min(85, 95 - targetY)),
      color: currentBubble
    };

    setBubbles(prev => {
      const updated = [...prev, newBubble];
      
      // Check for matches
      const matches = findMatches(updated, newBubble);
      
      if (matches.length >= 3) {
        const points = matches.length * 10 * (level + 1);
        setScore(s => s + points);
        toast.success(`+${points} points!`);
        
        // AI reacts
        if (matches.length >= 5) {
          setAiMessage('🤖 Impressive combo! AI adapting...');
        }
        
        setTimeout(() => {
          setBubbles(b => b.filter(bubble => !matches.includes(bubble.id)));
          setAiMessage('');
        }, 300);
        
        return updated.map(b => matches.includes(b.id) ? { ...b, popping: true } : b);
      }
      
      return updated;
    });

    setShotsLeft(prev => prev - 1);
    setCurrentBubble(nextBubble);
    setNextBubble(COLORS[Math.floor(Math.random() * COLORS.length)]);

    // Check win/lose
    if (shotsLeft <= 1) {
      setTimeout(() => {
        setGameState('finished');
        onComplete(score);
      }, 500);
    }
  };

  const findMatches = (allBubbles: Bubble[], newBubble: Bubble): number[] => {
    const matches: number[] = [];
    const visited = new Set<number>();
    
    const checkNeighbors = (bubble: Bubble) => {
      if (visited.has(bubble.id)) return;
      visited.add(bubble.id);
      
      if (bubble.color === newBubble.color) {
        matches.push(bubble.id);
        
        allBubbles.forEach(other => {
          const dx = other.x - bubble.x;
          const dy = other.y - bubble.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 15 && !visited.has(other.id)) {
            checkNeighbors(other);
          }
        });
      }
    };
    
    checkNeighbors(newBubble);
    return matches;
  };

  useEffect(() => {
    if (score >= targetScore && gameState === 'playing') {
      setGameState('finished');
      onComplete(score + shotsLeft * 5);
    }
  }, [score, targetScore, gameState, shotsLeft, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onExit} className="text-white">
            ← Back
          </Button>
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>{score}/{targetScore}</span>
          </div>
        </div>

        <Card className="bg-black/40 border-purple-500/30 p-4 mb-4">
          <div className="flex justify-between text-white mb-2">
            <span>Level {level}</span>
            <span>Shots: {shotsLeft}</span>
          </div>
          <Progress value={(score / targetScore) * 100} className="h-2" />
        </Card>

        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-purple-300 text-sm mb-2"
          >
            {aiMessage}
          </motion.div>
        )}

        {gameState === 'ready' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <div className="flex justify-center gap-2 mb-4">
              {COLORS.map(color => (
                <motion.div
                  key={color}
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: color }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: COLORS.indexOf(color) * 0.1 }}
                />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">AI Bubble Shooter</h2>
            <p className="text-gray-400 mb-6">
              AI creates strategic bubble patterns. Match 3+ to pop!
            </p>
            <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-700">
              <Zap className="w-4 h-4 mr-2" /> Start Game
            </Button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <div className="relative h-96 bg-black/50 rounded-lg overflow-hidden border-2 border-purple-500/30">
            {/* Bubbles */}
            <AnimatePresence>
              {bubbles.map(bubble => (
                <motion.div
                  key={bubble.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: bubble.popping ? 0 : 1 }}
                  exit={{ scale: 0 }}
                  className="absolute w-8 h-8 rounded-full shadow-lg"
                  style={{
                    left: `${bubble.x}%`,
                    top: `${bubble.y}%`,
                    backgroundColor: bubble.color,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: `0 0 10px ${bubble.color}40`
                  }}
                />
              ))}
            </AnimatePresence>

            {/* Aim line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="50%"
                y1="95%"
                x2={`${50 + Math.cos((aimAngle * Math.PI) / 180) * 30}%`}
                y2={`${95 - Math.sin((aimAngle * Math.PI) / 180) * 30}%`}
                stroke="white"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />
            </svg>

            {/* Shooter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              <motion.div
                className="w-10 h-10 rounded-full shadow-lg cursor-pointer"
                style={{
                  backgroundColor: currentBubble,
                  boxShadow: `0 0 20px ${currentBubble}`
                }}
                onClick={shoot}
                whileTap={{ scale: 0.9 }}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Next:</span>
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: nextBubble }}
                />
              </div>
            </div>

            {/* Aim controls */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAimAngle(a => Math.min(170, a + 10))}
                className="text-white"
              >
                ← Aim
              </Button>
              <Button
                onClick={shoot}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Target className="w-4 h-4 mr-2" /> Shoot
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAimAngle(a => Math.max(10, a - 10))}
                className="text-white"
              >
                Aim →
              </Button>
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {score >= targetScore ? 'Level Complete!' : 'Game Over!'}
            </h2>
            <p className="text-3xl font-bold text-purple-400 mb-6">{score} points</p>
            <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-700">
              Continue
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AIBubbleShooterGame;
