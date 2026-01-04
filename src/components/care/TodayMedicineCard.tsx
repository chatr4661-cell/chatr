import { useState, useEffect } from 'react';
import { Check, Clock, X, Pill } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TodayDose {
  id: string;
  medicine_name: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
}

export const TodayMedicineCard = () => {
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayDoses();
  }, []);

  const loadTodayDoses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get reminders and check intake log
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

      // Merge reminders with intake status
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

      // Sort by time
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
        // Award coins for taking medicine
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

        toast.success('Great job! +5 coins earned 🪙');
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
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 20) return 'Evening';
    return 'Night';
  };

  const pendingCount = doses.filter(d => d.status === 'pending').length;
  const takenCount = doses.filter(d => d.status === 'taken').length;

  if (loading || doses.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Today's Medicines</p>
            <p className="text-2xl font-bold">{takenCount}/{doses.length} taken</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
            <Pill className="h-6 w-6" />
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        {doses.map((dose, idx) => (
          <div 
            key={dose.id}
            className={`flex items-center justify-between p-4 ${idx !== doses.length - 1 ? 'border-b' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                dose.status === 'taken' ? 'bg-green-100 text-green-600' :
                dose.status === 'skipped' ? 'bg-gray-100 text-gray-400' :
                'bg-amber-100 text-amber-600'
              }`}>
                {dose.status === 'taken' ? <Check className="h-5 w-5" /> :
                 dose.status === 'skipped' ? <X className="h-5 w-5" /> :
                 <Clock className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-medium text-sm">{dose.medicine_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTime(dose.scheduled_time)}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {getTimeLabel(dose.scheduled_time)}
                  </Badge>
                </div>
              </div>
            </div>
            
            {dose.status === 'pending' && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => markDose(dose, 'skipped')}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => markDose(dose, 'taken')}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Take
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
