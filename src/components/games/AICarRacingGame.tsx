import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Car, Trophy, Zap, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AICarRacingGameProps {
  level: number;
  onComplete: (score: number) => void;
  onExit: () => void;
}

interface Obstacle {
  id: number;
  lane: number;
  y: number;
}

const AICarRacingGame: React.FC<AICarRacingGameProps> = ({ level, onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'racing' | 'finished'>('ready');
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [aiPrediction, setAiPrediction] = useState<string>('');
  const [lives, setLives] = useState(3);

  const targetDistance = 100 + (level * 50);
  const obstacleSpeed = 2 + (level * 0.3);

  const moveLane = useCallback((direction: 'left' | 'right') => {
    if (gameState !== 'racing') return;
    setPlayerLane(prev => {
      if (direction === 'left' && prev > 0) return prev - 1;
      if (direction === 'right' && prev < 2) return prev + 1;
      return prev;
    });
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveLane('left');
      if (e.key === 'ArrowRight') moveLane('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLane]);

  useEffect(() => {
    if (gameState !== 'racing') return;

    const gameLoop = setInterval(() => {
      setDistance(prev => {
        const newDistance = prev + speed;
        if (newDistance >= targetDistance) {
          setGameState('finished');
          const finalScore = Math.floor(score + (lives * 100) + (level * 50));
          onComplete(finalScore);
        }
        return newDistance;
      });

      setObstacles(prev => {
        const moved = prev.map(o => ({ ...o, y: o.y + obstacleSpeed }))
          .filter(o => o.y < 100);

        // AI generates obstacles based on player behavior
        if (Math.random() < 0.03 + (level * 0.01)) {
          const aiLane = Math.floor(Math.random() * 3);
          moved.push({ id: Date.now(), lane: aiLane, y: 0 });
          
          // AI prediction
          if (aiLane === playerLane) {
            setAiPrediction('⚠️ Obstacle ahead!');
            setTimeout(() => setAiPrediction(''), 1000);
          }
        }

        return moved;
      });

      // Collision detection
      setObstacles(prev => {
        const collision = prev.find(o => o.lane === playerLane && o.y > 75 && o.y < 90);
        if (collision) {
          setLives(l => {
            if (l <= 1) {
              setGameState('finished');
              onComplete(score);
              return 0;
            }
            toast.error('Crash! -1 Life');
            return l - 1;
          });
          return prev.filter(o => o.id !== collision.id);
        }
        return prev;
      });

      setScore(prev => prev + speed);
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, playerLane, level, score, speed, lives, targetDistance, obstacleSpeed, onComplete]);

  const startGame = () => {
    setGameState('racing');
    setObstacles([]);
    setScore(0);
    setDistance(0);
    setLives(3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-black p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onExit} className="text-white">
            ← Back
          </Button>
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>{score}</span>
          </div>
        </div>

        <Card className="bg-black/40 border-cyan-500/30 p-4 mb-4">
          <div className="flex justify-between text-white mb-2">
            <span>Level {level}</span>
            <span className="flex gap-1">
              {[...Array(lives)].map((_, i) => (
                <span key={i}>❤️</span>
              ))}
            </span>
          </div>
          <Progress value={(distance / targetDistance) * 100} className="h-2" />
          <p className="text-xs text-gray-400 mt-1">{Math.floor(distance)}m / {targetDistance}m</p>
        </Card>

        {aiPrediction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-yellow-400 font-bold mb-2"
          >
            {aiPrediction}
          </motion.div>
        )}

        {gameState === 'ready' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <Car className="w-20 h-20 mx-auto text-cyan-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">AI Car Racing</h2>
            <p className="text-gray-400 mb-6">
              AI predicts your moves and places obstacles. Can you outsmart it?
            </p>
            <Button onClick={startGame} className="bg-cyan-600 hover:bg-cyan-700">
              <Zap className="w-4 h-4 mr-2" /> Start Race
            </Button>
          </motion.div>
        )}

        {gameState === 'racing' && (
          <div className="relative h-96 bg-gray-800 rounded-lg overflow-hidden border-2 border-cyan-500/30">
            {/* Road lanes */}
            <div className="absolute inset-0 flex">
              {[0, 1, 2].map(lane => (
                <div key={lane} className="flex-1 border-x border-dashed border-white/20" />
              ))}
            </div>

            {/* Road markings animation */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-8 bg-white/30 left-1/2 -translate-x-1/2"
                  initial={{ y: -32 }}
                  animate={{ y: 400 }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: 'linear'
                  }}
                  style={{ top: i * 40 - 40 }}
                />
              ))}
            </div>

            {/* Obstacles */}
            <AnimatePresence>
              {obstacles.map(obstacle => (
                <motion.div
                  key={obstacle.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute w-12 h-8 bg-red-500 rounded"
                  style={{
                    left: `${obstacle.lane * 33.33 + 10}%`,
                    top: `${obstacle.y}%`
                  }}
                >
                  <Car className="w-full h-full text-red-900" />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Player car */}
            <motion.div
              animate={{ left: `${playerLane * 33.33 + 10}%` }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="absolute bottom-8 w-12 h-16"
            >
              <div className="w-full h-full bg-cyan-500 rounded-t-lg shadow-lg shadow-cyan-500/50">
                <Car className="w-full h-full text-white p-1" />
              </div>
            </motion.div>

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between p-4">
              <Button
                variant="outline"
                size="lg"
                onTouchStart={() => moveLane('left')}
                onClick={() => moveLane('left')}
                className="bg-white/10 border-white/20"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onTouchStart={() => moveLane('right')}
                onClick={() => moveLane('right')}
                className="bg-white/10 border-white/20"
              >
                <ChevronRight className="w-8 h-8" />
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
              {lives > 0 ? 'Race Complete!' : 'Game Over!'}
            </h2>
            <p className="text-3xl font-bold text-cyan-400 mb-6">{score} points</p>
            <Button onClick={onExit} className="bg-cyan-600 hover:bg-cyan-700">
              Continue
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AICarRacingGame;
