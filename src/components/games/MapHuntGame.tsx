import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Map, Key, Camera, Lightbulb, MapPin, Compass, Sparkles, Check, X } from 'lucide-react';

interface MapHuntGameProps {
  onBack: () => void;
}

interface Clue {
  text: string;
  target: string;
  hints: string[];
  difficulty: string;
}

const SAMPLE_CLUES: Clue[] = [
  { text: "Find something blue near where people wait.", target: "blue bench or sign at bus stop", hints: ["Think about public transportation", "Look for seating areas", "The color is important"], difficulty: "easy" },
  { text: "Seek the guardian of knowledge, bound in silence.", target: "bookshelf or library", hints: ["What holds many stories?", "Silence is expected here", "Paper lives here"], difficulty: "easy" },
  { text: "Where water flows but fish don't swim.", target: "fountain or tap", hints: ["Man-made water", "Not natural", "Often decorative"], difficulty: "medium" },
  { text: "The metal tree that lights the night.", target: "street lamp or lamp post", hints: ["Made of metal", "Stands tall", "Brings light"], difficulty: "medium" },
  { text: "Find where strangers become friends over heated beans.", target: "coffee shop", hints: ["A beverage place", "Social gathering", "Caffeine involved"], difficulty: "medium" },
  { text: "The portal that reflects your soul.", target: "mirror", hints: ["You see yourself", "Made of glass", "Shows the truth"], difficulty: "hard" },
  { text: "Where time stands still but hands keep moving.", target: "clock", hints: ["Measures time", "Has a face", "Numbers surround it"], difficulty: "hard" },
  { text: "The silent messenger of a thousand words.", target: "billboard or poster", hints: ["Advertising", "Visual communication", "Large and visible"], difficulty: "hard" },
];

export const MapHuntGame = ({ onBack }: MapHuntGameProps) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [keysFound, setKeysFound] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'hunting' | 'verify' | 'result'>('menu');
  const [currentClue, setCurrentClue] = useState<Clue | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [photoDescription, setPhotoDescription] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean; confidence: number; feedback: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startHunt = () => {
    const levelIndex = Math.min(currentLevel - 1, SAMPLE_CLUES.length - 1);
    const clue = SAMPLE_CLUES[levelIndex % SAMPLE_CLUES.length];
    setCurrentClue(clue);
    setHintsUsed(0);
    setShowHint(false);
    setPhotoDescription('');
    setVerificationResult(null);
    setGameState('hunting');
  };

  const useHint = () => {
    if (!currentClue || hintsUsed >= 3) return;
    setHintsUsed(prev => prev + 1);
    setShowHint(true);
    toast.info(`Hint ${hintsUsed + 1}: ${currentClue.hints[hintsUsed]}`);
  };

  const handlePhotoCapture = () => {
    setGameState('verify');
  };

  const verifyFind = async () => {
    if (!currentClue || !photoDescription.trim()) {
      toast.error('Please describe what you found');
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await supabase.functions.invoke('chatr-games-ai', {
        body: {
          action: 'map_hunt_verify',
          data: {
            clue: currentClue.text,
            target: currentClue.target,
            photoDescription: photoDescription
          }
        }
      });

      const result = data?.data || { verified: Math.random() > 0.3, confidence: Math.floor(Math.random() * 40) + 60, feedback: 'Good effort!' };
      setVerificationResult(result);
      
      if (result.verified) {
        const baseCoins = 20 - (hintsUsed * 5);
        const baseXp = 75 - (hintsUsed * 15);
        setCoins(prev => prev + Math.max(baseCoins, 5));
        setXp(prev => prev + Math.max(baseXp, 20));
        setKeysFound(prev => prev + 1);
        
        if (xp + baseXp >= currentLevel * 100) {
          setCurrentLevel(prev => Math.min(prev + 1, 50));
          toast.success(`🗝️ Mystery Key Found! Level ${currentLevel + 1} Unlocked!`);
        }
      }
      
      setGameState('result');
    } catch (error) {
      // Fallback verification
      const verified = Math.random() > 0.3;
      setVerificationResult({
        verified,
        confidence: Math.floor(Math.random() * 40) + 60,
        feedback: verified ? 'Great find! The treasure is yours!' : 'Not quite right, but keep exploring!'
      });
      
      if (verified) {
        setCoins(prev => prev + 15);
        setXp(prev => prev + 50);
        setKeysFound(prev => prev + 1);
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
        <Card className="bg-amber-500/20 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{currentLevel}</p>
            <p className="text-xs text-white/60">Level</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/20 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{keysFound}</p>
            <p className="text-xs text-white/60">Keys</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/20 border-orange-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{xp}</p>
            <p className="text-xs text-white/60">XP</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/20 border-red-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{coins}</p>
            <p className="text-xs text-white/60">Coins</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-white/70 text-sm">Explorer Rank</span>
            <span className="text-amber-400 text-sm">{xp}/{currentLevel * 100} XP</span>
          </div>
          <Progress value={(xp % 100) / currentLevel} className="h-2" />
        </CardContent>
      </Card>

      {/* Map Preview */}
      <Card className="bg-gradient-to-br from-amber-600/20 to-orange-800/20 border-amber-500/30 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-48 bg-gradient-to-br from-amber-900/50 to-orange-900/50 flex items-center justify-center">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 left-4 w-8 h-8 border-2 border-amber-400 rounded-full animate-ping" />
              <div className="absolute bottom-8 right-8 w-6 h-6 border-2 border-yellow-400 rounded-full animate-pulse" />
              <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-red-500 rounded-full animate-bounce" />
            </div>
            <div className="text-center z-10">
              <MapPin className="h-12 w-12 text-amber-400 mx-auto mb-2 animate-bounce" />
              <h3 className="text-xl font-bold text-white">Mystery Awaits</h3>
              <p className="text-white/60 text-sm">Level {currentLevel} Hunt Ready</p>
            </div>
          </div>
          <div className="p-4">
            <Button 
              onClick={startHunt}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Compass className="h-4 w-4 mr-2" />
              Start Hunt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Finds */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Key className="h-4 w-4 text-yellow-400" />
            Mystery Keys Collected
          </h3>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: Math.min(keysFound, 10) }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-lg">
                🗝️
              </div>
            ))}
            {keysFound === 0 && (
              <p className="text-white/50 text-sm">No keys found yet. Start exploring!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderHunting = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Clue Card */}
      <Card className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 border-amber-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-amber-500/30 text-amber-300">
              Level {currentLevel} Clue
            </Badge>
            <Badge variant="outline" className="border-white/30 text-white/70">
              {3 - hintsUsed} hints left
            </Badge>
          </div>

          <div className="bg-black/20 rounded-lg p-4 mb-4">
            <p className="text-xl text-amber-200 italic text-center leading-relaxed">
              "{currentClue?.text}"
            </p>
          </div>

          {showHint && hintsUsed > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4"
            >
              <p className="text-yellow-300 text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                {currentClue?.hints[hintsUsed - 1]}
              </p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={useHint}
              disabled={hintsUsed >= 3}
              variant="outline"
              className="flex-1 border-amber-500/50 text-amber-300"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Use Hint
            </Button>
            <Button
              onClick={handlePhotoCapture}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <Camera className="h-4 w-4 mr-2" />
              I Found It!
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h4 className="text-white/70 text-sm mb-2">Hunt Tips:</h4>
          <ul className="text-white/50 text-xs space-y-1">
            <li>• Look around your current location</li>
            <li>• Think metaphorically about the clue</li>
            <li>• Common objects can be treasure!</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderVerify = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Camera className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Verify Your Find</h3>
            <p className="text-white/60 text-sm">Describe what you found to verify your discovery</p>
          </div>

          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-amber-300 text-sm italic">
                Clue: "{currentClue?.text}"
              </p>
            </div>

            <Input
              value={photoDescription}
              onChange={(e) => setPhotoDescription(e.target.value)}
              placeholder="Describe what you found (e.g., 'A blue bench at the bus stop')"
              className="bg-white/5 border-white/20 text-white"
            />

            <Button
              onClick={verifyFind}
              disabled={isLoading || !photoDescription.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {isLoading ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  AI Verifying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Verify Discovery
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderResult = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center"
    >
      <div className={`py-8 rounded-2xl ${
        verificationResult?.verified 
          ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 border border-green-500/50'
          : 'bg-gradient-to-br from-orange-500/30 to-red-600/30 border border-orange-500/50'
      }`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-7xl mb-4"
        >
          {verificationResult?.verified ? '🗝️' : '🔍'}
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {verificationResult?.verified ? 'Treasure Found!' : 'Keep Searching!'}
        </h2>
        <p className="text-white/70 px-4">
          {verificationResult?.feedback}
        </p>
        {verificationResult?.verified && (
          <div className="mt-4 flex justify-center gap-4">
            <Badge className="bg-yellow-500/30 text-yellow-300">
              +{20 - hintsUsed * 5} Coins
            </Badge>
            <Badge className="bg-purple-500/30 text-purple-300">
              +{75 - hintsUsed * 15} XP
            </Badge>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setGameState('menu')}
          variant="outline"
          className="flex-1 border-white/20 text-white"
        >
          Back to Map
        </Button>
        <Button
          onClick={startHunt}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
        >
          Next Hunt
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Map className="h-5 w-5 text-amber-400" />
            Map Hunt
          </h1>
          <Badge className="bg-amber-500/30 text-amber-300">
            Lv.{currentLevel}
          </Badge>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {gameState === 'menu' && renderMenu()}
          {gameState === 'hunting' && renderHunting()}
          {gameState === 'verify' && renderVerify()}
          {gameState === 'result' && renderResult()}
        </AnimatePresence>
      </main>
    </div>
  );
};
