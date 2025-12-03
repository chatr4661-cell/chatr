import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gamepad2, Trophy, Coins, Zap, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SEOHead } from '@/components/SEOHead';
import { ParallelYouGame } from '@/components/games/ParallelYouGame';
import { MapHuntGame } from '@/components/games/MapHuntGame';
import { EmotionSyncGame } from '@/components/games/EmotionSyncGame';
import { EnergyPulseGame } from '@/components/games/EnergyPulseGame';

type GameType = 'hub' | 'parallel_you' | 'map_hunt' | 'emotionsync' | 'energy_pulse';

const games = [
  {
    id: 'parallel_you' as GameType,
    title: 'Parallel You',
    subtitle: 'AI Doppelganger Battle',
    description: 'Challenge your AI twin that learns from your chat style',
    icon: '🧬',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    glow: 'shadow-violet-500/50',
    levels: 50,
    features: ['AI learns your style', 'Daily challenges', 'Evolution system'],
  },
  {
    id: 'map_hunt' as GameType,
    title: 'Map Hunt',
    subtitle: 'Real-World Treasure Quest',
    description: 'AI-generated clues lead to real-world discoveries',
    icon: '🗺️',
    gradient: 'from-amber-500 via-orange-500 to-red-600',
    glow: 'shadow-orange-500/50',
    levels: 50,
    features: ['Location-based', 'Photo verification', 'Mystery keys'],
  },
  {
    id: 'emotionsync' as GameType,
    title: 'EmotionSync',
    subtitle: 'Emotion Controller Game',
    description: 'Your emotions become the game controller',
    icon: '🎭',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    glow: 'shadow-pink-500/50',
    levels: 50,
    features: ['Voice & text analysis', 'Emotion mastery', 'Self-discovery'],
  },
  {
    id: 'energy_pulse' as GameType,
    title: 'Energy Pulse',
    subtitle: 'Hypnotic Rhythm Game',
    description: 'Match the pulse, enter the flow state',
    icon: '⚡',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    glow: 'shadow-cyan-500/50',
    levels: 50,
    features: ['Rhythm mastery', 'Flow state', 'Dopamine boost'],
  },
];

export default function ChatrGames() {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<GameType>('hub');
  const [totalCoins] = useState(2500);
  const [totalXP] = useState(12500);

  const renderGame = () => {
    switch (activeGame) {
      case 'parallel_you':
        return <ParallelYouGame onBack={() => setActiveGame('hub')} />;
      case 'map_hunt':
        return <MapHuntGame onBack={() => setActiveGame('hub')} />;
      case 'emotionsync':
        return <EmotionSyncGame onBack={() => setActiveGame('hub')} />;
      case 'energy_pulse':
        return <EnergyPulseGame onBack={() => setActiveGame('hub')} />;
      default:
        return null;
    }
  };

  if (activeGame !== 'hub') {
    return renderGame();
  }

  return (
    <>
      <SEOHead 
        title="CHATR Games - World's First AI-Native Games"
        description="Experience revolutionary games that only exist inside CHATR. Parallel You, Map Hunt, EmotionSync, and Energy Pulse."
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
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
                  <p className="text-xs text-white/50">World's First AI-Native Games</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">{totalCoins.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 bg-purple-500/20 px-3 py-1.5 rounded-full">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-400 font-bold text-sm">{totalXP.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 mb-4">
              🎮 4 Revolutionary Games • 200 Levels
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Games That Only Exist in <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">CHATR</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Not copies. Not spin wheels. Completely new mechanics the world has never experienced.
            </p>
          </motion.div>

          {/* Games Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden cursor-pointer group bg-gradient-to-br ${game.gradient} border-0 shadow-xl ${game.glow} hover:scale-[1.02] transition-all duration-300`}
                  onClick={() => setActiveGame(game.id)}
                >
                  <CardContent className="p-6">
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-5xl mb-2 block">{game.icon}</span>
                          <h3 className="text-2xl font-bold text-white">{game.title}</h3>
                          <p className="text-white/70 text-sm">{game.subtitle}</p>
                        </div>
                        <Badge className="bg-white/20 text-white border-0">
                          {game.levels} Levels
                        </Badge>
                      </div>

                      <p className="text-white/80 text-sm mb-4">{game.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {game.features.map((feature, i) => (
                          <Badge key={i} variant="outline" className="border-white/30 text-white/90 text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                          <span className="text-white/90 text-sm">Level 1/50</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1"
                        >
                          Play Now
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Daily Challenge Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-yellow-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">
                      🔥
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Daily Challenge</h3>
                      <p className="text-white/60 text-sm">Complete all 4 games today for 5x bonus coins!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-400">1/4</p>
                      <p className="text-xs text-white/50">Completed</p>
                    </div>
                    <Progress value={25} className="w-32 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Leaderboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <Card className="bg-slate-900/50 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Global Leaderboard
                  </h3>
                  <Button variant="ghost" size="sm" className="text-white/70">
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: 'ProGamer99', score: 125000, avatar: '🥇' },
                    { rank: 2, name: 'AIChallenger', score: 98500, avatar: '🥈' },
                    { rank: 3, name: 'PulseKing', score: 87200, avatar: '🥉' },
                  ].map((player) => (
                    <div key={player.rank} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{player.avatar}</span>
                        <div>
                          <p className="text-white font-medium">{player.name}</p>
                          <p className="text-white/50 text-xs">Rank #{player.rank}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-bold">{player.score.toLocaleString()}</p>
                        <p className="text-white/50 text-xs">Total XP</p>
                      </div>
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
