import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, Volume2, Waves, Zap, Trophy, Coins, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface FrequencyClashGameProps {
  onBack: () => void;
}

const challenges = [
  { type: 'loud', instruction: 'SPEAK LOUDER!', emoji: '📢', target: 70 },
  { type: 'whisper', instruction: 'Whisper softly...', emoji: '🤫', target: 20 },
  { type: 'steady', instruction: 'Keep it steady', emoji: '➖', target: 50 },
  { type: 'rise', instruction: 'Rise up!', emoji: '📈', target: 80 },
  { type: 'drop', instruction: 'Drop it low', emoji: '📉', target: 15 },
];

export function FrequencyClashGame({ onBack }: FrequencyClashGameProps) {
  const [phase, setPhase] = useState<'menu' | 'playing' | 'result'>('menu');
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [pulseIntensity, setPulseIntensity] = useState(50);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const challenge = challenges[currentChallenge % challenges.length];

  const startGame = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      setIsListening(true);
      setPhase('playing');
      analyzeAudio();
    } catch (err) {
      toast.error('Microphone access required for this game');
      // Fallback to simulated game
      setPhase('playing');
      simulateAudio();
    }
  };

  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalized = Math.min(100, (avg / 128) * 100);
      setVolumeLevel(normalized);
      setPulseIntensity(normalized);
      
      animationRef.current = requestAnimationFrame(tick);
    };
    
    tick();
  };

  const simulateAudio = () => {
    // For demo/fallback - simulate voice input
    const tick = () => {
      const simulated = 30 + Math.random() * 40 + Math.sin(Date.now() / 500) * 20;
      setVolumeLevel(Math.max(0, Math.min(100, simulated)));
      setPulseIntensity(simulated);
      animationRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  useEffect(() => {
    if (phase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
        
        // Check if volume matches target
        const diff = Math.abs(volumeLevel - challenge.target);
        if (diff < 15) {
          setScore(prev => prev + 10 + combo * 2);
          setCombo(prev => prev + 1);
        } else {
          setCombo(0);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [phase, timeLeft, volumeLevel]);

  const endGame = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setCoins(prev => prev + Math.floor(score / 10));
    setPhase('result');
  };

  const resetGame = () => {
    setPhase('menu');
    setScore(0);
    setCombo(0);
    setTimeLeft(30);
    setVolumeLevel(0);
    setIsListening(false);
    setCurrentChallenge(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950">
      {/* Sound Wave Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"
              animate={{
                scale: [1, 1.5 + i * 0.3],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut",
              }}
              style={{
                transform: `scale(${1 + (pulseIntensity / 100) * 0.5})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-emerald-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Waves className="h-5 w-5 text-emerald-400" />
                  Frequency Clash
                </h1>
                <p className="text-xs text-emerald-300/70">Control with your voice</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                <Zap className="h-3 w-3 mr-1" /> x{combo} Combo
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
          {phase === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
              >
                <Mic className="w-16 h-16 text-white" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-4">Voice-Controlled Gaming</h2>
              <p className="text-emerald-300/70 mb-8 max-w-md mx-auto">
                Control the game with your voice frequency. Speak louder to jump, whisper to sneak, maintain steady tones to balance.
              </p>

              <Card className="bg-slate-900/50 border-emerald-500/30 max-w-md mx-auto mb-8">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">How to Play</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3 text-white/70">
                      <span className="text-2xl">📢</span>
                      <span>Speak LOUD = High frequency</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/70">
                      <span className="text-2xl">🤫</span>
                      <span>Whisper = Low frequency</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/70">
                      <span className="text-2xl">🎯</span>
                      <span>Match the target frequency!</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 px-8 py-6 text-lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Challenge
              </Button>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Timer & Score */}
              <div className="flex justify-between items-center mb-6">
                <Badge className="bg-red-500/20 text-red-300 text-lg px-4 py-2">
                  ⏱️ {timeLeft}s
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 text-lg px-4 py-2">
                  <Trophy className="w-4 h-4 mr-1" /> {score}
                </Badge>
              </div>

              {/* Challenge */}
              <Card className="bg-slate-900/50 border-emerald-500/30 mb-8">
                <CardContent className="p-8 text-center">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-6xl block mb-4"
                  >
                    {challenge.emoji}
                  </motion.span>
                  <h2 className="text-3xl font-bold text-white mb-2">{challenge.instruction}</h2>
                  <p className="text-emerald-300/70">Target: {challenge.target}%</p>
                </CardContent>
              </Card>

              {/* Volume Meter */}
              <Card className="bg-slate-900/50 border-emerald-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Volume2 className="w-6 h-6 text-emerald-400" />
                    <div className="flex-1">
                      <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          animate={{ width: `${volumeLevel}%` }}
                          transition={{ duration: 0.1 }}
                        />
                        {/* Target indicator */}
                        <div 
                          className="absolute inset-y-0 w-1 bg-yellow-400"
                          style={{ left: `${challenge.target}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-white font-bold w-12 text-right">{Math.round(volumeLevel)}%</span>
                  </div>

                  {/* Match indicator */}
                  <div className="text-center">
                    {Math.abs(volumeLevel - challenge.target) < 15 ? (
                      <motion.p
                        animate={{ scale: [1, 1.1, 1] }}
                        className="text-green-400 font-bold text-xl"
                      >
                        ✓ Perfect Match! +{10 + combo * 2}
                      </motion.p>
                    ) : volumeLevel < challenge.target ? (
                      <p className="text-orange-400">↑ Louder!</p>
                    ) : (
                      <p className="text-orange-400">↓ Softer!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
                className="text-8xl mb-6"
              >
                🎤
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2">Challenge Complete!</h2>
              <p className="text-emerald-300/70 mb-8">Final Score: {score}</p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center gap-4 mb-8"
              >
                <Badge className="bg-yellow-500/20 text-yellow-300 text-lg px-4 py-2">
                  <Coins className="w-4 h-4 mr-1" /> +{Math.floor(score / 10)} Coins
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 text-lg px-4 py-2">
                  <Zap className="w-4 h-4 mr-1" /> Best Combo: x{combo}
                </Badge>
              </motion.div>

              <Button
                onClick={resetGame}
                className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 px-8 py-3"
              >
                <Mic className="w-5 h-5 mr-2" />
                Play Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
