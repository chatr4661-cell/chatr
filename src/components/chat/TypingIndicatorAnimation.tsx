import { motion } from 'framer-motion';

export const TypingIndicatorAnimation = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-muted/80 to-muted/60 backdrop-blur-sm rounded-2xl w-fit shadow-sm border border-border/50"
    >
      <div className="flex gap-1.5 items-center h-5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-gradient-to-br from-primary to-primary/70"
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-medium">typing</span>
    </motion.div>
  );
};