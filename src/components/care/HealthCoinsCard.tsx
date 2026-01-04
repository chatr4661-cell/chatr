import { motion } from 'framer-motion';
import { Coins, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HealthCoinsCardProps {
  totalCoins: number;
  todayEarned?: number;
  streak?: number;
}

export const HealthCoinsCard = ({ totalCoins, todayEarned = 0, streak = 0 }: HealthCoinsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 border-0 shadow-xl overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-32 h-32 rounded-full bg-white/10 -top-16 -right-16"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full bg-white/10 bottom-0 left-0"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <CardContent className="p-5 relative">
          <div className="flex items-center justify-between">
            {/* Coins Display */}
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                whileHover={{ rotate: 15 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.span 
                  className="text-3xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🪙
                </motion.span>
              </motion.div>
              <div>
                <p className="text-white/80 text-sm font-medium">Health Coins</p>
                <motion.p 
                  className="text-4xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {totalCoins.toLocaleString()}
                </motion.p>
              </div>
            </div>

            {/* Stats Column */}
            <div className="text-right space-y-2">
              {todayEarned > 0 && (
                <motion.div 
                  className="flex items-center gap-1 justify-end text-white"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">+{todayEarned} today</span>
                </motion.div>
              )}
              {streak > 0 && (
                <motion.div 
                  className="flex items-center gap-1 justify-end"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="text-white/90 text-sm flex items-center gap-1">
                    🔥 {streak} day streak
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Bottom Tip */}
          <motion.div 
            className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <p className="text-xs text-white/80">
              Take medicines on time to earn more coins!
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
