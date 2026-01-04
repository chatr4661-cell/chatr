import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, X, Pill, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface TodayDose {
  id: string;
  medicine_name: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
}

export const MedicineIntakeCard = () => {
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadTodayDoses();
  }, []);

  const loadTodayDoses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reminders } = await supabase
        .from('medicine_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const today = new Date().toISOString().split('T')[0];
      const { data: intakeLog } = await supabase
        .from('medicine_intake_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_at', today);

      const todayDoses: TodayDose[] = (reminders || []).map(reminder => {
        const intake = intakeLog?.find(log => 
          log.medicine_name === reminder.medicine_name
        );
        const rawStatus = intake?.status || 'pending';
        const validStatus: TodayDose['status'] = 
          rawStatus === 'taken' || rawStatus === 'skipped' || rawStatus === 'missed' 
            ? rawStatus 
            : 'pending';
        return {
          id: reminder.id,
          medicine_name: reminder.medicine_name,
          scheduled_time: reminder.scheduled_time,
          status: validStatus
        };
      });

      todayDoses.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
      setDoses(todayDoses);
    } catch (error) {
      console.error('Error loading doses:', error);
    } finally {
      setLoading(false);
    }
  };

  const markDose = async (dose: TodayDose, status: 'taken' | 'skipped') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      
      await supabase.from('medicine_intake_log').upsert({
        user_id: user.id,
        medicine_name: dose.medicine_name,
        scheduled_at: `${now.toISOString().split('T')[0]}T${dose.scheduled_time}`,
        taken_at: status === 'taken' ? now.toISOString() : null,
        status
      }, { onConflict: 'user_id,medicine_name,scheduled_at' });

      setDoses(doses.map(d => 
        d.id === dose.id ? { ...d, status } : d
      ));

      if (status === 'taken') {
        // Celebrate with confetti!
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#3b82f6', '#fbbf24']
        });

        const { data: balance } = await supabase
          .from('health_streaks')
          .select('*')
          .eq('user_id', user.id)
          .eq('streak_type', 'medicine_adherence')
          .single();

        if (balance) {
          await supabase
            .from('health_streaks')
            .update({ 
              coins_earned: (balance.coins_earned || 0) + 5,
              current_streak: (balance.current_streak || 0) + 1,
              last_activity_date: now.toISOString()
            })
            .eq('id', balance.id);
        }

        toast.success(
          <div className="flex items-center gap-2">
            <span>Great job! +5 coins earned</span>
            <span className="text-lg">🪙</span>
          </div>
        );
      } else {
        toast.info('Dose skipped');
      }
    } catch (error) {
      console.error('Error marking dose:', error);
      toast.error('Failed to update');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTimeLabel = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return { label: 'Morning', emoji: '🌅' };
    if (hour < 17) return { label: 'Afternoon', emoji: '☀️' };
    if (hour < 20) return { label: 'Evening', emoji: '🌆' };
    return { label: 'Night', emoji: '🌙' };
  };

  const pendingCount = doses.filter(d => d.status === 'pending').length;
  const takenCount = doses.filter(d => d.status === 'taken').length;
  const progress = doses.length > 0 ? (takenCount / doses.length) * 100 : 0;

  if (loading || doses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl">
        {/* Gradient Header */}
        <div 
          className="relative p-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: progress === 100 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))'
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                backgroundSize: '16px 16px'
              }}
            />
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                animate={progress === 100 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: progress === 100 ? Infinity : 0 }}
              >
                {progress === 100 ? (
                  <motion.span 
                    className="text-2xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    🎉
                  </motion.span>
                ) : (
                  <Pill className="h-7 w-7 text-white" />
                )}
              </motion.div>
              <div>
                <p className="text-white/80 text-sm font-medium">Today's Medicines</p>
                <p className="text-2xl font-bold text-white">
                  {takenCount}/{doses.length} taken
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-white/80" />
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            {pendingCount > 0 && (
              <p className="text-white/80 text-xs mt-2">
                {pendingCount} medicine{pendingCount > 1 ? 's' : ''} pending
              </p>
            )}
          </div>
        </div>

        {/* Medicine List */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="p-0">
                {doses.map((dose, idx) => {
                  const timeInfo = getTimeLabel(dose.scheduled_time);
                  return (
                    <motion.div 
                      key={dose.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center justify-between p-4 ${idx !== doses.length - 1 ? 'border-b' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            dose.status === 'taken' ? 'bg-green-100' :
                            dose.status === 'skipped' ? 'bg-gray-100' :
                            'bg-amber-50'
                          }`}
                          whileHover={{ scale: 1.05 }}
                        >
                          {dose.status === 'taken' ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500 }}
                            >
                              <Check className="h-6 w-6 text-green-600" />
                            </motion.div>
                          ) : dose.status === 'skipped' ? (
                            <X className="h-6 w-6 text-gray-400" />
                          ) : (
                            <Clock className="h-6 w-6 text-amber-600" />
                          )}
                        </motion.div>
                        <div>
                          <p className="font-semibold text-foreground">{dose.medicine_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatTime(dose.scheduled_time)}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                              <span>{timeInfo.emoji}</span>
                              {timeInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {dose.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                            onClick={() => markDose(dose, 'skipped')}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              size="sm"
                              className="h-9 px-4 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md"
                              onClick={() => markDose(dose, 'taken')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Take
                            </Button>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
