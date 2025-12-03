import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bike, Trophy, Zap, Flame, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AIMotorcycleRacingGameProps {
  level: number;
  onComplete: (score: number) => void;
  onExit: () => void;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: 'car' | 'oil' | 'cone';
}

const AIMotorcycleRacingGame: React.FC<AIMotorcycleRacingGameProps> = ({ level, onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'racing' | 'finished'>('ready');
  const [playerX, setPlayerX] = useState(50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nitroActive, setNitroActive] = useState(false);
  const [nitroCharge, setNitroCharge] = useState(100);
  const [lives, setLives] = useState(3);
  const [aiDifficulty, setAiDifficulty] = useState(1);

  const targetDistance = 150 + (level * 75);

  const handleMove = useCallback((clientX: number, containerWidth: number) => {
    if (gameState !== 'racing') return;
    const newX = (clientX / containerWidth) * 100;
    setPlayerX(Math.max(10, Math.min(90, newX)));
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'racing') return;

    const gameLoop = setInterval(() => {
      const speedMultiplier = nitroActive ? 2 : 1;
      
      setDistance(prev => {
        const newDistance = prev + (1 * speedMultiplier);
        if (newDistance >= targetDistance) {
          setGameState('finished');
          const finalScore = Math.floor(score + (lives * 150) + (level * 75));
          onComplete(finalScore);
        }
        return newDistance;
      });

      // AI adjusts difficulty based on player performance
      if (distance > 0 && distance % 50 === 0) {
        setAiDifficulty(prev => Math.min(prev + 0.1, 3));
      }

      setObstacles(prev => {
        const speed = (3 + level * 0.4) * speedMultiplier;
        const moved = prev.map(o => ({ ...o, y: o.y + speed }))
          .filter(o => o.y < 110);

        // AI-driven obstacle placement
        if (Math.random() < 0.04 * aiDifficulty) {
          const types: ('car' | 'oil' | 'cone')[] = ['car', 'oil', 'cone'];
          const aiX = playerX + (Math.random() - 0.5) * 40; // AI targets near player
          moved.push({
            id: Date.now(),
            x: Math.max(10, Math.min(90, aiX)),
            y: -10,
            type: types[Math.floor(Math.random() * types.length)]
          });
        }

        return moved;
      });

      // Collision detection
      obstacles.forEach(obstacle => {
        const hitbox = obstacle.type === 'car' ? 12 : 8;
        if (Math.abs(obstacle.x - playerX) < hitbox && obstacle.y > 70 && obstacle.y < 90) {
          if (obstacle.type === 'oil') {
            toast.warning('Oil slick! Speed reduced');
            setNitroActive(false);
          } else {
            setLives(l => {
              if (l <= 1) {
                setGameState('finished');
                onComplete(score);
                return 0;
              }
              toast.error('Crash! -1 Life');
              return l - 1;
            });
          }
          setObstacles(prev => prev.filter(o => o.id !== obstacle.id));
        }
      });

      // Nitro management
      if (nitroActive) {
        setNitroCharge(prev => Math.max(0, prev - 2));
        if (nitroCharge <= 0) setNitroActive(false);
      } else {
        setNitroCharge(prev => Math.min(100, prev + 0.5));
      }

      setScore(prev => prev + (1 * speedMultiplier));
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, playerX, level, score, lives, targetDistance, nitroActive, nitroCharge, aiDifficulty, distance, obstacles, onComplete]);

  const startGame = () => {
    setGameState('racing');
    setObstacles([]);
    setScore(0);
    setDistance(0);
    setLives(3);
    setNitroCharge(100);
    setAiDifficulty(1);
  };

  const activateNitro = () => {
    if (nitroCharge > 20) {
      setNitroActive(true);
      toast.success('🔥 NITRO!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-900 via-red-900 to-black p-4">
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

        <Card className="bg-black/40 border-orange-500/30 p-4 mb-4">
          <div className="flex justify-between text-white mb-2">
            <span>Level {level}</span>
            <span className="flex gap-1">
              {[...Array(lives)].map((_, i) => (
                <span key={i}>❤️</span>
              ))}
            </span>
          </div>
          <Progress value={(distance / targetDistance) * 100} className="h-2 mb-2" />
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <Progress value={nitroCharge} className="h-2 flex-1" />
          </div>
        </Card>

        {gameState === 'ready' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <Bike className="w-20 h-20 mx-auto text-orange-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">AI Motorcycle Racing</h2>
            <p className="text-gray-400 mb-6">
              AI learns your riding style and adapts! Swipe to steer, tap for nitro.
            </p>
            <Button onClick={startGame} className="bg-orange-600 hover:bg-orange-700">
              <Zap className="w-4 h-4 mr-2" /> Start Race
            </Button>
          </motion.div>
        )}

        {gameState === 'racing' && (
          <div 
            className="relative h-96 bg-gray-800 rounded-lg overflow-hidden border-2 border-orange-500/30"
            onMouseMove={(e) => handleMove(e.nativeEvent.offsetX, e.currentTarget.offsetWidth)}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              handleMove(touch.clientX - rect.left, rect.width);
            }}
          >
            {/* Road */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900">
              {/* Road markings */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-12 bg-yellow-400/50 left-1/2 -translate-x-1/2"
                  initial={{ y: -48 }}
                  animate={{ y: 400 }}
                  transition={{
                    duration: nitroActive ? 0.3 : 0.5,
                    repeat: Infinity,
                    delay: i * 0.06,
                    ease: 'linear'
                  }}
                  style={{ top: i * 50 - 48 }}
                />
              ))}
            </div>

            {/* Wind effect when nitro */}
            {nitroActive && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], y: 400 }}
                    transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
                    style={{ left: `${20 + i * 15}%` }}
                  >
                    <Wind className="w-6 h-6 text-white/30" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Obstacles */}
            <AnimatePresence>
              {obstacles.map(obstacle => (
                <motion.div
                  key={obstacle.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute"
                  style={{
                    left: `${obstacle.x}%`,
                    top: `${obstacle.y}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {obstacle.type === 'car' && (
                    <div className="w-10 h-14 bg-blue-600 rounded-t-lg">🚗</div>
                  )}
                  {obstacle.type === 'oil' && (
                    <div className="w-12 h-6 bg-black/80 rounded-full">🛢️</div>
                  )}
                  {obstacle.type === 'cone' && (
                    <div className="text-2xl">🚧</div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Player motorcycle */}
            <motion.div
              animate={{ left: `${playerX}%` }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="absolute bottom-12"
              style={{ transform: 'translateX(-50%)' }}
            >
              <div className={`text-4xl ${nitroActive ? 'animate-pulse' : ''}`}>
                🏍️
                {nitroActive && (
                  <motion.div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.2, repeat: Infinity }}
                  >
                    🔥
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Nitro button */}
            <Button
              onClick={activateNitro}
              disabled={nitroCharge < 20 || nitroActive}
              className="absolute bottom-4 right-4 bg-orange-600 hover:bg-orange-700"
            >
              <Flame className="w-6 h-6" />
            </Button>
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
              {lives > 0 ? 'Race Complete!' : 'Wipeout!'}
            </h2>
            <p className="text-3xl font-bold text-orange-400 mb-6">{score} points</p>
            <Button onClick={onExit} className="bg-orange-600 hover:bg-orange-700">
              Continue
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AIMotorcycleRacingGame;
