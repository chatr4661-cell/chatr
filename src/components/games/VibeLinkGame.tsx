import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Trophy, Sparkles, Music, Smile, Frown, Meh, Angry, Laugh } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VibeLinkGameProps {
  level: number;
  onComplete: (score: number) => void;
  onBack: () => void;
}

type Emotion = 'happy' | 'sad' | 'excited' | 'calm' | 'angry' | 'love';

const VibeLinkGame = ({ level, onComplete, onBack }: VibeLinkGameProps) => {
  const [gameState, setGameState] = useState<'waiting' | 'syncing' | 'playing' | 'result'>('waiting');
  const [targetEmotion, setTargetEmotion] = useState<Emotion>('happy');
  const [myEmotion, setMyEmotion] = useState<Emotion | null>(null);
  const [partnerEmotion, setPartnerEmotion] = useState<Emotion | null>(null);
  const [vibeLevel, setVibeLevel] = useState(50);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const emotions: { type: Emotion; icon: any; color: string; label: string }[] = [
    { type: 'happy', icon: Smile, color: 'from-yellow-500 to-amber-500', label: 'Happy' },
    { type: 'sad', icon: Frown, color: 'from-blue-500 to-indigo-500', label: 'Sad' },
    { type: 'excited', icon: Laugh, color: 'from-orange-500 to-red-500', label: 'Excited' },
    { type: 'calm', icon: Meh, color: 'from-teal-500 to-cyan-500', label: 'Calm' },
    { type: 'angry', icon: Angry, color: 'from-red-600 to-rose-600', label: 'Angry' },
    { type: 'love', icon: Heart, color: 'from-pink-500 to-rose-500', label: 'Love' }
  ];

  const startGame = () => {
    setGameState('syncing');
    
    // Set random target emotion
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)].type;
    setTargetEmotion(randomEmotion);
    
    setTimeout(() => {
      setGameState('playing');
    }, 2000);
  };

  const selectEmotion = async (emotion: Emotion) => {
    setMyEmotion(emotion);

    // Simulate partner selection
    setTimeout(() => {
      const partnerChoice = emotions[Math.floor(Math.random() * emotions.length)].type;
      setPartnerEmotion(partnerChoice);

      // Calculate vibe sync
      const bothMatchTarget = emotion === targetEmotion && partnerChoice === targetEmotion;
      const oneMatches = emotion === targetEmotion || partnerChoice === targetEmotion;
      const emotionsMatch = emotion === partnerChoice;

      let roundScore = 0;
      let newVibeLevel = vibeLevel;

      if (bothMatchTarget) {
        roundScore = 300 + level * 50;
        newVibeLevel = Math.min(100, vibeLevel + 20);
        setStreak(streak + 1);
      } else if (emotionsMatch) {
        roundScore = 200 + level * 30;
        newVibeLevel = Math.min(100, vibeLevel + 10);
        setStreak(streak + 1);
      } else if (oneMatches) {
        roundScore = 100;
        newVibeLevel = vibeLevel;
        setStreak(0);
      } else {
        roundScore = 0;
        newVibeLevel = Math.max(0, vibeLevel - 15);
        setStreak(0);
      }

      const streakBonus = streak * 25;
      setTotalScore(prev => prev + roundScore + streakBonus);
      setVibeLevel(newVibeLevel);
      setGameState('result');
    }, 1500);
  };

  const nextRound = () => {
    if (round >= 5 || vibeLevel <= 0) {
      onComplete(totalScore);
    } else {
      setRound(round + 1);
      setMyEmotion(null);
      setPartnerEmotion(null);
      startGame();
    }
  };

  const getEmotionInfo = (type: Emotion) => emotions.find(e => e.type === type)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-950 via-pink-900 to-purple-950 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70">
            ← Back
          </Button>
          <Badge className="bg-rose-500/30 text-rose-200">
            Level {level} • Round {round}/5
          </Badge>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6 rounded-3xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">VibeLink</h2>
            <p className="text-white/60 text-sm">Stay emotionally connected with your partner!</p>
          </div>

          {/* Vibe Meter */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-white/60 mb-2">
              <span>Vibe Connection</span>
              <span>{vibeLevel}%</span>
            </div>
            <div className="h-3 bg-black/30 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  vibeLevel > 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  vibeLevel > 30 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                  'bg-gradient-to-r from-red-500 to-rose-500'
                }`}
                style={{ width: `${vibeLevel}%` }}
              />
            </div>
            {streak > 0 && (
              <p className="text-center text-yellow-400 text-sm mt-2">🔥 {streak} streak!</p>
            )}
          </div>

          {gameState === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/30 animate-pulse flex items-center justify-center">
                  <Heart className="w-8 h-8 text-rose-300" />
                </div>
                <Music className="w-6 h-6 text-purple-400 animate-bounce" />
                <div className="w-16 h-16 rounded-full bg-purple-500/30 animate-pulse flex items-center justify-center">
                  <Heart className="w-8 h-8 text-purple-300" />
                </div>
              </div>
              <p className="text-white/70">Feel the same emotion as your partner to stay connected!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-rose-500 to-purple-500 text-white px-8 py-6 rounded-2xl">
                Connect Vibes
              </Button>
            </div>
          )}

          {gameState === 'syncing' && (
            <div className="text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-yellow-400 animate-spin" />
              <p className="text-white text-lg">Feel this emotion together...</p>
              <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${getEmotionInfo(targetEmotion).color}`}>
                {(() => {
                  const Icon = getEmotionInfo(targetEmotion).icon;
                  return <Icon className="w-8 h-8 text-white" />;
                })()}
                <span className="text-white text-xl font-bold">{getEmotionInfo(targetEmotion).label}</span>
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="space-y-4">
              <p className="text-center text-white/80 mb-4">
                Target: <span className="text-rose-400 font-bold">{getEmotionInfo(targetEmotion).label}</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                {emotions.map(({ type, icon: Icon, color, label }) => (
                  <Button
                    key={type}
                    onClick={() => selectEmotion(type)}
                    disabled={myEmotion !== null}
                    className={`flex flex-col items-center gap-2 p-4 h-auto rounded-2xl transition-all ${
                      myEmotion === type ? `bg-gradient-to-br ${color} scale-105` : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
              {myEmotion && !partnerEmotion && (
                <p className="text-center text-white/60 animate-pulse">Waiting for partner...</p>
              )}
            </div>
          )}

          {gameState === 'result' && myEmotion && partnerEmotion && (
            <div className="text-center space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${getEmotionInfo(myEmotion).color}`}>
                  {(() => {
                    const Icon = getEmotionInfo(myEmotion).icon;
                    return <Icon className="w-10 h-10 mx-auto text-white" />;
                  })()}
                  <p className="text-white text-sm mt-2">You</p>
                </div>
                <div className="text-4xl">
                  {myEmotion === partnerEmotion ? '💕' : myEmotion === targetEmotion || partnerEmotion === targetEmotion ? '✨' : '💔'}
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${getEmotionInfo(partnerEmotion).color}`}>
                  {(() => {
                    const Icon = getEmotionInfo(partnerEmotion).icon;
                    return <Icon className="w-10 h-10 mx-auto text-white" />;
                  })()}
                  <p className="text-white text-sm mt-2">Partner</p>
                </div>
              </div>
              <p className="text-white/60">
                {myEmotion === partnerEmotion && myEmotion === targetEmotion ? '🎉 Perfect Vibe Sync!' :
                 myEmotion === partnerEmotion ? '💫 Emotional Match!' :
                 myEmotion === targetEmotion || partnerEmotion === targetEmotion ? '👍 Partial Connection' :
                 '😢 Vibe Lost...'}
              </p>
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span>Total: {totalScore} pts</span>
              </div>
              <Button onClick={nextRound} className="bg-gradient-to-r from-rose-500 to-purple-500 px-8 py-6 rounded-2xl">
                {round >= 5 || vibeLevel <= 0 ? 'Finish Game' : 'Next Vibe'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VibeLinkGame;
