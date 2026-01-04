import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Pill, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UrgentReminder {
  id: string;
  medicine_name: string;
  dosage: string;
  time_slots?: string[];
}

interface HealthUrgentBannerProps {
  reminders: UrgentReminder[];
  onDismiss?: (id: string) => void;
}

export function HealthUrgentBanner({ reminders, onDismiss }: HealthUrgentBannerProps) {
  if (reminders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
          <AlertCircle className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-2">Upcoming Medications</h3>
          
          <div className="space-y-2">
            <AnimatePresence>
              {reminders.slice(0, 3).map((reminder, index) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Pill className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{reminder.medicine_name}</p>
                      <p className="text-xs opacity-80">{reminder.dosage}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {reminder.time_slots?.[0] && (
                      <span className="text-xs flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        {reminder.time_slots[0]}
                      </span>
                    )}
                    {onDismiss && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
                        onClick={() => onDismiss(reminder.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {reminders.length > 3 && (
            <p className="text-xs opacity-70 mt-2">
              +{reminders.length - 3} more reminders
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
