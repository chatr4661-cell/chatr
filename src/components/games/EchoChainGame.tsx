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
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70">
            ← Back
          </Button>
          <Badge className="bg-emerald-500/30 text-emerald-200">
            Level {level} • Chain: {chainLength}
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6 rounded-3xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Link2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">EchoChain</h2>
            <p className="text-white/60 text-sm">Build a story together - don't break the chain!</p>
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full bg-emerald-500/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-white/70">Take turns adding to a story. Keep it coherent or the chain breaks!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-6 rounded-2xl">
                Start Chain
              </Button>
            </div>
          )}

          {(gameState === 'yourTurn' || gameState === 'theirTurn') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={isMyTurn ? 'bg-emerald-500' : 'bg-cyan-500'}>
                  {gameState === 'yourTurn' ? 'Your Turn' : "Partner's Turn"}
                </Badge>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">{timeLeft}s</span>
                </div>
              </div>

              <div className="bg-black/30 rounded-2xl p-4 max-h-48 overflow-y-auto">
                {storyChain.map((line, i) => (
                  <p key={i} className={`text-sm mb-2 ${i % 2 === 0 ? 'text-emerald-300' : 'text-cyan-300'}`}>
                    {line}
                  </p>
                ))}
                {gameState === 'theirTurn' && (
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>

              {gameState === 'yourTurn' && (
                <>
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Continue the story..."
                    className="bg-white/10 border-white/20 text-white rounded-2xl py-6"
                    autoFocus
                  />
                  <Button 
                    onClick={submitLine}
                    disabled={!currentInput.trim()}
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-6 rounded-2xl"
                  >
                    Add to Chain
                  </Button>
                </>
              )}
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-yellow-400" />
              <div className="text-4xl font-bold text-white">{chainLength} Links!</div>
              <div className="bg-black/30 rounded-2xl p-4 max-h-32 overflow-y-auto text-left">
                {storyChain.map((line, i) => (
                  <p key={i} className="text-sm text-white/70 mb-1">{line}</p>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span className="text-xl font-bold">{coherenceScore} pts</span>
              </div>
              <Button onClick={() => onComplete(coherenceScore)} className="bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-6 rounded-2xl">
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
