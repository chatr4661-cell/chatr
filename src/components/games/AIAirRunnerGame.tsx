import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Plane, Zap, Shield, Snowflake, Sparkles, Coins, 
  Heart, Trophy, Play, Volume2, VolumeX, ChevronLeft,
  ChevronRight, ChevronUp, ChevronDown, Mic, MicOff
} from 'lucide-react';

interface AIAirRunnerGameProps {
  level: number;
  onComplete: (score: number) => void;
  onExit: () => void;
}

interface Obstacle {
  id: string;
  lane: number;
  y: number;
  type: 'drone' | 'laser' | 'meteor' | 'vortex' | 'mine' | 'wall';
  width: number;
  height: number;
}

interface Collectible {
  id: string;
  lane: number;
  y: number;
  type: 'coin' | 'crystal' | 'boost' | 'shield' | 'timeShard' | 'aiCore';
}

interface World {
  name: string;
  gradient: string;
  particleColor: string;
  obstacleColor: string;
}

const WORLDS: World[] = [
  { name: 'Cyber City Skies', gradient: 'from-purple-900 via-blue-900 to-cyan-900', particleColor: '#00ffff', obstacleColor: '#ff00ff' },
  { name: 'Floating Temples', gradient: 'from-amber-900 via-orange-800 to-red-900', particleColor: '#ffd700', obstacleColor: '#ff6b35' },
  { name: 'Star Tunnel', gradient: 'from-indigo-950 via-purple-950 to-black', particleColor: '#ffffff', obstacleColor: '#8b5cf6' },
  { name: 'Storm Zone', gradient: 'from-slate-900 via-gray-800 to-zinc-900', particleColor: '#60a5fa', obstacleColor: '#fbbf24' },
  { name: 'Cloud Forest', gradient: 'from-emerald-900 via-teal-800 to-cyan-900', particleColor: '#34d399', obstacleColor: '#14b8a6' },
  { name: 'Crystal Skydomes', gradient: 'from-pink-900 via-fuchsia-900 to-violet-900', particleColor: '#f0abfc', obstacleColor: '#e879f9' },
  { name: 'AI Lab Sky', gradient: 'from-slate-950 via-blue-950 to-indigo-950', particleColor: '#22d3ee', obstacleColor: '#06b6d4' },
];

const PLANE_EVOLUTIONS = [
  { name: 'Starter Jet', color: '#60a5fa', speed: 1, shield: 1 },
  { name: 'Fighter Jet', color: '#f43f5e', speed: 1.3, shield: 0.8 },
  { name: 'Glider Jet', color: '#34d399', speed: 0.9, shield: 1.2 },
  { name: 'Stunt Plane', color: '#fbbf24', speed: 1.5, shield: 0.6 },
  { name: 'Armored Jet', color: '#a855f7', speed: 0.8, shield: 1.5 },
];

export function AIAirRunnerGame({ level, onComplete, onExit }: AIAirRunnerGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [aiCores, setAiCores] = useState(0);
  const [lives, setLives] = useState(3);
  const [lane, setLane] = useState(1); // 0, 1, 2 (left, center, right)
  const [altitude, setAltitude] = useState(1); // 0, 1, 2 (low, mid, high)
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [currentWorld, setCurrentWorld] = useState(0);
  const [worldTransition, setWorldTransition] = useState(false);
  const [planeEvolution, setPlaneEvolution] = useState(0);
  const [boostActive, setBoostActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [freezeActive, setFreezeActive] = useState(false);
  const [boostMeter, setBoostMeter] = useState(100);
  const [shieldMeter, setShieldMeter] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [particles, setParticles] = useState<{ id: string; x: number; y: number; size: number }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [lastCollectTime, setLastCollectTime] = useState(0);
  
  const gameRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('airrunner_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // World transition every 30-60 seconds
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const worldInterval = setInterval(() => {
      setWorldTransition(true);
      setTimeout(() => {
        setCurrentWorld(prev => (prev + 1) % WORLDS.length);
        setWorldTransition(false);
        toast.success(`Entering ${WORLDS[(currentWorld + 1) % WORLDS.length].name}!`);
      }, 1500);
    }, 30000 + Math.random() * 30000);

    return () => clearInterval(worldInterval);
  }, [gameState, currentWorld]);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      const currentSpeed = freezeActive ? speed * 0.3 : (boostActive ? speed * 2 : speed);
      
      // Update distance and score
      setDistance(prev => prev + currentSpeed * 10);
      setScore(prev => prev + Math.floor(currentSpeed * comboMultiplier));

      // Increase speed over time
      setSpeed(prev => Math.min(prev + 0.001, 3));

      // Decrease boost meter when active
      if (boostActive) {
        setBoostMeter(prev => {
          if (prev <= 0) {
            setBoostActive(false);
            return 0;
          }
          return prev - 2;
        });
      } else {
        setBoostMeter(prev => Math.min(prev + 0.5, 100));
      }

      // Decrease shield duration
      if (shieldActive) {
        setShieldMeter(prev => {
          if (prev <= 0) {
            setShieldActive(false);
            return 0;
          }
          return prev - 1;
        });
      }

      // Decrease freeze duration
      if (freezeActive) {
        setTimeout(() => setFreezeActive(false), 3000);
      }

      // Decay combo multiplier
      if (Date.now() - lastCollectTime > 2000) {
        setComboMultiplier(1);
      }

      // Move obstacles
      setObstacles(prev => {
        const moved = prev.map(obs => ({ ...obs, y: obs.y + currentSpeed * 8 }))
          .filter(obs => obs.y < 600);

        // Spawn new obstacles
        if (Math.random() < 0.03 + (level * 0.005)) {
          const types: Obstacle['type'][] = ['drone', 'laser', 'meteor', 'vortex', 'mine', 'wall'];
          moved.push({
            id: `obs_${Date.now()}_${Math.random()}`,
            lane: Math.floor(Math.random() * 3),
            y: -100,
            type: types[Math.floor(Math.random() * types.length)],
            width: 60 + Math.random() * 40,
            height: 40 + Math.random() * 30,
          });
        }

        return moved;
      });

      // Move collectibles
      setCollectibles(prev => {
        const moved = prev.map(col => ({ ...col, y: col.y + currentSpeed * 8 }))
          .filter(col => col.y < 600);

        // Spawn new collectibles
        if (Math.random() < 0.02) {
          const types: Collectible['type'][] = ['coin', 'coin', 'coin', 'crystal', 'boost', 'shield', 'timeShard', 'aiCore'];
          const weights = [0.4, 0.4, 0.4, 0.15, 0.1, 0.08, 0.05, 0.02];
          const rand = Math.random();
          let cumulative = 0;
          let selectedType: Collectible['type'] = 'coin';
          for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative) {
              selectedType = types[i];
              break;
            }
          }

          moved.push({
            id: `col_${Date.now()}_${Math.random()}`,
            lane: Math.floor(Math.random() * 3),
            y: -50,
            type: selectedType,
          });
        }

        return moved;
      });

      // Generate particles
      if (Math.random() < 0.3) {
        setParticles(prev => [
          ...prev.slice(-50),
          {
            id: `p_${Date.now()}_${Math.random()}`,
            x: Math.random() * 100,
            y: -10,
            size: 2 + Math.random() * 4,
          }
        ]);
      }

      // Move particles
      setParticles(prev => 
        prev.map(p => ({ ...p, y: p.y + currentSpeed * 5 }))
          .filter(p => p.y < 110)
      );

      // Check collisions with obstacles
      obstacles.forEach(obs => {
        const obsLane = obs.lane;
        const obsY = obs.y;
        
        if (obsLane === lane && obsY > 400 && obsY < 500) {
          if (!shieldActive) {
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                endGame();
              } else {
                toast.error('Hit! Lives remaining: ' + newLives);
              }
              return newLives;
            });
            setObstacles(prev => prev.filter(o => o.id !== obs.id));
          } else {
            toast.success('Shield blocked!');
            setObstacles(prev => prev.filter(o => o.id !== obs.id));
          }
        }
      });

      // Check collisions with collectibles
      collectibles.forEach(col => {
        const colLane = col.lane;
        const colY = col.y;
        
        if (colLane === lane && colY > 400 && colY < 500) {
          setCollectibles(prev => prev.filter(c => c.id !== col.id));
          setLastCollectTime(Date.now());
          setComboMultiplier(prev => Math.min(prev + 0.5, 5));

          switch (col.type) {
            case 'coin':
              setCoins(prev => prev + 10 * comboMultiplier);
              break;
            case 'crystal':
              setCoins(prev => prev + 50 * comboMultiplier);
              setScore(prev => prev + 100);
              break;
            case 'boost':
              setBoostMeter(100);
              toast.success('Boost Recharged!');
              break;
            case 'shield':
              setShieldMeter(100);
              setShieldActive(true);
              toast.success('Shield Activated!');
              break;
            case 'timeShard':
              setFreezeActive(true);
              toast.success('Time Freeze!');
              break;
            case 'aiCore':
              setAiCores(prev => prev + 1);
              if (aiCores > 0 && aiCores % 5 === 0) {
                setPlaneEvolution(prev => Math.min(prev + 1, PLANE_EVOLUTIONS.length - 1));
                toast.success(`Plane Evolved: ${PLANE_EVOLUTIONS[Math.min(planeEvolution + 1, PLANE_EVOLUTIONS.length - 1)].name}!`);
              }
              break;
          }
        }
      });

    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, lane, speed, boostActive, shieldActive, freezeActive, obstacles, collectibles, level, comboMultiplier, lastCollectTime, aiCores, planeEvolution]);

  // Touch/Swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    const minSwipe = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > minSwipe) {
        changeLane(1);
      } else if (deltaX < -minSwipe) {
        changeLane(-1);
      }
    } else {
      if (deltaY > minSwipe) {
        changeAltitude(-1);
      } else if (deltaY < -minSwipe) {
        changeAltitude(1);
      }
    }
    
    touchStartRef.current = null;
  };

  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          changeLane(-1);
          break;
        case 'ArrowRight':
        case 'd':
          changeLane(1);
          break;
        case 'ArrowUp':
        case 'w':
          changeAltitude(1);
          break;
        case 'ArrowDown':
        case 's':
          changeAltitude(-1);
          break;
        case ' ':
          activateBoost();
          break;
        case 'Escape':
          setGameState('paused');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const changeLane = useCallback((direction: number) => {
    setLane(prev => Math.max(0, Math.min(2, prev + direction)));
  }, []);

  const changeAltitude = useCallback((direction: number) => {
    setAltitude(prev => Math.max(0, Math.min(2, prev + direction)));
  }, []);

  const activateBoost = useCallback(() => {
    if (boostMeter > 20 && !boostActive) {
      setBoostActive(true);
      toast.success('BOOST!');
    }
  }, [boostMeter, boostActive]);

  const activateShield = useCallback(() => {
    if (shieldMeter > 0 || coins >= 50) {
      setShieldActive(true);
      setShieldMeter(100);
      if (shieldMeter <= 0) setCoins(prev => prev - 50);
      toast.success('SHIELD!');
    }
  }, [shieldMeter, coins]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setCoins(0);
    setLives(3);
    setLane(1);
    setAltitude(1);
    setObstacles([]);
    setCollectibles([]);
    setSpeed(1 + level * 0.1);
    setBoostMeter(100);
    setShieldMeter(0);
    setComboMultiplier(1);
  };

  const endGame = () => {
    setGameState('gameover');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('airrunner_highscore', score.toString());
      toast.success('New High Score!');
    }
  };

  const world = WORLDS[currentWorld];
  const evolution = PLANE_EVOLUTIONS[planeEvolution];

  return (
    <div 
      ref={gameRef}
      className="relative w-full h-[100dvh] sm:h-[600px] overflow-hidden sm:rounded-2xl select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background with world gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${world.gradient} transition-all duration-1000`}>
        {/* Stars/Particles */}
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: world.particleColor,
              boxShadow: `0 0 ${p.size * 2}px ${world.particleColor}`,
            }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2 }}
          />
        ))}

        {/* Speed lines when boosting */}
        {boostActive && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 bg-white/30"
                style={{
                  left: `${Math.random() * 100}%`,
                  width: `${50 + Math.random() * 100}px`,
                }}
                animate={{
                  top: ['0%', '100%'],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  delay: Math.random() * 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* World Transition Effect */}
      <AnimatePresence>
        {worldTransition && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-white/30 backdrop-blur-xl" />
            <motion.div
              className="text-4xl font-bold text-white z-10"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
              transition={{ duration: 1.5 }}
            >
              <Sparkles className="w-20 h-20" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Area */}
      {gameState === 'playing' && (
        <>
          {/* Lanes visualization */}
          <div className="absolute inset-x-0 top-0 bottom-0 flex">
            {[0, 1, 2].map(laneNum => (
              <div
                key={laneNum}
                className={`flex-1 border-x border-white/10 ${lane === laneNum ? 'bg-white/5' : ''}`}
              />
            ))}
          </div>

          {/* Obstacles */}
          <AnimatePresence>
            {obstacles.map(obs => (
              <motion.div
                key={obs.id}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${(obs.lane * 33.33) + 16.66 - (obs.width / 2 / 3)}%`,
                  top: obs.y,
                  width: obs.width,
                  height: obs.height,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <div 
                  className="w-full h-full rounded-lg"
                  style={{
                    backgroundColor: world.obstacleColor,
                    boxShadow: `0 0 20px ${world.obstacleColor}`,
                  }}
                >
                  {obs.type === 'drone' && <div className="absolute inset-0 flex items-center justify-center text-white text-xs">🛸</div>}
                  {obs.type === 'laser' && <div className="absolute inset-0 bg-red-500/50 animate-pulse" />}
                  {obs.type === 'meteor' && <div className="absolute inset-0 flex items-center justify-center text-2xl">☄️</div>}
                  {obs.type === 'vortex' && <div className="absolute inset-0 flex items-center justify-center text-2xl animate-spin">🌀</div>}
                  {obs.type === 'mine' && <div className="absolute inset-0 flex items-center justify-center text-xl">💣</div>}
                  {obs.type === 'wall' && <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500" />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Collectibles */}
          <AnimatePresence>
            {collectibles.map(col => (
              <motion.div
                key={col.id}
                className="absolute"
                style={{
                  left: `${(col.lane * 33.33) + 16.66 - 15}%`,
                  top: col.y,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: [0, 360] }}
                exit={{ opacity: 0, scale: 2 }}
                transition={{ rotate: { duration: 2, repeat: Infinity } }}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {col.type === 'coin' && <Coins className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />}
                  {col.type === 'crystal' && <span className="text-2xl">💎</span>}
                  {col.type === 'boost' && <Zap className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                  {col.type === 'shield' && <Shield className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
                  {col.type === 'timeShard' && <Snowflake className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                  {col.type === 'aiCore' && <span className="text-2xl">🧠</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Player Plane */}
          <motion.div
            className="absolute bottom-32"
            style={{
              left: `${(lane * 33.33) + 16.66 - 8}%`,
            }}
            animate={{
              left: `${(lane * 33.33) + 16.66 - 8}%`,
              y: altitude === 0 ? 20 : altitude === 2 ? -20 : 0,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {/* Shield Effect */}
            {shieldActive && (
              <motion.div
                className="absolute -inset-4 rounded-full border-2 border-blue-400"
                style={{ boxShadow: '0 0 20px rgba(96,165,250,0.6)' }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
            
            {/* Plane Body */}
            <div className="relative">
              <Plane 
                className="w-16 h-16 transform -rotate-90" 
                style={{ 
                  color: evolution.color,
                  filter: `drop-shadow(0 0 15px ${evolution.color})`,
                }}
              />
              
              {/* Engine Trail */}
              <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4"
                style={{
                  height: boostActive ? 60 : 30,
                  background: `linear-gradient(to bottom, ${evolution.color}, transparent)`,
                }}
                animate={{
                  height: boostActive ? [60, 80, 60] : [30, 40, 30],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{ duration: 0.2, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* HUD - Responsive */}
          <div className="absolute top-[env(safe-area-inset-top)] left-2 right-2 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start z-10 pt-2 sm:pt-0">
            {/* Score */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-xl sm:text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                {score.toLocaleString()}
              </div>
              <div className="text-[10px] sm:text-xs text-white/70">{Math.floor(distance)}m</div>
              {comboMultiplier > 1 && (
                <div className="text-[10px] sm:text-xs text-yellow-400">x{comboMultiplier.toFixed(1)} COMBO</div>
              )}
            </div>

            {/* Resources */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-400">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="text-xs sm:text-sm">{coins}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-purple-400">
                <span className="text-sm sm:text-base">🧠</span> <span className="text-xs sm:text-sm">{aiCores}</span>
              </div>
            </div>
          </div>

          {/* Lives - Responsive position */}
          <div className="absolute top-[calc(env(safe-area-inset-top)+3.5rem)] sm:top-20 left-2 sm:left-4 flex gap-0.5 sm:gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 sm:w-6 sm:h-6 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
              />
            ))}
          </div>

          {/* Boost Meter - Responsive */}
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5rem)] sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-10">
            <div className="bg-black/30 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                <Progress value={boostMeter} className="h-1.5 sm:h-2 flex-1" />
              </div>
              {shieldMeter > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <Progress value={shieldMeter} className="h-1.5 sm:h-2 flex-1" />
                </div>
              )}
            </div>
          </div>

          {/* World Name - Responsive */}
          <div className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] sm:top-4 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-sm rounded-full px-2.5 sm:px-4 py-0.5 sm:py-1">
            <span className="text-white/80 text-[10px] sm:text-sm">{world.name}</span>
          </div>

          {/* Control Buttons - Responsive */}
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:bottom-20 left-2 right-2 sm:left-4 sm:right-4 flex justify-between z-10">
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20 touch-manipulation"
              onClick={() => changeLane(-1)}
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-500/30 backdrop-blur-sm active:bg-cyan-500/50 touch-manipulation"
                onClick={activateBoost}
              >
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-500/30 backdrop-blur-sm active:bg-blue-500/50 touch-manipulation"
                onClick={activateShield}
              >
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20 touch-manipulation"
              onClick={() => changeLane(1)}
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </Button>
          </div>
        </>
      )}

      {/* Menu Screen - Responsive */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 via-purple-900 to-black px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-6 sm:mb-8"
          >
            <Plane className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-cyan-400 mb-3 sm:mb-4 transform -rotate-45" 
              style={{ filter: 'drop-shadow(0 0 30px rgba(34,211,238,0.8))' }}
            />
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">CHATR AIR RUNNER</h1>
            <p className="text-white/60 text-sm sm:text-base">Level {level}</p>
            {highScore > 0 && (
              <p className="text-yellow-400 mt-1 sm:mt-2 text-sm sm:text-base">High Score: {highScore.toLocaleString()}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 sm:space-y-4"
          >
            <Button
              size="lg"
              className="w-40 sm:w-48 h-12 sm:h-14 text-lg sm:text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 touch-manipulation"
              onClick={startGame}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" /> FLY
            </Button>
            
            <div className="flex justify-center gap-3 sm:gap-4 mt-3 sm:mt-4">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 touch-manipulation"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 touch-manipulation"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
              >
                {voiceEnabled ? <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
              </Button>
            </div>
          </motion.div>

          <Button
            variant="ghost"
            className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] sm:top-4 left-2 sm:left-4 text-white/70 touch-manipulation"
            onClick={onExit}
          >
            ← Back
          </Button>

          {/* Controls hint */}
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:bottom-8 text-center text-white/50 text-xs sm:text-sm px-4">
            <p>Swipe or Arrow Keys to move • Space to boost</p>
            <p className="mt-1">Collect coins, avoid obstacles, survive!</p>
          </div>
        </div>
      )}

      {/* Game Over Screen - Responsive */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <Trophy className="w-14 h-14 sm:w-20 sm:h-20 mx-auto text-yellow-400 mb-3 sm:mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">GAME OVER</h2>
            <p className="text-4xl sm:text-5xl font-bold text-cyan-400 mb-3 sm:mb-4">{score.toLocaleString()}</p>
            <p className="text-white/60 text-sm sm:text-base mb-1 sm:mb-2">Distance: {Math.floor(distance)}m</p>
            <p className="text-yellow-400 text-sm sm:text-base mb-4 sm:mb-6">Coins: {coins}</p>
            
            {score >= highScore && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                className="text-xl sm:text-2xl text-yellow-400 mb-3 sm:mb-4"
              >
                🏆 NEW HIGH SCORE!
              </motion.p>
            )}

            <div className="space-y-2 sm:space-y-3">
              <Button
                size="lg"
                className="w-40 sm:w-48 bg-gradient-to-r from-cyan-500 to-blue-500 touch-manipulation"
                onClick={startGame}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Try Again
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-40 sm:w-48 touch-manipulation"
                onClick={() => onComplete(score)}
              >
                Complete Level
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Paused Screen - Responsive */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">PAUSED</h2>
          <div className="space-y-2 sm:space-y-3">
            <Button
              size="lg"
              className="w-40 sm:w-48 touch-manipulation"
              onClick={() => setGameState('playing')}
            >
              Resume
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-40 sm:w-48 touch-manipulation"
              onClick={() => setGameState('menu')}
            >
              Main Menu
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-40 sm:w-48 text-white/70 touch-manipulation"
              onClick={onExit}
            >
              Exit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
