import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  
  const handleGameComplete = async (score: number) => {
    const newLevel = Math.min(currentLevel + 1, 50);
    setCurrentLevel(newLevel);
    setActiveGame('hub');

    // Sync score to database leaderboard
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update or insert leaderboard entry using correct schema
        const { data: existing } = await supabase
          .from('chatr_leaderboards')
          .select('id, score, metadata')
          .eq('user_id', user.id)
          .eq('leaderboard_type', 'games')
          .eq('period', 'all_time')
          .maybeSingle();

        const currentMetadata = (existing?.metadata as any) || { games_played: 0, highest_level: 0 };

        if (existing) {
          await supabase.from('chatr_leaderboards').update({
            score: (existing.score || 0) + score,
            metadata: {
              games_played: (currentMetadata.games_played || 0) + 1,
              highest_level: Math.max(currentMetadata.highest_level || 0, newLevel),
              last_played_at: new Date().toISOString()
            }
          }).eq('id', existing.id);
        } else {
          await supabase.from('chatr_leaderboards').insert({
            user_id: user.id,
            leaderboard_type: 'games',
            score: score,
            period: 'all_time',
            metadata: {
              games_played: 1,
              highest_level: newLevel,
              last_played_at: new Date().toISOString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error syncing game score:', error);
    }
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
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a0a0f] via-[#0d0d18] to-[#0a0a0f] text-white overflow-x-hidden">
        {/* Ambient Background - Optimized for all displays */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[min(400px,50vh)] bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-0 w-[min(300px,50vw)] h-[min(300px,30vh)] bg-cyan-600/8 rounded-full blur-[100px]" />
        </div>

        {/* Responsive Header - Safe area aware */}
        <header className="relative z-20 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top)]">
          <div className="px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button 
                  onClick={() => navigate('/home')} 
                  className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full bg-white/5 active:bg-white/10 flex items-center justify-center touch-manipulation"
                >
                  <ArrowLeft className="w-4 h-4 text-white/70" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold truncate">Games</h1>
                  <p className="text-[9px] sm:text-[10px] text-white/40">21 Games • 1100 Levels</p>
                </div>
              </div>
              
              {/* Compact Stats - Responsive sizing */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Streak */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full border border-orange-500/20">
                  <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400" />
                  <span className="text-[10px] sm:text-xs font-bold text-orange-300">{dailyStreak}</span>
                </div>
                
                {/* Coins - Hidden on very small screens */}
                <div className="hidden xs:flex items-center gap-0.5 sm:gap-1 bg-white/5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full">
                  <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  <span className="text-[10px] sm:text-xs font-medium">{(totalCoins/1000).toFixed(1)}k</span>
                </div>
                
                {/* Level with progress */}
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <ProgressRing progress={xpProgress} size={32} strokeWidth={2} />
                  <span className="absolute text-[9px] sm:text-[10px] font-bold">{currentLevel}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 px-3 sm:px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {/* Featured Hero - All Display Optimized */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-3 sm:py-4"
          >
            <motion.div
              onClick={() => setActiveGame('air_runner')}
              className="relative cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl active:scale-[0.98] transition-transform touch-manipulation"
              whileTap={{ scale: 0.98 }}
            >
              {/* Gradient Border */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-[1px] sm:p-[1.5px]">
                <div className="absolute inset-[1px] sm:inset-[1.5px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0c1929] via-[#0a1525] to-[#0d0d1a]" />
              </div>
              
              <div className="relative p-3 sm:p-5 h-[160px] sm:h-[200px] flex flex-col justify-between overflow-hidden">
                {/* Animated particles - fewer on mobile */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(8)].map((_, i) => (
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
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold mb-1.5 sm:mb-2">
                    <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                    MAIN GAME
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                    AIR RUNNER
                  </h2>
                  <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1">7 Worlds • Voice Powers • Infinite</p>
                </div>
                
                {/* Plane Icon - Responsive size */}
                <motion.div
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2"
                  animate={{ y: [0, -5, 0], rotate: [0, 2, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Plane className="w-14 h-14 sm:w-20 sm:h-20 text-cyan-400/80 transform -rotate-45" style={{ filter: 'drop-shadow(0 0 20px rgba(34,211,238,0.5))' }} />
                </motion.div>
                
                {/* Play button */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                    {['7 Worlds', 'Voice', '100 Lvls'].map(tag => (
                      <span key={tag} className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-white/10 text-[8px] sm:text-[9px] text-white/60">{tag}</span>
                    ))}
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs shadow-lg shadow-cyan-500/30 flex-shrink-0">
                    <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 fill-current" />
                    PLAY
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.section>

          {/* Quick Play Row - Responsive */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 sm:mb-5"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-semibold">Quick Play</h3>
              </div>
              <span className="text-[9px] sm:text-[10px] text-white/40">Trending now</span>
            </div>
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4 scrollbar-hide snap-x snap-mandatory">
              {quickPlayGames.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => setActiveGame(game.id)}
                  className="flex-shrink-0 w-[80px] sm:w-[100px] cursor-pointer active:scale-95 transition-transform touch-manipulation snap-start"
                >
                  <div className="relative">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-xl sm:text-2xl shadow-lg mb-1.5 sm:mb-2`}>
                      {game.icon}
                      {game.isHot && (
                        <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-center text-white/80 truncate px-1">{game.title}</p>
                    <p className="text-[8px] sm:text-[9px] text-center text-white/40 truncate">{game.subtitle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Daily Challenge Card - Responsive */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4 sm:mb-5"
          >
            <div className="bg-gradient-to-r from-purple-600/20 via-fuchsia-600/15 to-pink-600/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-purple-500/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold text-white/90 truncate">Daily Challenge</p>
                    <p className="text-[9px] sm:text-[10px] text-white/50 truncate">Win 3 games • 500 coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="hidden xs:flex items-center gap-0.5 sm:gap-1 bg-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/50" />
                    <span className="text-[9px] sm:text-[10px] text-white/60">12h</span>
                  </div>
                  <div className="text-right">
                    <p className="text-base sm:text-lg font-bold text-white">1/3</p>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '33%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </motion.section>

          {/* Category Pills - Responsive Scrollable */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-3 sm:mb-4"
          >
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4 scrollbar-hide snap-x">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all touch-manipulation snap-start ${
                    activeCategory === cat.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/60 active:bg-white/10'
                  }`}
                >
                  <span className="text-sm sm:text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Games Grid - Responsive columns */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-white/90">
                {activeCategory === 'all' ? 'All Games' : categories.find(c => c.id === activeCategory)?.label}
              </h3>
              <span className="text-[9px] sm:text-[10px] text-white/40">{filteredGames.length} games</span>
            </div>
            
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
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
                    className="cursor-pointer active:scale-95 transition-transform touch-manipulation"
                  >
                    <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-2 sm:p-3">
                      {/* Game Icon */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-lg sm:text-xl shadow-lg mb-1.5 sm:mb-2`}>
                        {game.icon}
                      </div>
                      
                      {/* Badges */}
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-0.5 sm:gap-1">
                        {game.isNew && (
                          <span className="px-1 sm:px-1.5 py-0.5 rounded bg-green-500/20 text-[7px] sm:text-[8px] font-bold text-green-400">NEW</span>
                        )}
                        {game.isMultiplayer && (
                          <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <h4 className="font-semibold text-[11px] sm:text-xs text-white/90 truncate">{game.title}</h4>
                      <p className="text-[9px] sm:text-[10px] text-white/40 truncate">{game.subtitle}</p>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-white/5">
                        <span className="text-[8px] sm:text-[9px] text-white/30">{game.levels} Lvls</span>
                        <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/30" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Bottom Stats Row - Responsive */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 sm:mt-6 grid grid-cols-4 gap-1.5 sm:gap-2"
          >
            {[
              { icon: '🎮', value: '21', label: 'Games' },
              { icon: '📊', value: '1.1k', label: 'Levels' },
              { icon: '🏆', value: `L${currentLevel}`, label: 'Rank' },
              { icon: '🔥', value: `${dailyStreak}d`, label: 'Streak' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] border border-white/[0.05] rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                <span className="text-sm sm:text-lg block mb-0.5">{stat.icon}</span>
                <p className="text-xs sm:text-sm font-bold text-white">{stat.value}</p>
                <p className="text-[8px] sm:text-[9px] text-white/40">{stat.label}</p>
              </div>
            ))}
          </motion.section>

          {/* Mini Leaderboard - Responsive */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 sm:mt-5"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-semibold">Top Players</h3>
              </div>
              <button className="text-[9px] sm:text-[10px] text-white/40 touch-manipulation">View All</button>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg sm:rounded-xl overflow-hidden">
              {[
                { rank: 1, name: 'ProGamer', score: '125K', avatar: '🥇' },
                { rank: 2, name: 'AIChallenger', score: '98K', avatar: '🥈' },
                { rank: 3, name: 'PulseKing', score: '87K', avatar: '🥉' },
              ].map((player, i) => (
                <div 
                  key={player.rank}
                  className={`flex items-center justify-between px-2.5 sm:px-3 py-2 sm:py-2.5 ${i !== 2 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg">{player.avatar}</span>
                    <div>
                      <p className="text-[11px] sm:text-xs font-medium text-white/90">{player.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-white/40">Rank #{player.rank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
                    <p className="text-[11px] sm:text-xs font-semibold text-white/70">{player.score}</p>
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
