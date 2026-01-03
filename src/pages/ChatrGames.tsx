import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Trophy, Coins, ChevronRight, Sparkles, Users, Plane, Flame, Zap, Star, Clock, Gift, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';
import { ParallelYouGame } from '@/components/games/ParallelYouGame';
import { MapHuntGame } from '@/components/games/MapHuntGame';
import { EmotionSyncGame } from '@/components/games/EmotionSyncGame';
import { EnergyPulseGame } from '@/components/games/EnergyPulseGame';
import { MindMazeGame } from '@/components/games/MindMazeGame';
import { SocialStormGame } from '@/components/games/SocialStormGame';
import { AvaWarsGame } from '@/components/games/AvaWarsGame';
import { DreamForgeGame } from '@/components/games/DreamForgeGame';
import { FrequencyClashGame } from '@/components/games/FrequencyClashGame';
import { ShadowVerseGame } from '@/components/games/ShadowVerseGame';
import AICarRacingGame from '@/components/games/AICarRacingGame';
import AIMotorcycleRacingGame from '@/components/games/AIMotorcycleRacingGame';
import AIBubbleShooterGame from '@/components/games/AIBubbleShooterGame';
import AICandyCrushGame from '@/components/games/AICandyCrushGame';
import AIWordFinderGame from '@/components/games/AIWordFinderGame';
import SyncMindGame from '@/components/games/SyncMindGame';
import EchoChainGame from '@/components/games/EchoChainGame';
import MirrorMatchGame from '@/components/games/MirrorMatchGame';
import ThoughtDuelGame from '@/components/games/ThoughtDuelGame';
import VibeLinkGame from '@/components/games/VibeLinkGame';
import { AIAirRunnerGame } from '@/components/games/AIAirRunnerGame';

type GameType = 'hub' | 'air_runner' | 'parallel_you' | 'map_hunt' | 'emotionsync' | 'energy_pulse' | 'mindmaze' | 'socialstorm' | 'avawars' | 'dreamforge' | 'frequencyclash' | 'shadowverse' | 'car_racing' | 'motorcycle_racing' | 'bubble_shooter' | 'candy_crush' | 'word_finder' | 'sync_mind' | 'echo_chain' | 'mirror_match' | 'thought_duel' | 'vibe_link';

interface Game {
  id: GameType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string;
  accentColor: string;
  levels: number;
  category: 'ai' | 'arcade' | 'puzzle' | 'adventure' | 'multiplayer' | 'featured';
  isMultiplayer?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isHot?: boolean;
}

const games: Game[] = [
  { id: 'air_runner', title: 'AIR RUNNER', subtitle: 'Endless Sky', description: 'AI-powered infinite plane runner', icon: '✈️', gradient: 'from-cyan-500 via-blue-500 to-indigo-600', accentColor: 'cyan', levels: 100, category: 'featured', isFeatured: true, isNew: true },
  { id: 'sync_mind', title: 'SyncMind', subtitle: 'Think Alike', description: 'Match minds with strangers', icon: '🧠', gradient: 'from-violet-500 to-fuchsia-400', accentColor: 'violet', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true, isHot: true },
  { id: 'echo_chain', title: 'EchoChain', subtitle: 'Story Builder', description: 'Build stories together', icon: '🔗', gradient: 'from-emerald-500 to-cyan-400', accentColor: 'emerald', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true },
  { id: 'mirror_match', title: 'MirrorMatch', subtitle: 'Real-time Sync', description: 'Mirror moves perfectly', icon: '🪞', gradient: 'from-pink-500 to-red-400', accentColor: 'pink', levels: 50, category: 'multiplayer', isMultiplayer: true },
  { id: 'thought_duel', title: 'ThoughtDuel', subtitle: 'Creative Battle', description: 'Battle of descriptions', icon: '⚔️', gradient: 'from-amber-500 to-orange-400', accentColor: 'amber', levels: 50, category: 'multiplayer', isMultiplayer: true },
  { id: 'vibe_link', title: 'VibeLink', subtitle: 'Emotional Sync', description: 'Feel the same emotion', icon: '💕', gradient: 'from-rose-500 to-purple-400', accentColor: 'rose', levels: 50, category: 'multiplayer', isMultiplayer: true },
  { id: 'car_racing', title: 'AI Racing', subtitle: 'Speed Rush', description: 'Outsmart the AI', icon: '🏎️', gradient: 'from-blue-500 to-cyan-400', accentColor: 'blue', levels: 50, category: 'arcade', isHot: true },
  { id: 'candy_crush', title: 'Candy Match', subtitle: 'Sweet Puzzles', description: 'AI-crafted matching', icon: '🍬', gradient: 'from-pink-500 to-rose-400', accentColor: 'pink', levels: 50, category: 'puzzle' },
  { id: 'parallel_you', title: 'Parallel You', subtitle: 'AI Twin', description: 'Challenge your digital self', icon: '🧬', gradient: 'from-violet-500 to-purple-400', accentColor: 'violet', levels: 50, category: 'ai' },
  { id: 'motorcycle_racing', title: 'Moto Rush', subtitle: 'Nitro Speed', description: 'AI adapts to you', icon: '🏍️', gradient: 'from-orange-500 to-amber-400', accentColor: 'orange', levels: 50, category: 'arcade' },
  { id: 'bubble_shooter', title: 'Bubble Pop', subtitle: 'Strategic Shots', description: 'Pop with precision', icon: '🫧', gradient: 'from-indigo-500 to-blue-400', accentColor: 'indigo', levels: 50, category: 'puzzle' },
  { id: 'word_finder', title: 'Word Hunt', subtitle: 'Brain Teaser', description: 'Find hidden words', icon: '📚', gradient: 'from-emerald-500 to-teal-400', accentColor: 'emerald', levels: 50, category: 'puzzle' },
  { id: 'mindmaze', title: 'MindMaze', subtitle: 'Thought Reader', description: 'Can AI read your mind?', icon: '🧠', gradient: 'from-purple-500 to-indigo-400', accentColor: 'purple', levels: 50, category: 'ai' },
  { id: 'avawars', title: 'AVA Wars', subtitle: 'AI Battle', description: 'Your AI fights for you', icon: '⚔️', gradient: 'from-red-500 to-rose-400', accentColor: 'red', levels: 50, category: 'ai' },
  { id: 'dreamforge', title: 'DreamForge', subtitle: 'Dream Explorer', description: 'Play inside dreams', icon: '🌙', gradient: 'from-slate-500 to-violet-400', accentColor: 'slate', levels: 50, category: 'adventure' },
  { id: 'socialstorm', title: 'SocialStorm', subtitle: 'Trend Predictor', description: 'Predict viral content', icon: '🔥', gradient: 'from-amber-500 to-orange-400', accentColor: 'amber', levels: 50, category: 'ai' },
  { id: 'shadowverse', title: 'ShadowVerse', subtitle: 'Dark Journey', description: 'Explore your shadow', icon: '👻', gradient: 'from-zinc-600 to-slate-500', accentColor: 'zinc', levels: 50, category: 'adventure' },
  { id: 'emotionsync', title: 'EmotionSync', subtitle: 'Feel to Play', description: 'Emotions control game', icon: '🎭', gradient: 'from-rose-500 to-pink-400', accentColor: 'rose', levels: 50, category: 'ai' },
  { id: 'frequencyclash', title: 'Frequency', subtitle: 'Voice Control', description: 'Speak to command', icon: '🎤', gradient: 'from-teal-500 to-cyan-400', accentColor: 'teal', levels: 50, category: 'ai' },
  { id: 'map_hunt', title: 'Map Hunt', subtitle: 'Treasure Quest', description: 'Real-world adventure', icon: '🗺️', gradient: 'from-yellow-500 to-amber-400', accentColor: 'yellow', levels: 50, category: 'adventure' },
  { id: 'energy_pulse', title: 'Energy Pulse', subtitle: 'Rhythm Flow', description: 'Hypnotic beats', icon: '⚡', gradient: 'from-cyan-500 to-blue-400', accentColor: 'cyan', levels: 50, category: 'arcade' },
];

const categories = [
  { id: 'all', label: 'All', icon: '🎮' },
  { id: 'featured', label: 'Featured', icon: '⭐' },
  { id: 'multiplayer', label: 'Multiplayer', icon: '👥' },
  { id: 'ai', label: 'AI Games', icon: '🤖' },
  { id: 'arcade', label: 'Arcade', icon: '🕹️' },
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'adventure', label: 'Adventure', icon: '🗺️' },
];

// Progress ring component
const ProgressRing = ({ progress, size = 40, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
      <circle cx={size/2} cy={size/2} r={radius} stroke="url(#gradient)" strokeWidth={strokeWidth} fill="none" 
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default function ChatrGames() {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<GameType>('hub');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalCoins] = useState(2500);
  const [dailyStreak] = useState(7);
  const [xpProgress] = useState(68);
  
  const handleGameComplete = (score: number) => {
    setCurrentLevel(prev => Math.min(prev + 1, 50));
    setActiveGame('hub');
  };

  const filteredGames = activeCategory === 'all' 
    ? games 
    : games.filter(g => g.category === activeCategory);

  const quickPlayGames = games.filter(g => g.isHot || g.isNew).slice(0, 4);

  const renderGame = () => {
    switch (activeGame) {
      case 'air_runner': return <AIAirRunnerGame level={currentLevel} onComplete={handleGameComplete} onExit={() => setActiveGame('hub')} />;
      case 'parallel_you': return <ParallelYouGame onBack={() => setActiveGame('hub')} />;
      case 'map_hunt': return <MapHuntGame onBack={() => setActiveGame('hub')} />;
      case 'emotionsync': return <EmotionSyncGame onBack={() => setActiveGame('hub')} />;
      case 'energy_pulse': return <EnergyPulseGame onBack={() => setActiveGame('hub')} />;
      case 'mindmaze': return <MindMazeGame onBack={() => setActiveGame('hub')} />;
      case 'socialstorm': return <SocialStormGame onBack={() => setActiveGame('hub')} />;
      case 'avawars': return <AvaWarsGame onBack={() => setActiveGame('hub')} />;
      case 'dreamforge': return <DreamForgeGame onBack={() => setActiveGame('hub')} />;
      case 'frequencyclash': return <FrequencyClashGame onBack={() => setActiveGame('hub')} />;
      case 'shadowverse': return <ShadowVerseGame onBack={() => setActiveGame('hub')} />;
      case 'car_racing': return <AICarRacingGame level={currentLevel} onComplete={handleGameComplete} onExit={() => setActiveGame('hub')} />;
      case 'motorcycle_racing': return <AIMotorcycleRacingGame level={currentLevel} onComplete={handleGameComplete} onExit={() => setActiveGame('hub')} />;
      case 'bubble_shooter': return <AIBubbleShooterGame level={currentLevel} onComplete={handleGameComplete} onExit={() => setActiveGame('hub')} />;
      case 'candy_crush': return <AICandyCrushGame level={currentLevel} onComplete={handleGameComplete} onExit={() => setActiveGame('hub')} />;
      case 'word_finder': return <AIWordFinderGame level={currentLevel} onComplete={handleGameComplete} onExit={() => setActiveGame('hub')} />;
      case 'sync_mind': return <SyncMindGame level={currentLevel} onComplete={handleGameComplete} onBack={() => setActiveGame('hub')} />;
      case 'echo_chain': return <EchoChainGame level={currentLevel} onComplete={handleGameComplete} onBack={() => setActiveGame('hub')} />;
      case 'mirror_match': return <MirrorMatchGame level={currentLevel} onComplete={handleGameComplete} onBack={() => setActiveGame('hub')} />;
      case 'thought_duel': return <ThoughtDuelGame level={currentLevel} onComplete={handleGameComplete} onBack={() => setActiveGame('hub')} />;
      case 'vibe_link': return <VibeLinkGame level={currentLevel} onComplete={handleGameComplete} onBack={() => setActiveGame('hub')} />;
      default: return null;
    }
  };

  if (activeGame !== 'hub') return renderGame();

  return (
    <>
      <SEOHead 
        title="CHATR Games - 21 AI & Multiplayer Games"
        description="21 revolutionary games with 1100 levels. AI-powered + real-time multiplayer gaming."
      />
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d18] to-[#0a0a0f] text-white overflow-x-hidden">
        {/* Ambient Background - Optimized for mobile */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-0 w-[300px] h-[300px] bg-cyan-600/8 rounded-full blur-[100px]" />
        </div>

        {/* Compact Mobile Header */}
        <header className="relative z-20 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/home')} 
                  className="w-9 h-9 rounded-full bg-white/5 active:bg-white/10 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 text-white/70" />
                </button>
                <div>
                  <h1 className="text-lg font-bold">Games</h1>
                  <p className="text-[10px] text-white/40">21 Games • 1100 Levels</p>
                </div>
              </div>
              
              {/* Compact Stats */}
              <div className="flex items-center gap-2">
                {/* Streak */}
                <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-2.5 py-1.5 rounded-full border border-orange-500/20">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-300">{dailyStreak}</span>
                </div>
                
                {/* Coins */}
                <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-full">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium">{(totalCoins/1000).toFixed(1)}k</span>
                </div>
                
                {/* Level with progress */}
                <div className="relative flex items-center justify-center">
                  <ProgressRing progress={xpProgress} size={36} strokeWidth={2} />
                  <span className="absolute text-[10px] font-bold">{currentLevel}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 px-4 pb-24">
          {/* Featured Hero - Mobile Optimized */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-4"
          >
            <motion.div
              onClick={() => setActiveGame('air_runner')}
              className="relative cursor-pointer overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
              whileTap={{ scale: 0.98 }}
            >
              {/* Gradient Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-[1.5px]">
                <div className="absolute inset-[1.5px] rounded-2xl bg-gradient-to-br from-[#0c1929] via-[#0a1525] to-[#0d0d1a]" />
              </div>
              
              <div className="relative p-5 h-[200px] flex flex-col justify-between overflow-hidden">
                {/* Animated particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-0.5 h-0.5 bg-cyan-400/40 rounded-full"
                      style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                      animate={{ y: [-20, 100], opacity: [0, 1, 0] }}
                      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                    />
                  ))}
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 px-2 py-0.5 text-[10px] font-bold mb-2">
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    MAIN GAME
                  </Badge>
                  <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                    AIR RUNNER
                  </h2>
                  <p className="text-xs text-white/50 mt-1">7 Worlds • Voice Powers • Infinite</p>
                </div>
                
                {/* Plane Icon */}
                <motion.div
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  animate={{ y: [0, -5, 0], rotate: [0, 2, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Plane className="w-20 h-20 text-cyan-400/80 transform -rotate-45" style={{ filter: 'drop-shadow(0 0 20px rgba(34,211,238,0.5))' }} />
                </motion.div>
                
                {/* Play button */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {['7 Worlds', 'Voice', '100 Lvls'].map(tag => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-white/10 text-[9px] text-white/60">{tag}</span>
                    ))}
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold px-4 py-2 rounded-full text-xs shadow-lg shadow-cyan-500/30">
                    <Play className="w-3 h-3 mr-1 fill-current" />
                    PLAY
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.section>

          {/* Quick Play Row */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold">Quick Play</h3>
              </div>
              <span className="text-[10px] text-white/40">Trending now</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {quickPlayGames.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => setActiveGame(game.id)}
                  className="flex-shrink-0 w-[100px] cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="relative">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl shadow-lg mb-2`}>
                      {game.icon}
                      {game.isHot && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Flame className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-center text-white/80 truncate">{game.title}</p>
                    <p className="text-[9px] text-center text-white/40">{game.subtitle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Daily Challenge Card */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-5"
          >
            <div className="bg-gradient-to-r from-purple-600/20 via-fuchsia-600/15 to-pink-600/20 rounded-2xl p-4 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90">Daily Challenge</p>
                    <p className="text-[10px] text-white/50">Win 3 games • 500 coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3 text-white/50" />
                    <span className="text-[10px] text-white/60">12h left</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">1/3</p>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '33%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </motion.section>

          {/* Category Pills - Scrollable */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/60 active:bg-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Games Grid - 2 columns on mobile */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/90">
                {activeCategory === 'all' ? 'All Games' : categories.find(c => c.id === activeCategory)?.label}
              </h3>
              <span className="text-[10px] text-white/40">{filteredGames.length} games</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setActiveGame(game.id)}
                    className="cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-3">
                      {/* Game Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-xl shadow-lg mb-2`}>
                        {game.icon}
                      </div>
                      
                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {game.isNew && (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-[8px] font-bold text-green-400">NEW</span>
                        )}
                        {game.isMultiplayer && (
                          <Users className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <h4 className="font-semibold text-xs text-white/90 truncate">{game.title}</h4>
                      <p className="text-[10px] text-white/40 truncate">{game.subtitle}</p>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-white/30">{game.levels} Lvls</span>
                        <ChevronRight className="w-3 h-3 text-white/30" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Bottom Stats Row */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 grid grid-cols-4 gap-2"
          >
            {[
              { icon: '🎮', value: '21', label: 'Games' },
              { icon: '📊', value: '1.1k', label: 'Levels' },
              { icon: '🏆', value: `L${currentLevel}`, label: 'Rank' },
              { icon: '🔥', value: `${dailyStreak}d`, label: 'Streak' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
                <span className="text-lg block mb-0.5">{stat.icon}</span>
                <p className="text-sm font-bold text-white">{stat.value}</p>
                <p className="text-[9px] text-white/40">{stat.label}</p>
              </div>
            ))}
          </motion.section>

          {/* Mini Leaderboard */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold">Top Players</h3>
              </div>
              <button className="text-[10px] text-white/40">View All</button>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
              {[
                { rank: 1, name: 'ProGamer', score: '125K', avatar: '🥇' },
                { rank: 2, name: 'AIChallenger', score: '98K', avatar: '🥈' },
                { rank: 3, name: 'PulseKing', score: '87K', avatar: '🥉' },
              ].map((player, i) => (
                <div 
                  key={player.rank}
                  className={`flex items-center justify-between px-3 py-2.5 ${i !== 2 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{player.avatar}</span>
                    <div>
                      <p className="text-xs font-medium text-white/90">{player.name}</p>
                      <p className="text-[10px] text-white/40">Rank #{player.rank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <p className="text-xs font-semibold text-white/70">{player.score}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </main>
      </div>
    </>
  );
}
