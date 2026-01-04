import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface MedicineHeroHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: 'primary' | 'health' | 'vitals' | 'family' | 'rewards' | 'reminders' | 'prescriptions';
  showBack?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
}

const gradientClasses = {
  primary: 'from-primary via-primary/90 to-primary/70',
  health: 'from-emerald-500 via-green-500 to-teal-500',
  vitals: 'from-rose-500 via-pink-500 to-fuchsia-500',
  family: 'from-blue-500 via-indigo-500 to-violet-500',
  rewards: 'from-amber-500 via-orange-500 to-red-500',
  reminders: 'from-cyan-500 via-sky-500 to-blue-500',
  prescriptions: 'from-violet-500 via-purple-500 to-fuchsia-500',
};

export const MedicineHeroHeader = ({ 
  title, 
  subtitle, 
  gradient = 'primary',
  showBack = true,
  backPath = '/care/medicines',
  rightAction,
  children 
}: MedicineHeroHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]}`} />
      <div className="absolute inset-0 opacity-30">
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-white/10 -top-48 -right-48"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360] 
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity,
            ease: "linear" 
          }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-white/10 -bottom-32 -left-32"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0] 
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
            ease: "linear" 
          }}
        />
      </div>
      
      {/* Mesh Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="relative p-4 pt-safe">
        {/* Navigation Row */}
        <motion.div 
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {showBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(backPath)} 
              className="text-white/90 hover:bg-white/10 backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div />
          )}
          <Badge className="bg-white/20 text-white border-0 gap-1.5 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            CHATR Health
          </Badge>
          {rightAction || <div className="w-10" />}
        </motion.div>

        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          {subtitle && (
            <p className="text-white/80 text-sm">{subtitle}</p>
          )}
        </motion.div>

        {/* Children Content */}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4"
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
};
