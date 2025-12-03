import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Shield, Zap, Trophy, Coins, Sparkles, MessageSquare, Smile, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AvaWarsGameProps {
  onBack: () => void;
}

const battleTypes = [
  { id: 'rap', name: 'Rap Battle', icon: '🎤', description: 'Spit bars against opponent AVA' },
  { id: 'emoji', name: 'Emoji War', icon: '😎', description: 'Express emotions with emojis' },
  { id: 'debate', name: 'Debate Fight', icon: '💬', description: 'Argue a topic convincingly' },
  { id: 'joke', name: 'Joke Contest', icon: '😂', description: 'Who makes who laugh first?' },
  { id: 'speed', name: 'Speed Talk', icon: '⚡', description: 'Fastest response wins' },
];

const opponents = [
  { name: 'CyberNinja', level: 5, avatar: '🥷', style: 'Aggressive', winRate: 62 },
  { name: 'ChillMaster', level: 8, avatar: '😎', style: 'Calm', winRate: 71 },
  { name: 'MemeLord', level: 12, avatar: '🤪', style: 'Chaotic', winRate: 58 },
  { name: 'PoetSoul', level: 15, avatar: '🎭', style: 'Artistic', winRate: 67 },
  { name: 'LogicKing', level: 20, avatar: '🧠', style: 'Analytical', winRate: 75 },
];

export function AvaWarsGame({ onBack }: AvaWarsGameProps) {
  const [phase, setPhase] = useState<'menu' | 'customize' | 'matchmaking' | 'battle' | 'result'>('menu');
  const [selectedBattle, setSelectedBattle] = useState<string | null>(null);
  const [opponent, setOpponent] = useState(opponents[0]);
  const [battleProgress, setBattleProgress] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [round, setRound] = useState(1);
  const [wins, setWins] = useState(0);
  const [coins, setCoins] = useState(0);
  const [avaLevel, setAvaLevel] = useState(1);
  const [avaXP, setAvaXP] = useState(0);

  const startMatchmaking = (battleType: string) => {
    setSelectedBattle(battleType);
    setPhase('matchmaking');
    
    // Find random opponent
    const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)];
    setOpponent(randomOpponent);

    setTimeout(() => {
      setPhase('battle');
      simulateBattle();
    }, 3000);
  };

  const simulateBattle = () => {
    let pScore = 0;
    let oScore = 0;
    let currentRound = 1;

    const interval = setInterval(() => {
      const playerWins = Math.random() > 0.45; // Slight advantage
      
      if (playerWins) {
        pScore += 10;
        setPlayerScore(pScore);
      } else {
        oScore += 10;
        setOpponentScore(oScore);
      }

      setBattleProgress(prev => Math.min(100, prev + 20));
      setRound(currentRound);
      currentRound++;

      if (currentRound > 5) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase('result');
          if (pScore > oScore) {
            setWins(prev => prev + 1);
            setCoins(prev => prev + 100);
            setAvaXP(prev => {
              const newXP = prev + 50;
              if (newXP >= 100) {
                setAvaLevel(l => l + 1);
                return newXP - 100;
              }
              return newXP;
            });
          }
        }, 1000);
      }
    }, 1500);
  };

  const resetBattle = () => {
    setPhase('menu');
    setSelectedBattle(null);
    setBattleProgress(0);
    setPlayerScore(0);
    setOpponentScore(0);
    setRound(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/30 to-slate-950">
      {/* Battle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        {/* Battle sparks */}
        {phase === 'battle' && [...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            initial={{ 
              x: window.innerWidth / 2, 
              y: window.innerHeight / 2,
              scale: 0 
            }}
            animate={{ 
              x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
              y: window.innerHeight / 2 + (Math.random() - 0.5) * 400,
              scale: [0, 1, 0],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 0.8, repeat: Infinity, delay: Math.random() * 0.5 }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-red-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Swords className="h-5 w-5 text-red-400" />
                  AVA Wars
                </h1>
                <p className="text-xs text-red-300/70">Your AI personality battles others</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                <Trophy className="h-3 w-3 mr-1" /> {wins} Wins
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                <Coins className="h-3 w-3 mr-1" /> {coins}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Game Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {phase === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Your AVA Card */}
              <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30 mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-5xl shadow-xl shadow-red-500/30"
                    >
                      🦸
                    </motion.div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white">Your AVA</h2>
                      <p className="text-red-300/70 mb-2">Level {avaLevel} Fighter</p>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-white/70 mb-1">
                          <span>XP</span>
                          <span>{avaXP}/100</span>
                        </div>
                        <Progress value={avaXP} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-white/10 text-white">💪 +{avaLevel * 5}% Power</Badge>
                        <Badge className="bg-white/10 text-white">⚡ +{avaLevel * 3}% Speed</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Battle Modes */}
              <h3 className="text-xl font-bold text-white mb-4">Choose Battle Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {battleTypes.map((battle) => (
                  <motion.div
                    key={battle.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="bg-slate-900/50 border-red-500/20 cursor-pointer hover:border-red-500/50 transition-all"
                      onClick={() => startMatchmaking(battle.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <span className="text-4xl">{battle.icon}</span>
                        <div>
                          <h4 className="font-bold text-white">{battle.name}</h4>
                          <p className="text-white/50 text-sm">{battle.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'matchmaking' && (
            <motion.div
              key="matchmaking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-8 border-4 border-red-500 border-t-transparent rounded-full"
              />
              <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent...</h2>
              <p className="text-red-300/70">Matching your skill level</p>
            </motion.div>
          )}

          {phase === 'battle' && (
            <motion.div
              key="battle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Battle Arena */}
              <div className="flex items-center justify-between mb-8">
                {/* Player */}
                <motion.div
                  animate={{ x: [-5, 5, -5] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-5xl shadow-xl shadow-blue-500/30">
                    🦸
                  </div>
                  <p className="text-white font-bold">Your AVA</p>
                  <p className="text-3xl font-bold text-blue-400">{playerScore}</p>
                </motion.div>

                {/* VS */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="text-4xl font-bold text-red-500">VS</div>
                  <Badge className="bg-red-500/20 text-red-300 mt-2">Round {round}/5</Badge>
                </motion.div>

                {/* Opponent */}
                <motion.div
                  animate={{ x: [5, -5, 5] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-5xl shadow-xl shadow-red-500/30">
                    {opponent.avatar}
                  </div>
                  <p className="text-white font-bold">{opponent.name}</p>
                  <p className="text-3xl font-bold text-red-400">{opponentScore}</p>
                </motion.div>
              </div>

              {/* Battle Progress */}
              <Card className="bg-slate-900/50 border-white/10">
                <CardContent className="p-6">
                  <div className="flex justify-between text-sm text-white/70 mb-2">
                    <span>Battle Progress</span>
                    <span>{battleProgress}%</span>
                  </div>
                  <Progress value={battleProgress} className="h-3" />
                  
                  <motion.p
                    key={round}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-4 text-white/70"
                  >
                    {playerScore > opponentScore ? 
                      "🔥 Your AVA is dominating!" : 
                      playerScore < opponentScore ?
                      "😤 Fight back!" :
                      "⚔️ Evenly matched!"}
                  </motion.p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5 }}
                className="text-8xl mb-6"
              >
                {playerScore > opponentScore ? '🏆' : '😤'}
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {playerScore > opponentScore ? 'VICTORY!' : 'DEFEAT'}
              </h2>
              <p className="text-white/70 mb-6">
                Final Score: {playerScore} - {opponentScore}
              </p>

              {playerScore > opponentScore && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center gap-4 mb-8"
                >
                  <Badge className="bg-yellow-500/20 text-yellow-300 text-lg px-4 py-2">
                    <Coins className="w-4 h-4 mr-1" /> +100 Coins
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-300 text-lg px-4 py-2">
                    <Sparkles className="w-4 h-4 mr-1" /> +50 XP
                  </Badge>
                </motion.div>
              )}

              <Button
                onClick={resetBattle}
                className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 px-8 py-3"
              >
                <Swords className="w-5 h-5 mr-2" />
                Battle Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
