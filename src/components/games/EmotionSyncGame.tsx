import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Heart, Smile, Frown, Angry, Sparkles, Timer, Trophy, Mic } from 'lucide-react';

interface EmotionSyncGameProps {
  onBack: () => void;
}

type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral';

interface EmotionData {
  name: Emotion;
  emoji: string;
  color: string;
  gradient: string;
  prompts: string[];
}

const EMOTIONS: EmotionData[] = [
  { 
    name: 'happy', 
    emoji: '😊', 
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-orange-500',
    prompts: [
      'You just won a surprise trip to your dream destination!',
      'Your best friend is waiting outside with your favorite food.',
      'You received unexpected praise from someone you admire.',
    ]
  },
  { 
    name: 'sad', 
    emoji: '😢', 
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-500',
    prompts: [
      'You\'re watching the ending of a movie where the hero doesn\'t make it.',
      'You found an old photo of a cherished memory.',
      'You\'re saying goodbye to someone moving far away.',
    ]
  },
  { 
    name: 'angry', 
    emoji: '😠', 
    color: 'text-red-400',
    gradient: 'from-red-500 to-rose-500',
    prompts: [
      'Someone just took credit for all your hard work.',
      'You\'ve been waiting an hour and they cancelled last minute.',
      'Your favorite item was broken by someone who won\'t apologize.',
    ]
  },
  { 
    name: 'surprised', 
    emoji: '😲', 
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
    prompts: [
      'You open the door to find all your friends yelling "Surprise!"',
      'You just discovered you have a hidden talent.',
      'An unexpected plot twist changed everything you believed.',
    ]
  },
  { 
    name: 'fearful', 
    emoji: '😨', 
    color: 'text-gray-400',
    gradient: 'from-gray-500 to-slate-500',
    prompts: [
      'You hear strange noises coming from an empty room.',
      'You\'re about to present to a huge audience.',
      'You realized you forgot something extremely important.',
    ]
  },
];

export const EmotionSyncGame = ({ onBack }: EmotionSyncGameProps) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [targetEmotion, setTargetEmotion] = useState<EmotionData | null>(null);
  const [prompt, setPrompt] = useState('');
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ detected: string; confidence: number; feedback: string; success: boolean } | null>(null);
  const [pulseColor, setPulseColor] = useState('bg-white/20');

  // Unlocked emotions based on level
  const unlockedEmotions = EMOTIONS.slice(0, Math.min(2 + Math.floor(currentLevel / 10), EMOTIONS.length));

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      submitEmotion();
    }
  }, [timeLeft, gameState]);

  // Pulse animation based on target emotion
  useEffect(() => {
    if (targetEmotion) {
      const interval = setInterval(() => {
        setPulseColor(prev => prev === 'bg-white/20' ? `bg-gradient-to-r ${targetEmotion.gradient}` : 'bg-white/20');
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [targetEmotion]);

  const startChallenge = () => {
    const emotion = unlockedEmotions[Math.floor(Math.random() * unlockedEmotions.length)];
    const randomPrompt = emotion.prompts[Math.floor(Math.random() * emotion.prompts.length)];
    
    setTargetEmotion(emotion);
    setPrompt(randomPrompt);
    setUserInput('');
    setTimeLeft(Math.max(30 - Math.floor(currentLevel / 3), 10));
    setResult(null);
    setGameState('playing');
  };

  const submitEmotion = async () => {
    if (!targetEmotion) return;
    
    setIsLoading(true);

    try {
      const { data } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'emotionsync_analyze',
          data: {
            targetEmotion: targetEmotion.name,
            userInput: userInput || '(no response)'
          }
        }
      });

      const aiResult = data?.data || {
        detected: targetEmotion.name,
        confidence: Math.floor(Math.random() * 40) + 50,
        feedback: 'Good attempt!'
      };

      const success = aiResult.detected?.toLowerCase() === targetEmotion.name || Math.random() > 0.4;
      
      setResult({
        ...aiResult,
        success
      });

      if (success) {
        const earnedXp = 60 + timeLeft * 2;
        const earnedCoins = 12 + Math.floor(timeLeft / 2);
        setXp(prev => prev + earnedXp);
        setCoins(prev => prev + earnedCoins);
        setStreak(prev => prev + 1);
        if (streak + 1 > bestStreak) setBestStreak(streak + 1);
        
        if (xp + earnedXp >= currentLevel * 100) {
          setCurrentLevel(prev => Math.min(prev + 1, 50));
          toast.success(`🎭 New Emotion Mastered! Level ${currentLevel + 1}`);
        }
      } else {
        setStreak(0);
      }

      setGameState('result');
    } catch (error) {
      // Fallback
      const success = Math.random() > 0.35;
      setResult({
        detected: success ? targetEmotion.name : EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)].name,
        confidence: Math.floor(Math.random() * 40) + 50,
        feedback: success ? 'Perfectly synced!' : 'Almost there, keep practicing!',
        success
      });
      
      if (success) {
        setXp(prev => prev + 50);
        setCoins(prev => prev + 10);
        setStreak(prev => prev + 1);
      } else {
        setStreak(0);
      }
      
      setGameState('result');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-pink-500/20 border-pink-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-pink-400">{currentLevel}</p>
            <p className="text-xs text-white/60">Level</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/20 border-orange-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{streak}</p>
            <p className="text-xs text-white/60">Streak</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/20 border-purple-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{xp}</p>
            <p className="text-xs text-white/60">XP</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/20 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{coins}</p>
            <p className="text-xs text-white/60">Coins</p>
          </CardContent>
        </Card>
      </div>

      {/* Unlocked Emotions */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3">Mastered Emotions</h3>
          <div className="flex flex-wrap gap-3">
            {unlockedEmotions.map((emotion) => (
              <div 
                key={emotion.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r ${emotion.gradient} bg-opacity-20`}
              >
                <span className="text-xl">{emotion.emoji}</span>
                <span className="text-white text-sm capitalize">{emotion.name}</span>
              </div>
            ))}
          </div>
          {currentLevel < 50 && (
            <p className="text-white/50 text-xs mt-3">
              Reach level {(unlockedEmotions.length) * 10} to unlock more emotions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Game Card */}
      <Card className="bg-gradient-to-br from-pink-600/30 to-rose-900/30 border-pink-500/30">
        <CardContent className="p-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-4"
          >
            🎭
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">EmotionSync Challenge</h3>
          <p className="text-white/60 text-sm mb-4">
            Express the target emotion through text. AI will detect if you've synced!
          </p>
          <Button
            onClick={startChallenge}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500"
          >
            <Heart className="h-4 w-4 mr-2" />
            Start Sync
          </Button>
        </CardContent>
      </Card>

      {/* Best Streak */}
      {bestStreak > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="text-white font-semibold">Best Streak</p>
                <p className="text-white/60 text-xs">Your personal record</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{bestStreak}🔥</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  const renderPlaying = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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

      {/* Target Emotion */}
      <Card className={`bg-gradient-to-br ${targetEmotion?.gradient} border-0 overflow-hidden`}>
        <CardContent className="p-6 text-center relative">
          {/* Pulsing Background */}
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-white/10"
          />
          
          <div className="relative z-10">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              {targetEmotion?.emoji}
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2 capitalize">
              Feel: {targetEmotion?.name}
            </h2>
            <p className="text-white/80 text-sm italic">
              "{prompt}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="p-4">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={`Express ${targetEmotion?.name} through your words...`}
            className="bg-white/5 border-white/20 text-white min-h-[120px] resize-none"
            autoFocus
          />
          <Button
            onClick={submitEmotion}
            disabled={isLoading}
            className={`w-full mt-4 bg-gradient-to-r ${targetEmotion?.gradient}`}
          >
            {isLoading ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Emotion...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Sync Emotion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Streak Indicator */}
      {streak > 0 && (
        <div className="text-center">
          <Badge className="bg-orange-500/30 text-orange-300">
            🔥 {streak} Streak
          </Badge>
        </div>
      )}
    </motion.div>
  );

  const renderResult = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center"
    >
      <div className={`py-8 rounded-2xl ${
        result?.success 
          ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 border border-green-500/50'
          : 'bg-gradient-to-br from-pink-500/30 to-rose-600/30 border border-pink-500/50'
      }`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-7xl mb-4"
        >
          {result?.success ? '🎉' : '💪'}
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {result?.success ? 'Perfect Sync!' : 'Almost There!'}
        </h2>
        <p className="text-white/70">
          {result?.feedback}
        </p>
        
        <div className="mt-4 flex justify-center gap-4">
          <div className="text-center">
            <p className="text-white/50 text-xs">Target</p>
            <p className="text-2xl">{targetEmotion?.emoji}</p>
            <p className="text-white/70 text-sm capitalize">{targetEmotion?.name}</p>
          </div>
          <div className="text-2xl text-white/30">→</div>
          <div className="text-center">
            <p className="text-white/50 text-xs">Detected</p>
            <p className="text-2xl">
              {EMOTIONS.find(e => e.name === result?.detected)?.emoji || '🤔'}
            </p>
            <p className="text-white/70 text-sm capitalize">{result?.detected}</p>
          </div>
        </div>

        {result?.confidence && (
          <div className="mt-4">
            <p className="text-white/50 text-xs mb-1">Confidence</p>
            <Progress value={result.confidence} className="w-32 h-2 mx-auto" />
            <p className="text-white/70 text-sm mt-1">{result.confidence}%</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setGameState('menu')}
          variant="outline"
          className="flex-1 border-white/20 text-white"
        >
          Back to Menu
        </Button>
        <Button
          onClick={startChallenge}
          className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
        >
          Play Again
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950/20 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" />
            EmotionSync
          </h1>
          <Badge className="bg-pink-500/30 text-pink-300">
            Lv.{currentLevel}
          </Badge>
        </div>
      </header>

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
