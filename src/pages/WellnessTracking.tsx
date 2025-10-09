import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, Activity, TrendingUp, Droplet, Moon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoodPicker } from '@/components/wellness/MoodPicker';
import { WellnessChart } from '@/components/wellness/WellnessChart';
import { WellnessInsights } from '@/components/wellness/WellnessInsights';
import { HealthAppSync } from '@/components/wellness/HealthAppSync';
import { ReminderToggle } from '@/components/wellness/ReminderToggle';

const WellnessTracking = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    steps: '',
    sleep_hours: '',
    heart_rate: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    weight_kg: '',
    mood: '',
    notes: ''
  });
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [currentStats, setCurrentStats] = useState({ steps: 0, heartRate: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadHistoricalData(session.user.id);
        loadReminderPreference(session.user.id);
      }
    });
  }, [navigate]);

  const loadHistoricalData = async (userId: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('wellness_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (data && data.length > 0) {
      setHistoricalData(data);
      
      // Calculate current stats from latest entry
      const latest = data[data.length - 1];
      setCurrentStats({
        steps: latest.steps || 0,
        heartRate: latest.heart_rate || 0
      });

      // Calculate insights
      if (data.length >= 2) {
        const previous = data[data.length - 2];
        const newInsights = [];

        if (latest.steps && previous.steps) {
          const stepDiff = latest.steps - previous.steps;
          newInsights.push({
            metric: 'steps',
            change: stepDiff,
            isPositive: stepDiff > 0,
            message: stepDiff > 0 
              ? `You've walked ${Math.abs(stepDiff).toLocaleString()} steps more than yesterday! 🎉`
              : stepDiff < 0
              ? `${Math.abs(stepDiff).toLocaleString()} fewer steps than yesterday. Keep moving!`
              : 'Same steps as yesterday. Consistency is key! 👍'
          });
        }

        if (latest.sleep_hours && previous.sleep_hours) {
          const sleepDiff = latest.sleep_hours - previous.sleep_hours;
          newInsights.push({
            metric: 'sleep',
            change: sleepDiff,
            isPositive: sleepDiff > 0,
            message: sleepDiff > 0
              ? `Great! You slept ${Math.abs(sleepDiff).toFixed(1)} hours more! 😴`
              : sleepDiff < 0
              ? `Try to get more rest. You slept ${Math.abs(sleepDiff).toFixed(1)} hours less.`
              : 'Consistent sleep schedule! Well done! 🌙'
          });
        }

        if (latest.heart_rate && previous.heart_rate) {
          const hrDiff = latest.heart_rate - previous.heart_rate;
          const isHealthy = Math.abs(hrDiff) <= 10;
          newInsights.push({
            metric: 'heart_rate',
            change: hrDiff,
            isPositive: isHealthy,
            message: isHealthy
              ? 'Your heart rate is stable and healthy! ❤️'
              : 'Notable heart rate change. Consider consulting your doctor if concerned.'
          });
        }

        setInsights(newInsights);
      }
    }
  };

  const loadReminderPreference = async (userId: string) => {
    const { data } = await supabase
      .from('user_preferences')
      .select('wellness_reminder_enabled')
      .eq('user_id', userId)
      .single();

    if (data) {
      setReminderEnabled(data.wellness_reminder_enabled || false);
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    setReminderEnabled(enabled);
    
    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          wellness_reminder_enabled: enabled
        });

      toast({
        title: enabled ? '🔔 Reminders Enabled' : '🔕 Reminders Disabled',
        description: enabled 
          ? 'You\'ll get daily reminders to log your wellness data'
          : 'Daily reminders have been turned off'
      });
    }
  };

  const handleHealthAppSync = (syncedData: any) => {
    setFormData(prev => ({
      ...prev,
      ...syncedData
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToInsert: any = {
      user_id: user.id,
      date: new Date().toISOString().split('T')[0]
    };

    // Only include fields that have values
    Object.entries(formData).forEach(([key, value]) => {
      if (value) {
        dataToInsert[key] = key.includes('_kg') || key.includes('_hours') ? parseFloat(value) : 
                            key.includes('steps') || key.includes('rate') || key.includes('pressure') ? parseInt(value) : 
                            value;
      }
    });

    const { error } = await supabase
      .from('wellness_tracking')
      .upsert(dataToInsert, { onConflict: 'user_id,date' });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save wellness data',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: '✅ Success',
      description: 'Wellness data saved successfully!'
    });

    // Reload data to show new insights
    loadHistoricalData(user.id);

    // Reset form
    setFormData({
      steps: '',
      sleep_hours: '',
      heart_rate: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      weight_kg: '',
      mood: '',
      notes: ''
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Wellness Tracking</h1>
            <p className="text-sm text-muted-foreground">Track your daily health metrics</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Heart Rate</p>
                  <p className="text-xl font-bold text-foreground">
                    {currentStats.heartRate > 0 ? `${currentStats.heartRate} bpm` : '--'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Steps</p>
                  <p className="text-xl font-bold text-foreground">
                    {currentStats.steps > 0 ? currentStats.steps.toLocaleString() : '--'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Health App Sync */}
          <HealthAppSync onDataSync={handleHealthAppSync} />

          {/* Reminder Toggle */}
          <ReminderToggle enabled={reminderEnabled} onToggle={handleReminderToggle} />

          {/* Insights */}
          {insights.length > 0 && <WellnessInsights insights={insights} />}

          {/* Charts */}
          {historicalData.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">📈 Your Progress</h3>
              <div className="grid gap-4">
                <WellnessChart data={historicalData} metric="steps" />
                <WellnessChart data={historicalData} metric="heart_rate" />
                <WellnessChart data={historicalData} metric="sleep_hours" />
              </div>
            </div>
          )}

          {/* Form */}
          <Card className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">📝 Log Today's Data</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="steps">Steps</Label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="steps"
                      type="number"
                      value={formData.steps}
                      onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                      placeholder="10000"
                      className="pl-10 rounded-full bg-background/50 border-glass-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sleep">Sleep (hours)</Label>
                  <div className="relative">
                    <Moon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sleep"
                      type="number"
                      step="0.5"
                      value={formData.sleep_hours}
                      onChange={(e) => setFormData({ ...formData, sleep_hours: e.target.value })}
                      placeholder="8"
                      className="pl-10 rounded-full bg-background/50 border-glass-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heart_rate">Heart Rate (bpm)</Label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="heart_rate"
                      type="number"
                      value={formData.heart_rate}
                      onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                      placeholder="72"
                      className="pl-10 rounded-full bg-background/50 border-glass-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      placeholder="70"
                      className="pl-10 rounded-full bg-background/50 border-glass-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bp_sys">BP Systolic</Label>
                  <div className="relative">
                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="bp_sys"
                      type="number"
                      value={formData.blood_pressure_systolic}
                      onChange={(e) => setFormData({ ...formData, blood_pressure_systolic: e.target.value })}
                      placeholder="120"
                      className="pl-10 rounded-full bg-background/50 border-glass-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bp_dia">BP Diastolic</Label>
                  <div className="relative">
                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="bp_dia"
                      type="number"
                      value={formData.blood_pressure_diastolic}
                      onChange={(e) => setFormData({ ...formData, blood_pressure_diastolic: e.target.value })}
                      placeholder="80"
                      className="pl-10 rounded-full bg-background/50 border-glass-border"
                    />
                  </div>
                </div>
              </div>

              {/* Mood Picker */}
              <MoodPicker
                value={formData.mood}
                onChange={(mood) => setFormData({ ...formData, mood })}
              />

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  className="rounded-full bg-background/50 border-glass-border"
                />
              </div>

              <Button type="submit" className="w-full rounded-full shadow-glow">
                💾 Save Today's Data
              </Button>
            </form>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default WellnessTracking;
