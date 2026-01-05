import { motion } from 'framer-motion';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

interface PremiumDateHeaderProps {
  date: Date;
  isFloating?: boolean;
}

const formatDateHeader = (date: Date): string => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return format(date, 'EEEE');
  if (isThisYear(date)) return format(date, 'MMMM d');
  return format(date, 'MMMM d, yyyy');
};

export const PremiumDateHeader = ({ date, isFloating = false }: PremiumDateHeaderProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className={`flex justify-center ${isFloating ? 'sticky top-2 z-10' : 'my-4'}`}
    >
      <div 
        className={`
          px-4 py-1.5 rounded-full text-xs font-medium
          ${isFloating 
            ? 'bg-background/95 backdrop-blur-md shadow-lg border border-border/50 text-foreground' 
            : 'bg-muted/80 text-muted-foreground'
          }
          transition-all duration-200
        `}
      >
        {formatDateHeader(date)}
      </div>
    </motion.div>
  );
};