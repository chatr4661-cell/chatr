import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Trophy, Zap, Check, X, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIWordFinderGameProps {
  level: number;
  onComplete: (score: number) => void;
  onExit: () => void;
}

const WORD_CATEGORIES = {
  easy: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'HAT', 'BAT', 'RAT', 'MAT', 'SAT'],
  medium: ['APPLE', 'BEACH', 'CHAIR', 'DREAM', 'EARTH', 'FLAME', 'GRAPE', 'HOUSE'],
  hard: ['BEAUTY', 'CASTLE', 'DRAGON', 'ENERGY', 'FLOWER', 'GOLDEN', 'HEROES', 'ISLAND']
};

const AIWordFinderGame: React.FC<AIWordFinderGameProps> = ({ level, onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<{ x: number; y: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 + level * 15);
  const [aiHint, setAiHint] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

  const GRID_SIZE = 6 + Math.floor(level / 5);
  const difficulty = level <= 5 ? 'easy' : level <= 10 ? 'medium' : 'hard';

  const generateGrid = () => {
    const words = WORD_CATEGORIES[difficulty];
    const selectedWords = words.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(level / 3));
    
    // Create empty grid
    const newGrid: string[][] = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill('')
    );

    // Place words in grid
    selectedWords.forEach(word => {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 50) {
        const direction = Math.floor(Math.random() * 3); // 0: horizontal, 1: vertical, 2: diagonal
        const startX = Math.floor(Math.random() * GRID_SIZE);
        const startY = Math.floor(Math.random() * GRID_SIZE);

        if (canPlaceWord(newGrid, word, startX, startY, direction)) {
          placeWord(newGrid, word, startX, startY, direction);
          placed = true;
        }
        attempts++;
      }
    });

    // Fill remaining cells with random letters
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!newGrid[y][x]) {
          newGrid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    setGrid(newGrid);
    setTargetWords(selectedWords);
  };

  const canPlaceWord = (grid: string[][], word: string, x: number, y: number, dir: number): boolean => {
    const dx = dir === 0 ? 1 : dir === 2 ? 1 : 0;
    const dy = dir === 1 ? 1 : dir === 2 ? 1 : 0;

    for (let i = 0; i < word.length; i++) {
      const nx = x + i * dx;
      const ny = y + i * dy;

      if (nx >= GRID_SIZE || ny >= GRID_SIZE) return false;
      if (grid[ny][nx] && grid[ny][nx] !== word[i]) return false;
    }
    return true;
  };

  const placeWord = (grid: string[][], word: string, x: number, y: number, dir: number) => {
    const dx = dir === 0 ? 1 : dir === 2 ? 1 : 0;
    const dy = dir === 1 ? 1 : dir === 2 ? 1 : 0;

    for (let i = 0; i < word.length; i++) {
      grid[y + i * dy][x + i * dx] = word[i];
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setFoundWords([]);
    setTimeLeft(60 + level * 15);
    setAiHint('');
    generateGrid();
  };

  const handleCellSelect = (x: number, y: number, isStart: boolean) => {
    if (gameState !== 'playing') return;

    if (isStart) {
      setIsSelecting(true);
      setSelectedCells([{ x, y }]);
    } else if (isSelecting) {
      const last = selectedCells[selectedCells.length - 1];
      if (!last) return;

      // Only allow adjacent cells
      const dx = Math.abs(x - last.x);
      const dy = Math.abs(y - last.y);

      if (dx <= 1 && dy <= 1 && (dx + dy > 0)) {
        // Check if already selected
        if (!selectedCells.some(c => c.x === x && c.y === y)) {
          setSelectedCells(prev => [...prev, { x, y }]);
        }
      }
    }
  };

  const handleSelectionEnd = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const word = selectedCells.map(c => grid[c.y][c.x]).join('');
    const reverseWord = word.split('').reverse().join('');

    if (
      (targetWords.includes(word) || targetWords.includes(reverseWord)) &&
      !foundWords.includes(word) && !foundWords.includes(reverseWord)
    ) {
      const foundWord = targetWords.includes(word) ? word : reverseWord;
      setFoundWords(prev => [...prev, foundWord]);
      const points = foundWord.length * 20 * (level + 1);
      setScore(s => s + points);
      toast.success(`Found "${foundWord}"! +${points}`);
      
      // AI response
      if (foundWords.length + 1 === targetWords.length) {
        setAiHint('🤖 Amazing! All words found!');
      }
    }

    setSelectedCells([]);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('finished');
          onComplete(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, score, onComplete]);

  useEffect(() => {
    if (foundWords.length === targetWords.length && targetWords.length > 0) {
      const bonus = timeLeft * 5;
      setScore(s => s + bonus);
      toast.success(`Time bonus: +${bonus}`);
      setTimeout(() => {
        setGameState('finished');
        onComplete(score + bonus);
      }, 1000);
    }
  }, [foundWords, targetWords, timeLeft, score, onComplete]);

  // AI hint system
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 30 && foundWords.length < targetWords.length) {
      const remaining = targetWords.filter(w => !foundWords.includes(w));
      if (remaining.length > 0) {
        setAiHint(`🤖 Hint: Look for a ${remaining[0].length}-letter word!`);
        setTimeout(() => setAiHint(''), 5000);
      }
    }
  }, [timeLeft, gameState, foundWords, targetWords]);

  const isCellSelected = (x: number, y: number) => 
    selectedCells.some(c => c.x === x && c.y === y);

  const isCellFound = (x: number, y: number) => {
    // Check if cell is part of a found word
    return false; // Simplified for now
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-teal-900 to-black p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onExit} className="text-white">
            ← Back
          </Button>
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>{score}</span>
          </div>
        </div>

        <Card className="bg-black/40 border-emerald-500/30 p-4 mb-4">
          <div className="flex justify-between text-white mb-2">
            <span>Level {level}</span>
            <span>⏱️ {timeLeft}s</span>
          </div>
          <Progress value={(foundWords.length / targetWords.length) * 100} className="h-2" />
          <p className="text-xs text-gray-400 mt-1">
            {foundWords.length}/{targetWords.length} words found
          </p>
        </Card>

        {/* Words to find */}
        {gameState === 'playing' && (
          <div className="flex flex-wrap gap-2 mb-4">
            {targetWords.map(word => (
              <span
                key={word}
                className={`px-2 py-1 rounded text-sm ${
                  foundWords.includes(word)
                    ? 'bg-emerald-600 text-white line-through'
                    : 'bg-white/10 text-white'
                }`}
              >
                {foundWords.includes(word) ? word : '?'.repeat(word.length)}
              </span>
            ))}
          </div>
        )}

        {aiHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-emerald-300 text-sm mb-2"
          >
            {aiHint}
          </motion.div>
        )}

        {gameState === 'ready' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <Brain className="w-20 h-20 mx-auto text-emerald-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">AI Word Finder</h2>
            <p className="text-gray-400 mb-6">
              AI hides words in the grid. Find them before time runs out!
            </p>
            <Button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-700">
              <BookOpen className="w-4 h-4 mr-2" /> Start Game
            </Button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <div 
            className="bg-black/50 rounded-lg p-2 border-2 border-emerald-500/30 select-none"
            onMouseUp={handleSelectionEnd}
            onMouseLeave={handleSelectionEnd}
            onTouchEnd={handleSelectionEnd}
          >
            <div 
              className="grid gap-1" 
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
            >
              {grid.flat().map((letter, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isSelected = isCellSelected(x, y);

                return (
                  <motion.div
                    key={i}
                    className={`aspect-square rounded flex items-center justify-center text-lg font-bold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onMouseDown={() => handleCellSelect(x, y, true)}
                    onMouseEnter={() => handleCellSelect(x, y, false)}
                    onTouchStart={() => handleCellSelect(x, y, true)}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const element = document.elementFromPoint(touch.clientX, touch.clientY);
                      if (element) {
                        const cellIndex = Array.from(element.parentElement?.children || []).indexOf(element);
                        if (cellIndex >= 0) {
                          handleCellSelect(cellIndex % GRID_SIZE, Math.floor(cellIndex / GRID_SIZE), false);
                        }
                      }
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {foundWords.length === targetWords.length ? 'Perfect!' : 'Time\'s Up!'}
            </h2>
            <p className="text-gray-400 mb-2">
              Found {foundWords.length}/{targetWords.length} words
            </p>
            <p className="text-3xl font-bold text-emerald-400 mb-6">{score} points</p>
            <Button onClick={onExit} className="bg-emerald-600 hover:bg-emerald-700">
              Continue
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AIWordFinderGame;
