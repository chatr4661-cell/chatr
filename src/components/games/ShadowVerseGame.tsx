import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ghost, Moon, Eye, Sparkles, Trophy, Coins, Heart, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ShadowVerseGameProps {
  onBack: () => void;
}

const moralDilemmas = [
  {
    scenario: "You find a wallet with $500 cash and an ID. The owner lives an hour away.",
    shadowVoice: "Keep it. They probably have insurance. Besides, you need it more.",
    choices: [
      { text: "Return it immediately", alignment: 'light', points: 10 },
      { text: "Take a finder's fee", alignment: 'grey', points: 5 },
      { text: "Keep it all", alignment: 'dark', points: -5 },
    ]
  },
  {
    scenario: "Your friend's partner is cheating. You have proof.",
    shadowVoice: "Stay out of it. It's not your business. You might lose both friendships.",
    choices: [
      { text: "Tell your friend everything", alignment: 'light', points: 10 },
      { text: "Drop hints anonymously", alignment: 'grey', points: 5 },
      { text: "Stay silent", alignment: 'dark', points: -5 },
    ]
  },
  {
    scenario: "You can get a promotion by taking credit for a colleague's idea.",
    shadowVoice: "They'll never know. In this world, only results matter.",
    choices: [
      { text: "Give full credit", alignment: 'light', points: 10 },
      { text: "Propose it together", alignment: 'grey', points: 5 },
      { text: "Take the credit", alignment: 'dark', points: -5 },
    ]
  },
  {
    scenario: "An online stranger is being bullied. You could help, but you're anonymous.",
    shadowVoice: "Why risk getting involved? Someone else will help them.",
    choices: [
      { text: "Publicly defend them", alignment: 'light', points: 10 },
      { text: "Report quietly", alignment: 'grey', points: 5 },
      { text: "Scroll past", alignment: 'dark', points: -5 },
    ]
  },
  {
    scenario: "You discover your company is doing something unethical but legal.",
    shadowVoice: "Keep your job. Loyalty is valued. Besides, it's legal.",
    choices: [
      { text: "Become a whistleblower", alignment: 'light', points: 10 },
      { text: "Raise it internally", alignment: 'grey', points: 5 },
      { text: "Look the other way", alignment: 'dark', points: -5 },
    ]
  },
];

const shadowCreatures = [
  { name: 'Luminous Guardian', emoji: '👼', alignment: 'light', threshold: 40 },
  { name: 'Grey Walker', emoji: '🦊', alignment: 'grey', threshold: 10 },
  { name: 'Shadow Wraith', emoji: '👻', alignment: 'dark', threshold: -20 },
  { name: 'Void Specter', emoji: '💀', alignment: 'void', threshold: -50 },
];

export function ShadowVerseGame({ onBack }: ShadowVerseGameProps) {
  const [phase, setPhase] = useState<'intro' | 'dilemma' | 'reveal' | 'evolution'>('intro');
  const [currentDilemma, setCurrentDilemma] = useState(0);
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [shadowLevel, setShadowLevel] = useState(1);
  const [showShadowVoice, setShowShadowVoice] = useState(false);
  const [lastChoice, setLastChoice] = useState<any>(null);
  const [choices, setChoices] = useState<string[]>([]);

  const dilemma = moralDilemmas[currentDilemma % moralDilemmas.length];

  const startGame = () => {
    setPhase('dilemma');
    setTimeout(() => setShowShadowVoice(true), 2000);
  };

  const makeChoice = (choice: any) => {
    setLastChoice(choice);
    setAlignmentScore(prev => prev + choice.points);
    setChoices(prev => [...prev, choice.alignment]);
    setCoins(prev => prev + Math.abs(choice.points) * 5);
    setShowShadowVoice(false);
    setPhase('reveal');
  };

  const nextDilemma = () => {
    if (currentDilemma < moralDilemmas.length - 1) {
      setCurrentDilemma(prev => prev + 1);
      setPhase('dilemma');
      setTimeout(() => setShowShadowVoice(true), 2000);
    } else {
      setPhase('evolution');
      setShadowLevel(prev => prev + 1);
    }
  };

  const resetGame = () => {
    setPhase('intro');
    setCurrentDilemma(0);
    setShowShadowVoice(false);
    setLastChoice(null);
  };

  const getCurrentCreature = () => {
    return shadowCreatures.find(c => alignmentScore >= c.threshold) || shadowCreatures[shadowCreatures.length - 1];
  };

  const getAlignmentColor = () => {
    if (alignmentScore >= 30) return 'from-yellow-400 to-amber-500';
    if (alignmentScore >= 0) return 'from-purple-500 to-indigo-600';
    if (alignmentScore >= -30) return 'from-red-500 to-rose-600';
    return 'from-slate-800 to-black';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/40 to-slate-950">
      {/* Dark Mystical Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
        {/* Floating shadows */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-20 bg-black/20 rounded-full blur-xl"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-violet-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Ghost className="h-5 w-5 text-violet-400" />
                  ShadowVerse
                </h1>
                <p className="text-xs text-violet-300/70">Your dark side awaits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`bg-gradient-to-r ${getAlignmentColor()} text-white border-0`}>
                {alignmentScore >= 0 ? <Heart className="h-3 w-3 mr-1" /> : <Skull className="h-3 w-3 mr-1" />}
                {alignmentScore}
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
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-900 flex items-center justify-center shadow-2xl shadow-violet-500/30 relative"
              >
                <Ghost className="w-16 h-16 text-white" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-violet-400/50"
                  animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-4">Meet Your Shadow</h2>
              <p className="text-violet-300/70 mb-8 max-w-md mx-auto">
                Deep within you lies another version of yourself. Your Shadow whispers temptations, 
                challenges your morals, and evolves based on your choices.
              </p>

              <Card className="bg-slate-900/50 border-violet-500/30 max-w-md mx-auto mb-8">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-violet-400" />
                    How It Works
                  </h3>
                  <ul className="space-y-2 text-left text-white/70">
                    <li>• Face moral dilemmas</li>
                    <li>• Your Shadow tempts you with dark choices</li>
                    <li>• Every choice shapes your Shadow creature</li>
                    <li>• Will you embrace light or darkness?</li>
                  </ul>
                </CardContent>
              </Card>

              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-violet-500 to-purple-700 hover:from-violet-600 hover:to-purple-800 px-8 py-6 text-lg"
              >
                <Ghost className="w-5 h-5 mr-2" />
                Awaken My Shadow
              </Button>
            </motion.div>
          )}

          {phase === 'dilemma' && (
            <motion.div
              key="dilemma"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-white/70 mb-2">
                  <span>Dilemma {currentDilemma + 1}/{moralDilemmas.length}</span>
                  <span>Shadow Level {shadowLevel}</span>
                </div>
                <Progress value={((currentDilemma + 1) / moralDilemmas.length) * 100} className="h-2" />
              </div>

              {/* Scenario */}
              <Card className="bg-slate-900/50 border-violet-500/30 mb-6">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4">{dilemma.scenario}</h3>
                </CardContent>
              </Card>

              {/* Shadow Voice */}
              <AnimatePresence>
                {showShadowVoice && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="bg-black/50 border-red-500/30 mb-6">
                      <CardContent className="p-4 flex items-start gap-4">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-3xl"
                        >
                          👹
                        </motion.div>
                        <div>
                          <p className="text-red-400 font-medium text-sm mb-1">Your Shadow whispers...</p>
                          <p className="text-white/80 italic">"{dilemma.shadowVoice}"</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Choices */}
              <div className="space-y-3">
                {dilemma.choices.map((choice, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Button
                      onClick={() => makeChoice(choice)}
                      className={`w-full py-6 text-left justify-start text-lg ${
                        choice.alignment === 'light' ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-200' :
                        choice.alignment === 'grey' ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-200' :
                        'bg-red-500/10 hover:bg-red-500/20 text-red-200'
                      }`}
                      variant="outline"
                    >
                      {choice.text}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'reveal' && lastChoice && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className={`text-6xl mb-6`}
              >
                {lastChoice.alignment === 'light' ? '✨' : lastChoice.alignment === 'grey' ? '🌓' : '🌑'}
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {lastChoice.alignment === 'light' ? 'Light Prevails!' :
                 lastChoice.alignment === 'grey' ? 'A Measured Path' :
                 'Darkness Embraced'}
              </h2>
              <p className="text-violet-300/70 mb-4">
                Alignment: {lastChoice.points > 0 ? '+' : ''}{lastChoice.points}
              </p>

              <Badge className={`mb-8 text-lg px-4 py-2 ${
                lastChoice.alignment === 'light' ? 'bg-yellow-500/20 text-yellow-300' :
                lastChoice.alignment === 'grey' ? 'bg-purple-500/20 text-purple-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                <Coins className="w-4 h-4 mr-1" /> +{Math.abs(lastChoice.points) * 5} Coins
              </Badge>

              <Button
                onClick={nextDilemma}
                className="bg-gradient-to-r from-violet-500 to-purple-700 hover:from-violet-600 hover:to-purple-800 px-8 py-3"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {phase === 'evolution' && (
            <motion.div
              key="evolution"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.3, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
                className={`w-40 h-40 mx-auto mb-8 rounded-full bg-gradient-to-br ${getAlignmentColor()} flex items-center justify-center shadow-2xl`}
              >
                <span className="text-7xl">{getCurrentCreature().emoji}</span>
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2">Shadow Evolution!</h2>
              <p className="text-xl text-violet-300 mb-2">{getCurrentCreature().name}</p>
              <p className="text-violet-300/70 mb-8">
                Your choices have shaped your inner shadow
              </p>

              <div className="flex justify-center gap-4 mb-8">
                <Badge className="bg-yellow-500/20 text-yellow-300 text-lg px-4 py-2">
                  <Coins className="w-4 h-4 mr-1" /> {coins} Total
                </Badge>
                <Badge className={`text-lg px-4 py-2 bg-gradient-to-r ${getAlignmentColor()} text-white border-0`}>
                  Alignment: {alignmentScore}
                </Badge>
              </div>

              <Button
                onClick={resetGame}
                className="bg-gradient-to-r from-violet-500 to-purple-700 hover:from-violet-600 hover:to-purple-800 px-8 py-3"
              >
                <Ghost className="w-5 h-5 mr-2" />
                Face New Shadows
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
