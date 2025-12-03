import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Moon, Sparkles, Star, CloudMoon, Wand2, Coins, Trophy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DreamForgeGameProps {
  onBack: () => void;
}

const dreamElements = [
  { type: 'sky', options: ['starry night', 'aurora borealis', 'sunset clouds', 'cosmic void'] },
  { type: 'ground', options: ['crystal field', 'floating islands', 'endless ocean', 'mirror floor'] },
  { type: 'object', options: ['glowing orb', 'ancient door', 'floating clock', 'memory tree'] },
];

export function DreamForgeGame({ onBack }: DreamForgeGameProps) {
  const [phase, setPhase] = useState<'input' | 'generating' | 'explore' | 'puzzle' | 'reward'>('input');
  const [dreamText, setDreamText] = useState('');
  const [dreamWorld, setDreamWorld] = useState<any>(null);
  const [shardsCollected, setShardsCollected] = useState(0);
  const [totalShards, setTotalShards] = useState(7);
  const [coins, setCoins] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const generateDreamWorld = async () => {
    if (dreamText.length < 10) {
      toast.error('Describe your dream in more detail');
      return;
    }

    setPhase('generating');

    // Simulate AI generation
    setTimeout(() => {
      const sky = dreamElements[0].options[Math.floor(Math.random() * 4)];
      const ground = dreamElements[1].options[Math.floor(Math.random() * 4)];
      const object = dreamElements[2].options[Math.floor(Math.random() * 4)];
      
      setDreamWorld({
        sky,
        ground,
        object,
        mood: dreamText.includes('scary') || dreamText.includes('nightmare') ? 'dark' : 'dreamy',
        puzzle: {
          question: `In your dream, you see a ${object}. What does it represent?`,
          options: ['Hope', 'Fear', 'Memory', 'Desire'],
          correct: Math.floor(Math.random() * 4)
        }
      });
      setCurrentPuzzle(['Hope', 'Fear', 'Memory', 'Desire']);
      setPhase('explore');
    }, 3000);
  };

  const solvePuzzle = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    
    setTimeout(() => {
      if (answerIndex === dreamWorld.puzzle.correct) {
        setPuzzleSolved(true);
        setShardsCollected(prev => prev + 1);
        setCoins(prev => prev + 75);
        toast.success('Dream Shard collected! ✨');
        setPhase('reward');
      } else {
        toast.error('That doesn\'t feel right... Try again');
        setSelectedAnswer(null);
      }
    }, 500);
  };

  const resetGame = () => {
    setPhase('input');
    setDreamText('');
    setDreamWorld(null);
    setPuzzleSolved(false);
    setSelectedAnswer(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30">
      {/* Dreamy Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        {/* Floating stars */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            <Star className="w-2 h-2 text-purple-300/50 fill-purple-300/50" />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Moon className="h-5 w-5 text-purple-400" />
                  DreamForge
                </h1>
                <p className="text-xs text-purple-300/70">Turn dreams into worlds</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Star className="h-3 w-3 mr-1 fill-purple-300" /> {shardsCollected}/{totalShards} Shards
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
          {phase === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30"
              >
                <CloudMoon className="w-16 h-16 text-white" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-4">Describe Your Dream</h2>
              <p className="text-purple-300/70 mb-8">Tell me about a dream or nightmare...</p>

              <Card className="bg-slate-900/50 border-purple-500/30 max-w-xl mx-auto">
                <CardContent className="p-6">
                  <Textarea
                    placeholder="I was floating above clouds, and there was a golden door in the sky..."
                    value={dreamText}
                    onChange={(e) => setDreamText(e.target.value)}
                    className="bg-slate-800/50 border-purple-500/30 text-white min-h-[150px] text-lg"
                  />
                  
                  <Button
                    onClick={generateDreamWorld}
                    className="w-full mt-6 py-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-lg"
                  >
                    <Wand2 className="w-5 h-5 mr-2" />
                    Forge My Dream
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity } }}
                className="w-24 h-24 mx-auto mb-8"
              >
                <Sparkles className="w-full h-full text-purple-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Forging your dream world...</h2>
              <p className="text-purple-300/70">Creating a unique micro-universe</p>
            </motion.div>
          )}

          {phase === 'explore' && dreamWorld && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Dream World Visualization */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/30 overflow-hidden mb-6">
                <CardContent className="p-0">
                  <div className="aspect-video relative flex items-center justify-center overflow-hidden">
                    {/* Sky layer */}
                    <div className={`absolute inset-0 ${
                      dreamWorld.sky === 'starry night' ? 'bg-gradient-to-b from-slate-900 to-purple-900' :
                      dreamWorld.sky === 'aurora borealis' ? 'bg-gradient-to-br from-green-900/50 via-purple-900 to-pink-900/50' :
                      dreamWorld.sky === 'sunset clouds' ? 'bg-gradient-to-b from-orange-900/50 to-purple-900' :
                      'bg-gradient-to-b from-black to-purple-950'
                    }`} />
                    
                    {/* Stars */}
                    {[...Array(50)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 50}%`,
                        }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1 + Math.random() * 2, repeat: Infinity }}
                      />
                    ))}

                    {/* Central object */}
                    <motion.div
                      animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="relative z-10 text-center"
                    >
                      <div className="text-8xl mb-4">
                        {dreamWorld.object === 'glowing orb' ? '🔮' :
                         dreamWorld.object === 'ancient door' ? '🚪' :
                         dreamWorld.object === 'floating clock' ? '🕰️' : '🌳'}
                      </div>
                      <p className="text-purple-200 text-lg font-medium">{dreamWorld.object}</p>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>

              {/* Puzzle */}
              <Card className="bg-slate-900/50 border-purple-500/30">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Dream Puzzle
                  </h3>
                  <p className="text-purple-200 mb-6">{dreamWorld.puzzle.question}</p>

                  <div className="grid grid-cols-2 gap-4">
                    {currentPuzzle.map((option, i) => (
                      <Button
                        key={i}
                        onClick={() => solvePuzzle(i)}
                        disabled={selectedAnswer !== null}
                        className={`py-6 text-lg transition-all ${
                          selectedAnswer === i
                            ? i === dreamWorld.puzzle.correct
                              ? 'bg-green-500 hover:bg-green-500'
                              : 'bg-red-500 hover:bg-red-500'
                            : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200'
                        }`}
                        variant="outline"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'reward' && (
            <motion.div
              key="reward"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/50"
              >
                <Star className="w-16 h-16 text-white fill-white" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2">Dream Shard Collected!</h2>
              <p className="text-purple-300/70 mb-8">Your Dream Galaxy grows stronger</p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center gap-4 mb-8"
              >
                <Badge className="bg-yellow-500/20 text-yellow-300 text-lg px-4 py-2">
                  <Coins className="w-4 h-4 mr-1" /> +75 Coins
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 text-lg px-4 py-2">
                  <Star className="w-4 h-4 mr-1 fill-purple-300" /> Shard {shardsCollected}/{totalShards}
                </Badge>
              </motion.div>

              <Button
                onClick={resetGame}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 px-8 py-3"
              >
                <Moon className="w-5 h-5 mr-2" />
                Dream Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
