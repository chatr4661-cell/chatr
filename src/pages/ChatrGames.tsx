import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Gamepad2, Trophy, Coins, Zap, Star, ChevronRight, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

type GameType = 'hub' | 'parallel_you' | 'map_hunt' | 'emotionsync' | 'energy_pulse' | 'mindmaze' | 'socialstorm' | 'avawars' | 'dreamforge' | 'frequencyclash' | 'shadowverse';

const games = [
  { id: 'parallel_you' as GameType, title: 'Parallel You', subtitle: 'AI Doppelganger', description: 'Battle your AI twin', icon: '🧬', gradient: 'from-violet-600 via-purple-600 to-indigo-700', glow: 'shadow-violet-500/40', levels: 50, featured: true },
  { id: 'mindmaze' as GameType, title: 'MindMaze', subtitle: 'Thought Reader', description: 'Can AI guess your thoughts?', icon: '🧠', gradient: 'from-indigo-500 via-purple-600 to-violet-700', glow: 'shadow-indigo-500/40', levels: 50, featured: true },
  { id: 'avawars' as GameType, title: 'AVA Wars', subtitle: 'AI Battle Arena', description: 'Your personality fights', icon: '⚔️', gradient: 'from-red-500 via-rose-600 to-pink-600', glow: 'shadow-rose-500/40', levels: 50, featured: true },
  { id: 'dreamforge' as GameType, title: 'DreamForge', subtitle: 'Dream Worlds', description: 'Play inside your dreams', icon: '🌙', gradient: 'from-purple-500 via-indigo-600 to-blue-700', glow: 'shadow-purple-500/40', levels: 50, featured: false },
  { id: 'socialstorm' as GameType, title: 'SocialStorm', subtitle: 'Viral Predictor', description: 'Predict what goes viral', icon: '🔥', gradient: 'from-orange-500 via-red-500 to-rose-600', glow: 'shadow-red-500/40', levels: 50, featured: false },
  { id: 'shadowverse' as GameType, title: 'ShadowVerse', subtitle: 'Dark Side', description: 'Explore your shadow self', icon: '👻', gradient: 'from-slate-600 via-violet-700 to-purple-900', glow: 'shadow-violet-500/40', levels: 50, featured: false },
  { id: 'emotionsync' as GameType, title: 'EmotionSync', subtitle: 'Emotion Control', description: 'Emotions as controller', icon: '🎭', gradient: 'from-pink-500 via-rose-500 to-red-500', glow: 'shadow-pink-500/40', levels: 50, featured: false },
  { id: 'frequencyclash' as GameType, title: 'Frequency Clash', subtitle: 'Voice Control', description: 'Control with voice', icon: '🎤', gradient: 'from-emerald-500 via-teal-500 to-cyan-600', glow: 'shadow-emerald-500/40', levels: 50, featured: false },
  { id: 'map_hunt' as GameType, title: 'Map Hunt', subtitle: 'Treasure Quest', description: 'Real-world discoveries', icon: '🗺️', gradient: 'from-amber-500 via-orange-500 to-red-600', glow: 'shadow-orange-500/40', levels: 50, featured: false },
  { id: 'energy_pulse' as GameType, title: 'Energy Pulse', subtitle: 'Rhythm Flow', description: 'Hypnotic rhythm game', icon: '⚡', gradient: 'from-cyan-500 via-blue-500 to-indigo-600', glow: 'shadow-cyan-500/40', levels: 50, featured: false },
];

export default function ChatrGames() {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<GameType>('hub');
  const [totalCoins] = useState(2500);
  const [totalXP] = useState(12500);

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
      default: return null;
    }
  };

  if (activeGame !== 'hub') return renderGame();

  const featuredGames = games.filter(g => g.featured);
  const otherGames = games.filter(g => !g.featured);

  return (
    <>
      <SEOHead 
        title="CHATR Games - World's Best AI Gaming Platform"
        description="10 revolutionary AI-native games with 500 levels. Parallel You, MindMaze, AVA Wars, DreamForge & more."
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>

        {/* Header */}
        <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="text-white/70 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-purple-400" />
                    CHATR Games
                  </h1>
                  <p className="text-xs text-white/50">World's Best AI Gaming Platform</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">{totalCoins.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 bg-purple-500/20 px-3 py-1.5 rounded-full">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-400 font-bold text-sm">{totalXP.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-6xl mx-auto px-4 py-6 pb-24">
          {/* Hero Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <Badge className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white border-0 px-4 py-1.5 text-sm">
              <Sparkles className="w-3 h-3 mr-1" /> 10 World-First Games • 500 Levels • Infinite Fun
            </Badge>
          </motion.div>

          {/* Featured Games */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">Featured Games</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`relative overflow-hidden cursor-pointer bg-gradient-to-br ${game.gradient} border-0 shadow-2xl ${game.glow} h-full`}
                    onClick={() => setActiveGame(game.id)}
                  >
                    <CardContent className="p-5">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <motion.span 
                            className="text-5xl"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            {game.icon}
                          </motion.span>
                          <Badge className="bg-white/20 text-white border-0 text-xs">{game.levels} Levels</Badge>
                        </div>
                        <h3 className="text-xl font-bold text-white">{game.title}</h3>
                        <p className="text-white/70 text-sm mb-3">{game.subtitle}</p>
                        <p className="text-white/80 text-xs mb-4">{game.description}</p>
                        <Button size="sm" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                          Play Now <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* All Games Grid */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">All Games</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {otherGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card 
                    className={`relative overflow-hidden cursor-pointer bg-gradient-to-br ${game.gradient} border-0 shadow-xl ${game.glow}`}
                    onClick={() => setActiveGame(game.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <motion.span 
                        className="text-4xl block mb-2"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                      >
                        {game.icon}
                      </motion.span>
                      <h3 className="text-base font-bold text-white">{game.title}</h3>
                      <p className="text-white/70 text-xs mb-2">{game.subtitle}</p>
                      <Badge className="bg-white/20 text-white border-0 text-xs">{game.levels} Lvls</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Daily Challenge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
            <Card className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-yellow-500/30 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30"
                    >
                      🔥
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Daily Challenge</h3>
                      <p className="text-white/60 text-sm">Play all 10 games for 10x bonus!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-400">0/10</p>
                      <p className="text-xs text-white/50">Completed</p>
                    </div>
                    <Progress value={0} className="w-24 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6">
            <Card className="bg-slate-900/50 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Global Leaderboard
                  </h3>
                  <Button variant="ghost" size="sm" className="text-white/70 text-xs">View All</Button>
                </div>
                <div className="space-y-2">
                  {[
                    { rank: 1, name: 'ProGamer99', score: 125000, avatar: '🥇' },
                    { rank: 2, name: 'AIChallenger', score: 98500, avatar: '🥈' },
                    { rank: 3, name: 'PulseKing', score: 87200, avatar: '🥉' },
                  ].map((player) => (
                    <div key={player.rank} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{player.avatar}</span>
                        <div>
                          <p className="text-white font-medium text-sm">{player.name}</p>
                          <p className="text-white/50 text-xs">Rank #{player.rank}</p>
                        </div>
                      </div>
                      <p className="text-purple-400 font-bold">{player.score.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
}
