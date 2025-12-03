import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Brain, Sparkles, Eye, Zap, Trophy, Coins, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MindMazeGameProps {
  onBack: () => void;
}

const psychologicalQuestions = [
  "Is it something you can touch?",
  "Does it make you feel peaceful?",
  "Would you find it outdoors?",
  "Is it associated with childhood?",
  "Does it involve movement?",
];

export function MindMazeGame({ onBack }: MindMazeGameProps) {
  const [gamePhase, setGamePhase] = useState<'think' | 'questions' | 'guessing' | 'result'>('think');
  const [secretThought, setSecretThought] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [aiGuess, setAiGuess] = useState('');
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [isThinking, setIsThinking] = useState(false);
  const [typingPattern, setTypingPattern] = useState<number[]>([]);
  const lastKeyTime = useRef<number>(Date.now());

  const handleThoughtInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime.current;
    lastKeyTime.current = now;
    setTypingPattern(prev => [...prev.slice(-10), timeSinceLastKey]);
    setSecretThought(e.target.value);
  };

  const startQuestions = () => {
    if (secretThought.length < 2) {
      toast.error('Think of something first!');
      return;
    }
    setGamePhase('questions');
  };

  const answerQuestion = (answer: string) => {
    setAnswers(prev => [...prev, answer]);
    if (currentQuestion < psychologicalQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      makeGuess();
    }
  };

  const makeGuess = async () => {
    setGamePhase('guessing');
    setIsThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'mindmaze_guess',
          data: {
            answers,
            typingSpeed: typingPattern.length > 0 ? typingPattern.reduce((a, b) => a + b, 0) / typingPattern.length : 200,
            level
          }
        }
      });

      if (error) throw error;
      
      const guess = data?.data?.guess || 'a beautiful sunset';
      setAiGuess(guess);
      setGamePhase('result');
    } catch (err) {
      console.error('AI guess error:', err);
      setAiGuess('something mysterious');
      setGamePhase('result');
    } finally {
      setIsThinking(false);
    }
  };

  const checkResult = (aiWon: boolean) => {
    if (aiWon) {
      setStreak(0);
      toast.error('The AI read your mind! 🧠');
    } else {
      setStreak(prev => prev + 1);
      setCoins(prev => prev + 50 * level);
      toast.success(`+${50 * level} coins! You fooled the AI!`);
    }
    resetGame();
  };

  const resetGame = () => {
    setGamePhase('think');
    setSecretThought('');
    setCurrentQuestion(0);
    setAnswers([]);
    setAiGuess('');
    setTypingPattern([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950">
      {/* Mystical Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-indigo-400/50 rounded-full"
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
            animate={{
              y: [null, Math.random() * -200],
              opacity: [0.5, 0],
            }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-indigo-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-400" />
                  MindMaze
                </h1>
                <p className="text-xs text-indigo-300/70">Can AI read your thoughts?</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                🔥 Streak: {streak}
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
          {gamePhase === 'think' && (
            <motion.div
              key="think"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50"
              >
                <Eye className="w-16 h-16 text-white" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-4">Think of Something...</h2>
              <p className="text-indigo-300/70 mb-8">An object, emotion, place, or memory. Type it secretly below.</p>

              <Card className="bg-slate-900/50 border-indigo-500/30 max-w-md mx-auto">
                <CardContent className="p-6">
                  <Input
                    type="password"
                    placeholder="Type your secret thought..."
                    value={secretThought}
                    onChange={handleThoughtInput}
                    className="bg-slate-800/50 border-indigo-500/30 text-white text-center text-lg"
                  />
                  <p className="text-xs text-indigo-400/50 mt-2">Don't worry, this stays hidden</p>

                  <Button
                    onClick={startQuestions}
                    className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    I'm Ready - Read My Mind
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {gamePhase === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <Progress value={(currentQuestion / psychologicalQuestions.length) * 100} className="mb-8 h-2" />

              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8"
              >
                <Badge className="bg-indigo-500/20 text-indigo-300 mb-4">
                  Question {currentQuestion + 1} of {psychologicalQuestions.length}
                </Badge>
                <h2 className="text-2xl font-bold text-white mb-8">
                  {psychologicalQuestions[currentQuestion]}
                </h2>

                <div className="flex justify-center gap-4">
                  {['Yes', 'No', 'Maybe'].map((answer) => (
                    <Button
                      key={answer}
                      onClick={() => answerQuestion(answer)}
                      className={`px-8 py-6 text-lg ${
                        answer === 'Yes' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300' :
                        answer === 'No' ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300' :
                        'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
                      }`}
                      variant="outline"
                    >
                      {answer}
                    </Button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {gamePhase === 'guessing' && (
            <motion.div
              key="guessing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 mx-auto mb-8 rounded-full border-4 border-indigo-500 border-t-transparent"
              />
              <h2 className="text-2xl font-bold text-white mb-4">Reading your mind...</h2>
              <p className="text-indigo-300/70">Analyzing patterns, pauses, and responses</p>
            </motion.div>
          )}

          {gamePhase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50"
              >
                <Brain className="w-16 h-16 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">I sense you're thinking of...</h2>
              <motion.p
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-8"
              >
                "{aiGuess}"
              </motion.p>

              <p className="text-indigo-300/70 mb-8">Was I correct?</p>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => checkResult(true)}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-8"
                  variant="outline"
                >
                  Yes, you got it! 🎯
                </Button>
                <Button
                  onClick={() => checkResult(false)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-8"
                  variant="outline"
                >
                  Nope, I win! 🏆
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
