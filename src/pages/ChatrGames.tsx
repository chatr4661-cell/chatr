import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Trophy, Coins, ChevronRight, Sparkles, Users } from 'lucide-react';
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

type GameType = 'hub' | 'parallel_you' | 'map_hunt' | 'emotionsync' | 'energy_pulse' | 'mindmaze' | 'socialstorm' | 'avawars' | 'dreamforge' | 'frequencyclash' | 'shadowverse' | 'car_racing' | 'motorcycle_racing' | 'bubble_shooter' | 'candy_crush' | 'word_finder' | 'sync_mind' | 'echo_chain' | 'mirror_match' | 'thought_duel' | 'vibe_link';

interface Game {
  id: GameType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string;
  accentColor: string;
  levels: number;
  category: 'ai' | 'arcade' | 'puzzle' | 'adventure' | 'multiplayer';
  isMultiplayer?: boolean;
  isNew?: boolean;
}

const games: Game[] = [
  // NEW Multiplayer Games
  { id: 'sync_mind', title: 'SyncMind', subtitle: 'Think Alike', description: 'Match minds with strangers', icon: '🧠', gradient: 'from-violet-500 to-fuchsia-400', accentColor: 'violet', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true },
  { id: 'echo_chain', title: 'EchoChain', subtitle: 'Story Builder', description: 'Build stories together', icon: '🔗', gradient: 'from-emerald-500 to-cyan-400', accentColor: 'emerald', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true },
  { id: 'mirror_match', title: 'MirrorMatch', subtitle: 'Real-time Sync', description: 'Mirror moves perfectly', icon: '🪞', gradient: 'from-pink-500 to-red-400', accentColor: 'pink', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true },
  { id: 'thought_duel', title: 'ThoughtDuel', subtitle: 'Creative Battle', description: 'Battle of descriptions', icon: '⚔️', gradient: 'from-amber-500 to-orange-400', accentColor: 'amber', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true },
  { id: 'vibe_link', title: 'VibeLink', subtitle: 'Emotional Sync', description: 'Feel the same emotion', icon: '💕', gradient: 'from-rose-500 to-purple-400', accentColor: 'rose', levels: 50, category: 'multiplayer', isMultiplayer: true, isNew: true },
  // Existing Games
  { id: 'car_racing', title: 'AI Racing', subtitle: 'Speed & Strategy', description: 'Outsmart the AI on every turn', icon: '🏎️', gradient: 'from-blue-500 to-cyan-400', accentColor: 'blue', levels: 50, category: 'arcade' },
  { id: 'candy_crush', title: 'Candy Match', subtitle: 'Sweet Puzzles', description: 'AI-crafted matching challenges', icon: '🍬', gradient: 'from-pink-500 to-rose-400', accentColor: 'pink', levels: 50, category: 'puzzle' },
  { id: 'parallel_you', title: 'Parallel You', subtitle: 'AI Twin Battle', description: 'Challenge your digital self', icon: '🧬', gradient: 'from-violet-500 to-purple-400', accentColor: 'violet', levels: 50, category: 'ai' },
  { id: 'motorcycle_racing', title: 'Moto Rush', subtitle: 'Nitro Powered', description: 'AI adapts to your riding style', icon: '🏍️', gradient: 'from-orange-500 to-amber-400', accentColor: 'orange', levels: 50, category: 'arcade' },
  { id: 'bubble_shooter', title: 'Bubble Pop', subtitle: 'Strategic Shots', description: 'Pop bubbles with precision', icon: '🫧', gradient: 'from-indigo-500 to-blue-400', accentColor: 'indigo', levels: 50, category: 'puzzle' },
  { id: 'word_finder', title: 'Word Hunt', subtitle: 'Brain Teaser', description: 'Find hidden words before time runs out', icon: '📚', gradient: 'from-emerald-500 to-teal-400', accentColor: 'emerald', levels: 50, category: 'puzzle' },
  { id: 'mindmaze', title: 'MindMaze', subtitle: 'Thought Reader', description: 'Can AI read your mind?', icon: '🧠', gradient: 'from-purple-500 to-indigo-400', accentColor: 'purple', levels: 50, category: 'ai' },
  { id: 'avawars', title: 'AVA Wars', subtitle: 'Personality Clash', description: 'Your AI fights for you', icon: '⚔️', gradient: 'from-red-500 to-rose-400', accentColor: 'red', levels: 50, category: 'ai' },
  { id: 'dreamforge', title: 'DreamForge', subtitle: 'Dream Explorer', description: 'Play inside your dreams', icon: '🌙', gradient: 'from-slate-500 to-violet-400', accentColor: 'slate', levels: 50, category: 'adventure' },
  { id: 'socialstorm', title: 'SocialStorm', subtitle: 'Trend Predictor', description: 'Predict viral content', icon: '🔥', gradient: 'from-amber-500 to-orange-400', accentColor: 'amber', levels: 50, category: 'ai' },
  { id: 'shadowverse', title: 'ShadowVerse', subtitle: 'Dark Journey', description: 'Explore your shadow self', icon: '👻', gradient: 'from-zinc-600 to-slate-500', accentColor: 'zinc', levels: 50, category: 'adventure' },
  { id: 'emotionsync', title: 'EmotionSync', subtitle: 'Feel to Play', description: 'Your emotions control the game', icon: '🎭', gradient: 'from-rose-500 to-pink-400', accentColor: 'rose', levels: 50, category: 'ai' },
  { id: 'frequencyclash', title: 'Frequency', subtitle: 'Voice Control', description: 'Speak to command', icon: '🎤', gradient: 'from-teal-500 to-cyan-400', accentColor: 'teal', levels: 50, category: 'ai' },
  { id: 'map_hunt', title: 'Map Hunt', subtitle: 'Treasure Quest', description: 'Real-world adventure', icon: '🗺️', gradient: 'from-yellow-500 to-amber-400', accentColor: 'yellow', levels: 50, category: 'adventure' },
  { id: 'energy_pulse', title: 'Energy Pulse', subtitle: 'Rhythm Flow', description: 'Hypnotic beats await', icon: '⚡', gradient: 'from-cyan-500 to-blue-400', accentColor: 'cyan', levels: 50, category: 'arcade' },
];

const categories = [
  { id: 'all', label: 'All Games', count: 20 },
  { id: 'multiplayer', label: 'Multiplayer', count: 5 },
  { id: 'ai', label: 'AI Powered', count: 7 },
  { id: 'arcade', label: 'Arcade', count: 4 },
  { id: 'puzzle', label: 'Puzzle', count: 3 },
  { id: 'adventure', label: 'Adventure', count: 3 },
];

export default function ChatrGames() {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<GameType>('hub');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalCoins] = useState(2500);
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const handleGameComplete = (score: number) => {
    setCurrentLevel(prev => Math.min(prev + 1, 50));
    setActiveGame('hub');
  };

  const filteredGames = activeCategory === 'all' 
    ? games 
    : games.filter(g => g.category === activeCategory);

  const featuredGames = games.slice(0, 3);

  const renderGame = () => {
    switch (activeGame) {
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
        title="CHATR Games - 20 AI & Multiplayer Games"
        description="20 revolutionary games with 1000 levels. AI-powered + real-time multiplayer gaming."
      />
      <div className="min-h-screen bg-black text-white">
        {/* Ambient Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(244,63,94,0.08),transparent_50%)]" />
        </div>

        {/* Header - Apple Style */}
        <header className="relative z-10 sticky top-0 bg-black/80 backdrop-blur-2xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/home')} 
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5 text-white/70" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Games</h1>
                  <p className="text-xs text-white/40">1000 Levels • 20 Games</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">{totalCoins.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">Level {currentLevel}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Hero Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Badge className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border-violet-500/30 px-4 py-1.5 text-xs font-medium mb-4">
                  <Sparkles className="w-3 h-3 mr-1.5 inline" />
                  AI-Powered Gaming Experience
                </Badge>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                Play. Compete. Evolve.
              </h2>
              <p className="text-white/50 text-lg max-w-md mx-auto">
                Games that learn, adapt, and challenge you like never before.
              </p>
            </div>

            {/* Featured Games - Large Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onHoverStart={() => setHoveredGame(game.id)}
                  onHoverEnd={() => setHoveredGame(null)}
                  onClick={() => setActiveGame(game.id)}
                  className="group relative cursor-pointer"
                >
                  <div className={`relative h-64 rounded-3xl overflow-hidden bg-gradient-to-br ${game.gradient} p-[1px]`}>
                    <div className="absolute inset-[1px] rounded-3xl bg-black/80 backdrop-blur-xl" />
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      {/* Glow Effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`} />
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <motion.span 
                          className="text-5xl block mb-3"
                          animate={hoveredGame === game.id ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          {game.icon}
                        </motion.span>
                        <h3 className="text-2xl font-semibold tracking-tight">{game.title}</h3>
                        <p className="text-white/50 text-sm">{game.subtitle}</p>
                      </div>
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-xs text-white/40">{game.levels} Levels</span>
                        <motion.div
                          animate={hoveredGame === game.id ? { x: 5 } : { x: 0 }}
                          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors"
                        >
                          <Play className="w-4 h-4 text-white fill-white" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Category Filter - Pill Style */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    activeCategory === cat.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                  <span className={`ml-2 ${activeCategory === cat.id ? 'text-black/50' : 'text-white/30'}`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </motion.section>

          {/* All Games Grid */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xl font-semibold mb-6 text-white/90">
              {activeCategory === 'all' ? 'All Games' : categories.find(c => c.id === activeCategory)?.label}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                    onHoverStart={() => setHoveredGame(game.id)}
                    onHoverEnd={() => setHoveredGame(null)}
                    onClick={() => setActiveGame(game.id)}
                    className="group cursor-pointer"
                  >
                    <div className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-all duration-300 hover:bg-white/[0.05]">
                      {/* Game Card */}
                      <div className="p-5">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                          <motion.span
                            animate={hoveredGame === game.id ? { scale: 1.15 } : { scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            {game.icon}
                          </motion.span>
                        </div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-white/90">{game.title}</h4>
                          {game.isNew && <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px] px-1.5 py-0">NEW</Badge>}
                          {game.isMultiplayer && <Users className="w-3 h-3 text-blue-400" />}
                        </div>
                        <p className="text-xs text-white/40 mb-3">{game.subtitle}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/30 uppercase tracking-wider">{game.levels} Levels</span>
                          <motion.div
                            animate={hoveredGame === game.id ? { scale: 1.1 } : { scale: 1 }}
                            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Stats Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 mb-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Games', value: '15', icon: '🎮' },
                { label: 'Total Levels', value: '750', icon: '📊' },
                { label: 'AI Challenges', value: '∞', icon: '🤖' },
                { label: 'Daily Rewards', value: '500+', icon: '🎁' },
              ].map((stat, i) => (
                <div 
                  key={stat.label}
                  className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 text-center"
                >
                  <span className="text-2xl mb-2 block">{stat.icon}</span>
                  <p className="text-2xl font-semibold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-white/40">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Leaderboard Preview */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-24"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white/90">Leaderboard</h3>
              <button className="text-sm text-white/40 hover:text-white transition-colors">
                View All
              </button>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
              {[
                { rank: 1, name: 'ProGamer', score: 125000, badge: '🥇' },
                { rank: 2, name: 'AIChallenger', score: 98500, badge: '🥈' },
                { rank: 3, name: 'PulseKing', score: 87200, badge: '🥉' },
              ].map((player, i) => (
                <div 
                  key={player.rank}
                  className={`flex items-center justify-between p-4 ${i !== 2 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{player.badge}</span>
                    <div>
                      <p className="font-medium text-white/90">{player.name}</p>
                      <p className="text-xs text-white/40">Rank #{player.rank}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-white/70">{player.score.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </main>
      </div>
    </>
  );
}
