import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, Zap, Trophy, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncMindGameProps {
  level: number;
  onComplete: (score: number) => void;
  onBack: () => void;
}

const SyncMindGame = ({ level, onComplete, onBack }: SyncMindGameProps) => {
  const [gameState, setGameState] = useState<'waiting' | 'prompt' | 'thinking' | 'reveal' | 'result'>('waiting');
  const [prompt, setPrompt] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [syncScore, setSyncScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [matchId, setMatchId] = useState<string | null>(null);

  const prompts = [
    "Name a color you associate with happiness",
    "First word that comes to mind: SUMMER",
    "Name a food you'd eat at midnight",
    "One word to describe the ocean",
    "Name something you'd find in a pocket",
    "First animal you think of",
    "Name a superhero power",
    "One word: LOVE means...",
    "Name something round",
    "First city that comes to mind"
  ];

  useEffect(() => {
    if (gameState === 'thinking' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'thinking' && timeLeft === 0) {
      submitAnswer();
    }
  }, [gameState, timeLeft]);

  const startGame = () => {
    setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    setGameState('prompt');
    setTimeout(() => {
      setGameState('thinking');
      setTimeLeft(10);
    }, 2000);
  };

  const submitAnswer = async () => {
    setGameState('reveal');
    
    // Simulate partner's answer (in real multiplayer, this would come from another player)
    const simulatedAnswers = ['blue', 'beach', 'pizza', 'calm', 'keys', 'dog', 'fly', 'peace', 'ball', 'Paris'];
    const simAnswer = simulatedAnswers[Math.floor(Math.random() * simulatedAnswers.length)];
    setPartnerAnswer(simAnswer);

    // Calculate sync score using AI
    try {
      const { data } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'syncmind_compare',
          data: { answer1: myAnswer, answer2: simAnswer, prompt }
        }
      });
      
      const score = data?.syncScore || Math.floor(Math.random() * 100);
      setSyncScore(score);
      setTotalScore(prev => prev + score);
      
      setTimeout(() => setGameState('result'), 2000);
    } catch {
      const score = myAnswer.toLowerCase() === simAnswer.toLowerCase() ? 100 : Math.floor(Math.random() * 60);
      setSyncScore(score);
      setTotalScore(prev => prev + score);
      setTimeout(() => setGameState('result'), 2000);
    }
  };

  const nextRound = () => {
    if (round >= 5) {
      onComplete(totalScore);
    } else {
      setRound(round + 1);
      setMyAnswer('');
      setPartnerAnswer('');
      setSyncScore(0);
      startGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70">
            ← Back
          </Button>
          <Badge className="bg-violet-500/30 text-violet-200">
            Level {level} • Round {round}/5
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6 rounded-3xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">SyncMind</h2>
            <p className="text-white/60 text-sm">Think alike with your partner</p>
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-violet-500/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-violet-300" />
                </div>
                <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-fuchsia-500/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-fuchsia-300" />
                </div>
              </div>
              <p className="text-white/70">Match minds with another player!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-8 py-6 rounded-2xl">
                Find Partner
              </Button>
            </div>
          )}

          {gameState === 'prompt' && (
            <div className="text-center animate-pulse">
              <Sparkles className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
              <p className="text-2xl text-white font-medium">{prompt}</p>
            </div>
          )}

          {gameState === 'thinking' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{timeLeft}s</span>
              </div>
              <p className="text-center text-white/80 mb-4">{prompt}</p>
              <Input
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="bg-white/10 border-white/20 text-white text-center text-xl py-6 rounded-2xl"
                autoFocus
              />
              <Button 
                onClick={submitAnswer} 
                disabled={!myAnswer}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 py-6 rounded-2xl"
              >
                Lock In Answer
              </Button>
            </div>
          )}

          {gameState === 'reveal' && (
            <div className="text-center space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-violet-500/20 rounded-2xl p-4">
                  <p className="text-white/60 text-sm mb-2">You said</p>
                  <p className="text-white text-xl font-bold">{myAnswer || '...'}</p>
                </div>
                <div className="bg-fuchsia-500/20 rounded-2xl p-4">
                  <p className="text-white/60 text-sm mb-2">Partner said</p>
                  <p className="text-white text-xl font-bold">{partnerAnswer}</p>
                </div>
              </div>
              <div className="animate-pulse">
                <p className="text-white/60">Calculating sync...</p>
              </div>
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center space-y-4">
              <div className={`text-6xl font-bold ${syncScore >= 70 ? 'text-green-400' : syncScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {syncScore}%
              </div>
              <p className="text-white/60">
                {syncScore >= 70 ? '🎉 Perfect Sync!' : syncScore >= 40 ? '👍 Good Connection!' : '🔄 Keep Trying!'}
              </p>
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span>Total: {totalScore} pts</span>
              </div>
              <Button onClick={nextRound} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-6 rounded-2xl">
                {round >= 5 ? 'Finish Game' : 'Next Round'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SyncMindGame;
