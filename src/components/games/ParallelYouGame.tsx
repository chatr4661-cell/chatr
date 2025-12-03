import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Brain, Zap, Trophy, Timer, Sparkles, Swords, RefreshCw } from 'lucide-react';

interface ParallelYouGameProps {
  onBack: () => void;
}

type ChallengeType = 'speed' | 'creativity' | 'puzzle' | 'memory' | 'social';

interface Challenge {
  type: ChallengeType;
  question: string;
  options?: string[];
  timeLimit: number;
  aiAnswer?: string;
}

const CHALLENGE_TYPES: { type: ChallengeType; icon: string; name: string }[] = [
  { type: 'speed', icon: '⚡', name: 'Speed Round' },
  { type: 'creativity', icon: '🎨', name: 'Creative Battle' },
  { type: 'puzzle', icon: '🧩', name: 'Puzzle Duel' },
  { type: 'memory', icon: '🧠', name: 'Memory Match' },
  { type: 'social', icon: '💬', name: 'Social Challenge' },
];

const SAMPLE_CHALLENGES: Record<ChallengeType, Challenge[]> = {
  speed: [
    { type: 'speed', question: 'Name 5 fruits in 10 seconds!', timeLimit: 10 },
    { type: 'speed', question: 'Type the alphabet backwards as fast as you can!', timeLimit: 20 },
    { type: 'speed', question: 'List 3 countries that start with "I"', timeLimit: 8 },
  ],
  creativity: [
    { type: 'creativity', question: 'Write a haiku about AI', timeLimit: 60 },
    { type: 'creativity', question: 'Create a new emoji combination that represents "Monday morning"', timeLimit: 30 },
    { type: 'creativity', question: 'Invent a new word and define it', timeLimit: 45 },
  ],
  puzzle: [
    { type: 'puzzle', question: 'What comes next: 2, 6, 12, 20, ?', options: ['28', '30', '32', '24'], timeLimit: 15 },
    { type: 'puzzle', question: 'Unscramble: LLARAPLE', options: ['PARALLEL', 'PERALALL', 'ALLPARELR'], timeLimit: 20 },
    { type: 'puzzle', question: 'Which word doesn\'t belong: Cat, Dog, Table, Fish', options: ['Table', 'Cat', 'Fish', 'Dog'], timeLimit: 10 },
  ],
  memory: [
    { type: 'memory', question: 'Remember this sequence: 🔵🔴🟢🟡 - Now type the colors in order', timeLimit: 15 },
    { type: 'memory', question: 'The code is 7-3-9-1. Close your eyes for 5 seconds, then type it.', timeLimit: 20 },
  ],
  social: [
    { type: 'social', question: 'Write a message that would make a stranger smile', timeLimit: 30 },
    { type: 'social', question: 'Compose a compliment for your AI twin', timeLimit: 25 },
  ],
};

export const ParallelYouGame = ({ onBack }: ParallelYouGameProps) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [selectedType, setSelectedType] = useState<ChallengeType>('speed');

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0 && challenge) {
      handleSubmit();
    }
  }, [timeLeft, gameState]);

  const startChallenge = async (type: ChallengeType) => {
    setSelectedType(type);
    setIsLoading(true);
    
    // Get random challenge from samples
    const challenges = SAMPLE_CHALLENGES[type];
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    
    // Generate AI answer
    try {
      const { data } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'parallel_you_challenge',
          data: {
            challengeType: type,
            challenge: randomChallenge.question,
            personality: { style: 'competitive', humor: 'witty' }
          }
        }
      });
      
      setAiAnswer(data?.data?.response || 'AI is thinking...');
    } catch (error) {
      setAiAnswer('AI ready to compete!');
    }
    
    setChallenge(randomChallenge);
    setTimeLeft(randomChallenge.timeLimit);
    setUserAnswer('');
    setGameState('playing');
    setIsLoading(false);
  };

  const handleSubmit = () => {
    if (!challenge) return;
    
    // Simple scoring logic
    const hasAnswer = userAnswer.trim().length > 0;
    const timeBonus = timeLeft > 0 ? timeLeft * 5 : 0;
    
    let gameResult: 'win' | 'lose' | 'tie';
    let earnedXp = 0;
    let earnedCoins = 0;
    
    if (!hasAnswer) {
      gameResult = 'lose';
      setLosses(prev => prev + 1);
    } else {
      // Random result weighted toward user (60% win, 25% tie, 15% lose)
      const rand = Math.random();
      if (rand < 0.6) {
        gameResult = 'win';
        earnedXp = 50 + timeBonus;
        earnedCoins = 10 + Math.floor(timeBonus / 2);
        setWins(prev => prev + 1);
      } else if (rand < 0.85) {
        gameResult = 'tie';
        earnedXp = 25;
        earnedCoins = 5;
      } else {
        gameResult = 'lose';
        earnedXp = 10;
        setLosses(prev => prev + 1);
      }
    }
    
    setXp(prev => prev + earnedXp);
    setCoins(prev => prev + earnedCoins);
    setResult(gameResult);
    setGameState('result');
    
    // Level up check
    if (xp + earnedXp >= currentLevel * 100) {
      setCurrentLevel(prev => Math.min(prev + 1, 50));
      toast.success(`🎉 Level Up! You're now level ${currentLevel + 1}`);
    }
  };

  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-purple-500/20 border-purple-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{currentLevel}</p>
            <p className="text-xs text-white/60">Level</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/20 border-green-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{wins}</p>
            <p className="text-xs text-white/60">Wins</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/20 border-red-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{losses}</p>
            <p className="text-xs text-white/60">Losses</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/20 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{coins}</p>
            <p className="text-xs text-white/60">Coins</p>
          </CardContent>
        </Card>
      </div>

      {/* XP Progress */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-white/70 text-sm">Level {currentLevel} Progress</span>
            <span className="text-purple-400 text-sm">{xp % 100}/{currentLevel * 100} XP</span>
          </div>
          <Progress value={(xp % 100) / (currentLevel)} className="h-2" />
        </CardContent>
      </Card>

      {/* AI Twin Card */}
      <Card className="bg-gradient-to-br from-violet-600/30 to-purple-900/30 border-violet-500/30">
        <CardContent className="p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-4xl animate-pulse">
            🧬
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Your AI Twin</h3>
          <p className="text-white/60 text-sm mb-3">Evolution Level: {Math.floor(currentLevel / 5) + 1}</p>
          <Badge className="bg-violet-500/30 text-violet-300 border-violet-500/50">
            Learning from your style...
          </Badge>
        </CardContent>
      </Card>

      {/* Challenge Types */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Swords className="h-4 w-4" />
          Choose Your Battle
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {CHALLENGE_TYPES.map((ct) => (
            <Button
              key={ct.type}
              onClick={() => startChallenge(ct.type)}
              disabled={isLoading}
              className="h-auto py-4 bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col gap-2"
              variant="ghost"
            >
              <span className="text-2xl">{ct.icon}</span>
              <span className="text-white">{ct.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderPlaying = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Timer */}
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
        }`}>
          <Timer className="h-5 w-5" />
          <span className="text-2xl font-bold">{timeLeft}s</span>
        </div>
      </div>

      {/* Challenge Card */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/10">
        <CardContent className="p-6">
          <Badge className="mb-4 bg-purple-500/30 text-purple-300">
            {CHALLENGE_TYPES.find(c => c.type === selectedType)?.icon} {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Challenge
          </Badge>
          <h2 className="text-xl font-bold text-white mb-6">{challenge?.question}</h2>

          {challenge?.options ? (
            <div className="grid grid-cols-2 gap-3">
              {challenge.options.map((option, i) => (
                <Button
                  key={i}
                  onClick={() => {
                    setUserAnswer(option);
                    handleSubmit();
                  }}
                  className={`h-auto py-4 ${
                    userAnswer === option 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                  variant="ghost"
                >
                  {option}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="bg-white/5 border-white/20 text-white"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button 
                onClick={handleSubmit} 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Submit Answer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VS Indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl">
            👤
          </div>
          <p className="text-white/70 text-xs mt-1">You</p>
        </div>
        <div className="text-2xl font-bold text-white/50">VS</div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-xl animate-pulse">
            🧬
          </div>
          <p className="text-white/70 text-xs mt-1">AI Twin</p>
        </div>
      </div>
    </motion.div>
  );

  const renderResult = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center"
    >
      {/* Result Banner */}
      <div className={`py-8 rounded-2xl ${
        result === 'win' 
          ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 border border-green-500/50' 
          : result === 'tie'
          ? 'bg-gradient-to-br from-yellow-500/30 to-orange-600/30 border border-yellow-500/50'
          : 'bg-gradient-to-br from-red-500/30 to-rose-600/30 border border-red-500/50'
      }`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-7xl mb-4"
        >
          {result === 'win' ? '🏆' : result === 'tie' ? '🤝' : '😔'}
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {result === 'win' ? 'You Won!' : result === 'tie' ? 'It\'s a Tie!' : 'AI Wins!'}
        </h2>
        <p className="text-white/70">
          {result === 'win' 
            ? 'Your AI twin is learning from your moves!' 
            : result === 'tie'
            ? 'Great minds think alike!'
            : 'Your AI twin is getting smarter!'}
        </p>
      </div>

      {/* Answers Comparison */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <p className="text-white/50 text-xs mb-1">Your Answer</p>
              <p className="text-white">{userAnswer || '(No answer)'}</p>
            </div>
            <div className="text-left">
              <p className="text-white/50 text-xs mb-1">AI's Answer</p>
              <p className="text-purple-300">{aiAnswer}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          onClick={() => setGameState('menu')}
          variant="outline" 
          className="flex-1 border-white/20 text-white"
        >
          Back to Menu
        </Button>
        <Button 
          onClick={() => startChallenge(selectedType)}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Play Again
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            Parallel You
          </h1>
          <Badge className="bg-violet-500/30 text-violet-300">
            Lv.{currentLevel}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-lg mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {gameState === 'menu' && renderMenu()}
          {gameState === 'playing' && renderPlaying()}
          {gameState === 'result' && renderResult()}
        </AnimatePresence>
      </main>
    </div>
  );
};
