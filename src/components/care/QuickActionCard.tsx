import { motion } from 'framer-motion';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  gradient: string;
  badge?: string;
  delay?: number;
}

export const QuickActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  route, 
  gradient,
  badge,
  delay = 0 
}: QuickActionCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 group"
        onClick={() => navigate(route)}
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-4">
            {/* Icon Section */}
            <div className={`w-20 h-20 bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 relative overflow-hidden`}>
              <motion.div
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <Icon className="h-8 w-8 text-white relative z-10" />
            </div>
            
            {/* Content Section */}
            <div className="flex-1 py-4 pr-4">
              <div className="flex items-start justify-between">
                <div>
                  {badge && (
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white mb-1`}>
                      {badge}
                    </span>
                  )}
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
