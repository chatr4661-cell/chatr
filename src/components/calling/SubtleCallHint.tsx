import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Subtle Call Hint - Minimal, Phone-like UI
 * 
 * Shows intelligence hints only when absolutely necessary:
 * - "Call stabilized" - after recovery
 * - "Audio optimized" - when switching to audio-only
 * - "Reconnecting..." - during recovery
 * 
 * Design: Small, non-intrusive, fades automatically
 */

interface SubtleCallHintProps {
  message: string | null;
  duration?: number;
  onDismiss?: () => void;
}

export const SubtleCallHint: React.FC<SubtleCallHintProps> = ({
  message,
  duration = 3000,
  onDismiss
}) => {
  React.useEffect(() => {
    if (message && onDismiss) {
      const timeout = setTimeout(onDismiss, duration);
      return () => clearTimeout(timeout);
    }
  }, [message, duration, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
            <span className="text-white/80 text-sm font-medium">
              {message}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Call Quality Indicator - Minimal, only shows when there's an issue
 * 
 * Hidden by default (excellent quality assumed)
 * Only appears when quality degrades
 */
interface CallQualityIndicatorProps {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'reconnecting';
  showAlways?: boolean;
}

export const CallQualityIndicator: React.FC<CallQualityIndicatorProps> = ({
  quality,
  showAlways = false
}) => {
  // Don't show anything for excellent quality (default assumption)
  if (!showAlways && quality === 'excellent') {
    return null;
  }

  const getIndicator = () => {
    switch (quality) {
      case 'excellent':
        return { dots: 4, color: 'bg-green-500' };
      case 'good':
        return { dots: 3, color: 'bg-green-500' };
      case 'fair':
        return { dots: 2, color: 'bg-yellow-500' };
      case 'poor':
        return { dots: 1, color: 'bg-red-500' };
      case 'reconnecting':
        return { dots: 0, color: 'bg-orange-500' };
    }
  };

  const { dots, color } = getIndicator();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-end gap-0.5 h-4"
      >
        {quality === 'reconnecting' ? (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`w-3 h-3 rounded-full ${color}`}
          />
        ) : (
          [1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-1 rounded-sm transition-all duration-200 ${
                level <= dots ? color : 'bg-white/20'
              }`}
              style={{ height: `${level * 3 + 4}px` }}
            />
          ))
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Recovery Overlay - Shows during connection recovery
 * 
 * Minimal, non-alarming, reassuring
 */
interface RecoveryOverlayProps {
  isRecovering: boolean;
  attempt?: number;
  maxAttempts?: number;
}

export const RecoveryOverlay: React.FC<RecoveryOverlayProps> = ({
  isRecovering,
  attempt = 0,
  maxAttempts = 5
}) => {
  if (!isRecovering) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white text-lg font-medium">Reconnecting...</p>
          {attempt > 1 && (
            <p className="text-white/60 text-sm mt-1">
              Attempt {attempt} of {maxAttempts}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SubtleCallHint;
