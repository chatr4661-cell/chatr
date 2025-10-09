import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Insight {
  metric: string;
  change: number;
  isPositive: boolean;
  message: string;
}

interface WellnessInsightsProps {
  insights: Insight[];
}

export function WellnessInsights({ insights }: WellnessInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-semibold text-foreground">📊 Your Insights</h3>
        {insights.map((insight, index) => (
          <motion.div
            key={insight.metric}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  insight.change === 0 
                    ? 'bg-gray-500/10' 
                    : insight.isPositive 
                    ? 'bg-green-500/10' 
                    : 'bg-red-500/10'
                }`}>
                  {insight.change === 0 ? (
                    <Minus className="w-5 h-5 text-gray-500" />
                  ) : insight.isPositive ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{insight.message}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
