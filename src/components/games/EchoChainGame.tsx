import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, Users, Sparkles, Trophy, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EchoChainGameProps {
  level: number;
  onComplete: (score: number) => void;
  onBack: () => void;
}

const EchoChainGame = ({ level, onComplete, onBack }: EchoChainGameProps) => {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'yourTurn' | 'theirTurn' | 'result'>('waiting');
  const [storyChain, setStoryChain] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [chainLength, setChainLength] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [coherenceScore, setCoherenceScore] = useState(0);

  const storyStarters = [
    "Once upon a time in a digital world",
    "The AI woke up and realized",
    "In the year 3000, humans discovered",
    "A mysterious message appeared on every screen",
    "The last robot on Earth wondered"
  ];

  useEffect(() => {
    if ((gameState === 'yourTurn' || gameState === 'theirTurn') && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'yourTurn' && timeLeft === 0) {
      endGame();
    }
  }, [gameState, timeLeft]);

  const startGame = () => {
    const starter = storyStarters[Math.floor(Math.random() * storyStarters.length)];
    setStoryChain([starter]);
    setChainLength(1);
    setGameState('yourTurn');
    setTimeLeft(15);
    setIsMyTurn(true);
  };

  const submitLine = async () => {
    if (!currentInput.trim()) return;

    const newChain = [...storyChain, currentInput];
    setStoryChain(newChain);
    setChainLength(newChain.length);
    setCurrentInput('');

    // Check coherence with AI
    try {
      const { data } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'echochain_evaluate',
          data: { story: newChain }
        }
      });
      
      if (data?.chainBroken) {
        endGame();
        return;
      }
    } catch {
      // Continue without AI check
    }

    // Simulate partner's turn
    setGameState('theirTurn');
    setTimeLeft(15);
    
    setTimeout(() => {
      const partnerLines = [
        "which led to an unexpected discovery",
        "but nobody could have predicted what happened next",
        "and the world was never the same",
        "revealing a truth hidden for centuries",
        "sparking a chain of events that changed everything"
      ];
      const partnerLine = partnerLines[Math.floor(Math.random() * partnerLines.length)];
      setStoryChain(prev => [...prev, partnerLine]);
      setChainLength(prev => prev + 1);
      setGameState('yourTurn');
      setTimeLeft(15);
      setIsMyTurn(true);
    }, 3000);
  };

  const endGame = async () => {
    setGameState('result');
    
    // Calculate final score based on chain length and coherence
    const baseScore = chainLength * 100;
    const levelBonus = level * 50;
    const finalScore = baseScore + levelBonus;
    setCoherenceScore(finalScore);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-3 sm:p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="max-w-lg mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70 px-2 sm:px-3 h-8 sm:h-10 text-sm touch-manipulation">
            ← Back
          </Button>
          <Badge className="bg-emerald-500/30 text-emerald-200 text-[10px] sm:text-xs px-2 sm:px-3">
            Level {level} • Chain: {chainLength}
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex-1 flex flex-col">
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Link2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">EchoChain</h2>
            <p className="text-white/60 text-xs sm:text-sm">Build a story together - don't break the chain!</p>
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-white/70 text-sm sm:text-base px-2">Take turns adding to a story. Keep it coherent or the chain breaks!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-sm sm:text-base touch-manipulation">
                Start Chain
              </Button>
            </div>
          )}

          {(gameState === 'yourTurn' || gameState === 'theirTurn') && (
            <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <Badge className={`text-[10px] sm:text-xs ${isMyTurn ? 'bg-emerald-500' : 'bg-cyan-500'}`}>
                  {gameState === 'yourTurn' ? 'Your Turn' : "Partner's Turn"}
                </Badge>
                <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-400">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="font-bold text-sm sm:text-base">{timeLeft}s</span>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex-1 max-h-[30vh] sm:max-h-48 overflow-y-auto">
                {storyChain.map((line, i) => (
                  <p key={i} className={`text-xs sm:text-sm mb-1.5 sm:mb-2 ${i % 2 === 0 ? 'text-emerald-300' : 'text-cyan-300'}`}>
                    {line}
                  </p>
                ))}
                {gameState === 'theirTurn' && (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>

              {gameState === 'yourTurn' && (
                <div className="space-y-2 sm:space-y-3">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Continue the story..."
                    className="bg-white/10 border-white/20 text-white rounded-xl sm:rounded-2xl py-4 sm:py-6 text-sm sm:text-base"
                    autoFocus
                  />
                  <Button 
                    onClick={submitLine}
                    disabled={!currentInput.trim()}
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-sm sm:text-base touch-manipulation"
                  >
                    Add to Chain
                  </Button>
                </div>
              )}
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center space-y-3 sm:space-y-4 flex-1 flex flex-col justify-center">
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-400" />
              <div className="text-3xl sm:text-4xl font-bold text-white">{chainLength} Links!</div>
              <div className="bg-black/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 max-h-24 sm:max-h-32 overflow-y-auto text-left">
                {storyChain.map((line, i) => (
                  <p key={i} className="text-[11px] sm:text-sm text-white/70 mb-1">{line}</p>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-lg sm:text-xl font-bold">{coherenceScore} pts</span>
              </div>
              <Button onClick={() => onComplete(coherenceScore)} className="bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-sm sm:text-base touch-manipulation">
                Complete Level
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EchoChainGame;
