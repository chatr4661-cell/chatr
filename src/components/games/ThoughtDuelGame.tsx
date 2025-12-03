import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Users, Trophy, Clock, ThumbsUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ThoughtDuelGameProps {
  level: number;
  onComplete: (score: number) => void;
  onBack: () => void;
}

const ThoughtDuelGame = ({ level, onComplete, onBack }: ThoughtDuelGameProps) => {
  const [gameState, setGameState] = useState<'waiting' | 'prompt' | 'writing' | 'voting' | 'result'>('waiting');
  const [prompt, setPrompt] = useState('');
  const [myDescription, setMyDescription] = useState('');
  const [opponentDescription, setOpponentDescription] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [votes, setVotes] = useState({ me: 0, opponent: 0 });
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [winner, setWinner] = useState<'me' | 'opponent' | 'tie' | null>(null);

  const prompts = [
    "Describe what 'freedom' looks like",
    "Explain the color blue to someone who can't see",
    "What does silence sound like?",
    "Describe the taste of happiness",
    "What would time look like if you could see it?",
    "Describe the feeling of coming home",
    "What does courage smell like?",
    "Explain music to an alien",
    "Describe the weight of a secret",
    "What does hope feel like in your hands?"
  ];

  useEffect(() => {
    if (gameState === 'writing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'writing' && timeLeft === 0) {
      submitDescription();
    }
  }, [gameState, timeLeft]);

  const startGame = () => {
    setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    setGameState('prompt');
    setTimeout(() => {
      setGameState('writing');
      setTimeLeft(30);
    }, 2000);
  };

  const submitDescription = async () => {
    setGameState('voting');

    // Generate opponent's description
    try {
      const { data } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'thoughtduel_generate',
          data: { prompt, level }
        }
      });
      setOpponentDescription(data?.description || "A canvas painted with infinite possibilities, where boundaries dissolve into pure potential.");
    } catch {
      setOpponentDescription("A canvas painted with infinite possibilities, where boundaries dissolve into pure potential.");
    }

    // Simulate voting
    setTimeout(() => {
      const myVotes = Math.floor(Math.random() * 50) + 25;
      const oppVotes = Math.floor(Math.random() * 50) + 25;
      setVotes({ me: myVotes, opponent: oppVotes });
      
      const roundScore = myVotes > oppVotes ? 200 + level * 50 : myVotes === oppVotes ? 100 : 50;
      setTotalScore(prev => prev + roundScore);
      setWinner(myVotes > oppVotes ? 'me' : myVotes < oppVotes ? 'opponent' : 'tie');
      
      setGameState('result');
    }, 3000);
  };

  const nextRound = () => {
    if (round >= 3) {
      onComplete(totalScore);
    } else {
      setRound(round + 1);
      setMyDescription('');
      setOpponentDescription('');
      setVotes({ me: 0, opponent: 0 });
      setWinner(null);
      startGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-900 to-yellow-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70">
            ← Back
          </Button>
          <Badge className="bg-amber-500/30 text-amber-200">
            Level {level} • Round {round}/3
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6 rounded-3xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Swords className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">ThoughtDuel</h2>
            <p className="text-white/60 text-sm">Battle of creative descriptions!</p>
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-amber-300" />
                </div>
                <Swords className="w-8 h-8 text-orange-400 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-orange-500/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-orange-300" />
                </div>
              </div>
              <p className="text-white/70">Describe abstract concepts. The audience decides the winner!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-6 rounded-2xl">
                Enter Arena
              </Button>
            </div>
          )}

          {gameState === 'prompt' && (
            <div className="text-center animate-pulse">
              <Sparkles className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
              <p className="text-xl text-white font-medium">{prompt}</p>
            </div>
          )}

          {gameState === 'writing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{timeLeft}s</span>
              </div>
              <p className="text-center text-white/80 mb-2 text-lg">{prompt}</p>
              <Textarea
                value={myDescription}
                onChange={(e) => setMyDescription(e.target.value)}
                placeholder="Write your creative description..."
                className="bg-white/10 border-white/20 text-white min-h-32 rounded-2xl"
                autoFocus
              />
              <Button 
                onClick={submitDescription}
                disabled={!myDescription.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 py-6 rounded-2xl"
              >
                Submit Description
              </Button>
            </div>
          )}

          {gameState === 'voting' && (
            <div className="text-center space-y-4">
              <p className="text-white/60 mb-4">The audience is voting...</p>
              <div className="space-y-4">
                <div className="bg-amber-500/20 rounded-2xl p-4">
                  <p className="text-amber-300 text-sm mb-2">Your Description</p>
                  <p className="text-white text-sm">{myDescription || '...'}</p>
                </div>
                <div className="text-2xl">⚔️</div>
                <div className="bg-orange-500/20 rounded-2xl p-4">
                  <p className="text-orange-300 text-sm mb-2">Opponent's Description</p>
                  <p className="text-white text-sm">{opponentDescription}</p>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <div className="animate-bounce">
                  <ThumbsUp className="w-8 h-8 text-amber-400" />
                </div>
                <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
                  <ThumbsUp className="w-8 h-8 text-orange-400" />
                </div>
              </div>
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center space-y-4">
              <div className={`text-4xl font-bold ${winner === 'me' ? 'text-green-400' : winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'}`}>
                {winner === 'me' ? '🏆 You Won!' : winner === 'opponent' ? '😔 They Won' : '🤝 Tie!'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-500/20 rounded-2xl p-4">
                  <p className="text-white/60 text-sm mb-1">Your Votes</p>
                  <p className="text-2xl font-bold text-amber-400">{votes.me}</p>
                </div>
                <div className="bg-orange-500/20 rounded-2xl p-4">
                  <p className="text-white/60 text-sm mb-1">Their Votes</p>
                  <p className="text-2xl font-bold text-orange-400">{votes.opponent}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span>Total: {totalScore} pts</span>
              </div>
              <Button onClick={nextRound} className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 rounded-2xl">
                {round >= 3 ? 'Finish Duel' : 'Next Round'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ThoughtDuelGame;
