import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Candy, Trophy, Zap, Star, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AICandyCrushGameProps {
  level: number;
  onComplete: (score: number) => void;
  onExit: () => void;
}

type CandyType = '🍬' | '🍭' | '🍫' | '🍩' | '🧁' | '🍪';
const CANDIES: CandyType[] = ['🍬', '🍭', '🍫', '🍩', '🧁', '🍪'];

interface CandyCell {
  id: number;
  type: CandyType;
  x: number;
  y: number;
  matched?: boolean;
}

const AICandyCrushGame: React.FC<AICandyCrushGameProps> = ({ level, onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [grid, setGrid] = useState<CandyCell[][]>([]);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(20 + level * 3);
  const [aiHint, setAiHint] = useState<string>('');
  const [combo, setCombo] = useState(0);

  const GRID_SIZE = 6;
  const targetScore = 1000 + (level * 500);

  const generateGrid = (): CandyCell[][] => {
    const newGrid: CandyCell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: CandyCell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        // AI ensures no initial matches but creates strategic setups
        let type = CANDIES[Math.floor(Math.random() * CANDIES.length)];
        
        // Prevent initial matches
        while (
          (x >= 2 && row[x - 1]?.type === type && row[x - 2]?.type === type) ||
          (y >= 2 && newGrid[y - 1]?.[x]?.type === type && newGrid[y - 2]?.[x]?.type === type)
        ) {
          type = CANDIES[Math.floor(Math.random() * CANDIES.length)];
        }
        
        row.push({ id: y * GRID_SIZE + x, type, x, y });
      }
      newGrid.push(row);
    }
    return newGrid;
  };

  const startGame = () => {
    setGameState('playing');
    setGrid(generateGrid());
    setScore(0);
    setMovesLeft(20 + level * 3);
    setCombo(0);
    setAiHint('');
  };

  const handleCellClick = (x: number, y: number) => {
    if (gameState !== 'playing') return;

    if (!selected) {
      setSelected({ x, y });
      return;
    }

    // Check if adjacent
    const dx = Math.abs(selected.x - x);
    const dy = Math.abs(selected.y - y);
    
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      // Swap candies
      const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
      const temp = newGrid[selected.y][selected.x].type;
      newGrid[selected.y][selected.x].type = newGrid[y][x].type;
      newGrid[y][x].type = temp;

      // Check for matches
      const matches = findAllMatches(newGrid);
      
      if (matches.length > 0) {
        setGrid(newGrid);
        setMovesLeft(m => m - 1);
        processMatches(newGrid, matches);
      } else {
        // Invalid move - swap back
        toast.error('No match!');
      }
    }

    setSelected(null);
  };

  const findAllMatches = (checkGrid: CandyCell[][]): { x: number; y: number }[] => {
    const matches: { x: number; y: number }[] = [];
    
    // Horizontal matches
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE - 2; x++) {
        if (
          checkGrid[y][x].type === checkGrid[y][x + 1].type &&
          checkGrid[y][x].type === checkGrid[y][x + 2].type
        ) {
          matches.push({ x, y }, { x: x + 1, y }, { x: x + 2, y });
        }
      }
    }

    // Vertical matches
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE - 2; y++) {
        if (
          checkGrid[y][x].type === checkGrid[y + 1][x].type &&
          checkGrid[y][x].type === checkGrid[y + 2][x].type
        ) {
          matches.push({ x, y }, { x, y: y + 1 }, { x, y: y + 2 });
        }
      }
    }

    // Remove duplicates
    return matches.filter((match, index, self) =>
      index === self.findIndex(m => m.x === match.x && m.y === match.y)
    );
  };

  const processMatches = (currentGrid: CandyCell[][], matches: { x: number; y: number }[]) => {
    const points = matches.length * 10 * (combo + 1) * (level + 1);
    setScore(s => s + points);
    setCombo(c => c + 1);
    
    if (matches.length >= 5) {
      toast.success(`🎉 MEGA COMBO x${combo + 1}! +${points}`);
      setAiHint('🤖 AI impressed by your move!');
    } else if (matches.length >= 4) {
      toast.success(`✨ Great match! +${points}`);
    }

    // Mark matched cells
    const newGrid = currentGrid.map(row => 
      row.map(cell => ({
        ...cell,
        matched: matches.some(m => m.x === cell.x && m.y === cell.y)
      }))
    );
    setGrid(newGrid);

    // Remove matches and drop candies
    setTimeout(() => {
      const droppedGrid = dropCandies(newGrid);
      setGrid(droppedGrid);
      
      // Check for chain reactions
      setTimeout(() => {
        const newMatches = findAllMatches(droppedGrid);
        if (newMatches.length > 0) {
          processMatches(droppedGrid, newMatches);
        } else {
          setCombo(0);
          setAiHint('');
          checkGameEnd();
        }
      }, 300);
    }, 300);
  };

  const dropCandies = (currentGrid: CandyCell[][]): CandyCell[][] => {
    const newGrid = currentGrid.map(row => 
      row.map(cell => ({ ...cell, matched: false }))
    );

    for (let x = 0; x < GRID_SIZE; x++) {
      const column: CandyType[] = [];
      
      // Collect non-matched candies from bottom to top
      for (let y = GRID_SIZE - 1; y >= 0; y--) {
        if (!currentGrid[y][x].matched) {
          column.push(currentGrid[y][x].type);
        }
      }
      
      // Fill from bottom with existing candies and new ones on top
      for (let y = GRID_SIZE - 1; y >= 0; y--) {
        if (column.length > 0) {
          newGrid[y][x].type = column.shift()!;
        } else {
          // AI generates strategic new candies
          newGrid[y][x].type = CANDIES[Math.floor(Math.random() * CANDIES.length)];
        }
      }
    }

    return newGrid;
  };

  const checkGameEnd = () => {
    if (score >= targetScore) {
      setGameState('finished');
      onComplete(score + movesLeft * 20);
    } else if (movesLeft <= 0) {
      setGameState('finished');
      onComplete(score);
    }
  };

  useEffect(() => {
    if (movesLeft <= 0 && gameState === 'playing') {
      setTimeout(() => {
        setGameState('finished');
        onComplete(score);
      }, 500);
    }
  }, [movesLeft, gameState, score, onComplete]);

  // AI hint generator
  useEffect(() => {
    if (gameState === 'playing' && movesLeft <= 5 && score < targetScore) {
      setAiHint('🤖 AI suggests looking for L-shaped matches!');
    }
  }, [movesLeft, score, targetScore, gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-fuchsia-900 to-black p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onExit} className="text-white">
            ← Back
          </Button>
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>{score}/{targetScore}</span>
          </div>
        </div>

        <Card className="bg-black/40 border-pink-500/30 p-4 mb-4">
          <div className="flex justify-between text-white mb-2">
            <span>Level {level}</span>
            <span>Moves: {movesLeft}</span>
          </div>
          <Progress value={(score / targetScore) * 100} className="h-2" />
          {combo > 1 && (
            <p className="text-yellow-400 text-sm mt-1">Combo x{combo}!</p>
          )}
        </Card>

        {aiHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-pink-300 text-sm mb-2"
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
            <div className="flex justify-center gap-2 mb-4 text-3xl">
              {CANDIES.map((candy, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                >
                  {candy}
                </motion.span>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">AI Candy Crush</h2>
            <p className="text-gray-400 mb-6">
              AI creates challenging patterns! Match 3+ candies to score.
            </p>
            <Button onClick={startGame} className="bg-pink-600 hover:bg-pink-700">
              <Sparkles className="w-4 h-4 mr-2" /> Start Game
            </Button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <div className="bg-black/50 rounded-lg p-2 border-2 border-pink-500/30">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
              {grid.flat().map((cell) => (
                <motion.div
                  key={`${cell.x}-${cell.y}`}
                  initial={{ scale: 0 }}
                  animate={{ 
                    scale: cell.matched ? 0 : 1,
                    backgroundColor: selected?.x === cell.x && selected?.y === cell.y 
                      ? 'rgba(236, 72, 153, 0.5)' 
                      : 'rgba(0, 0, 0, 0.3)'
                  }}
                  className="aspect-square rounded-lg flex items-center justify-center text-2xl cursor-pointer hover:bg-pink-500/30 transition-colors"
                  onClick={() => handleCellClick(cell.x, cell.y)}
                  whileTap={{ scale: 0.9 }}
                >
                  <motion.span
                    animate={cell.matched ? { scale: [1, 1.5, 0], rotate: 360 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {cell.type}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">
              {score >= targetScore ? '🎉' : '😢'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {score >= targetScore ? 'Sweet Victory!' : 'Game Over!'}
            </h2>
            <p className="text-3xl font-bold text-pink-400 mb-6">{score} points</p>
            <Button onClick={onExit} className="bg-pink-600 hover:bg-pink-700">
              Continue
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AICandyCrushGame;
