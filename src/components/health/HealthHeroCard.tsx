import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface HealthHeroCardProps {
  healthScore: number;
  aiInsight: string;
  userName?: string;
}

export function HealthHeroCard({ healthScore, aiInsight, userName }: HealthHeroCardProps) {
  const getScoreColor = () => {
    if (healthScore >= 80) return 'from-emerald-500 to-teal-500';
    if (healthScore >= 60) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 to-pink-500';
  };

  const getScoreMessage = () => {
    if (healthScore >= 80) return 'Excellent';
    if (healthScore >= 60) return 'Good';
    return 'Needs Focus';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getScoreColor()} p-5 text-white shadow-xl`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10">
        {/* Greeting */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome back{userName ? `, ${userName}` : ''}</p>
            <h2 className="text-xl font-bold">Your Health Score</h2>
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm"
          >
            <Heart className="w-6 h-6" fill="currentColor" />
          </motion.div>
        </div>

        {/* Score Display */}
        <div className="flex items-end gap-4 mb-4">
          <motion.span 
            className="text-6xl font-black tabular-nums"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {healthScore}
          </motion.span>
          <div className="pb-2">
            <span className="text-2xl font-light opacity-70">/100</span>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">{getScoreMessage()}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Progress value={healthScore} className="h-2 bg-white/20" />
        </div>

        {/* AI Insight */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm leading-relaxed opacity-90">
              {aiInsight || 'Stay active, stay hydrated, and get quality sleep for optimal health!'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
