import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Clock, Plus, Trash2, Save,
  ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, isToday, isBefore 
} from 'date-fns';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  is_available: boolean;
  time_slots: TimeSlot[];
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { start: '09:00', end: '10:00', available: true },
  { start: '10:00', end: '11:00', available: true },
  { start: '11:00', end: '12:00', available: true },
  { start: '14:00', end: '15:00', available: true },
  { start: '15:00', end: '16:00', available: true },
  { start: '16:00', end: '17:00', available: true },
  { start: '17:00', end: '18:00', available: true },
];

export default function DoctorAvailability() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [availability, setAvailability] = useState<Map<string, DayAvailability>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadProviderAndAvailability();
  }, [currentWeek]);

  const loadProviderAndAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      let provId = null;
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (provider) {
        provId = provider.id;
      } else {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .eq('vendor_type', 'healthcare_provider')
          .single();

        if (!vendor) {
          navigate('/vendor/register');
          return;
        }
        provId = vendor.id;
      }

      setProviderId(provId);

      // Load availability for current week
      const weekDates = Array.from({ length: 7 }, (_, i) => 
        format(addDays(currentWeek, i), 'yyyy-MM-dd')
      );

      const { data: availData } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', provId)
        .in('date', weekDates);

      const availMap = new Map<string, DayAvailability>();
      
      weekDates.forEach(date => {
        const existing = availData?.find((a: any) => a.date === date);
        if (existing) {
          const slots = Array.isArray(existing.time_slots) 
            ? existing.time_slots as unknown as TimeSlot[]
            : DEFAULT_TIME_SLOTS;
          availMap.set(date, {
            date: existing.date,
            is_available: existing.is_available,
            time_slots: slots
          });
        } else {
          availMap.set(date, {
            date,
            is_available: true,
            time_slots: [...DEFAULT_TIME_SLOTS]
          });
        }
      });

      setAvailability(availMap);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleDayAvailability = (date: string) => {
    const current = availability.get(date);
    if (!current) return;

    const updated = new Map(availability);
    updated.set(date, {
      ...current,
      is_available: !current.is_available
    });
    setAvailability(updated);
  };

  const toggleSlotAvailability = (date: string, slotIndex: number) => {
    const current = availability.get(date);
    if (!current) return;

    const updatedSlots = [...current.time_slots];
    updatedSlots[slotIndex] = {
      ...updatedSlots[slotIndex],
      available: !updatedSlots[slotIndex].available
    };

    const updated = new Map(availability);
    updated.set(date, {
      ...current,
      time_slots: updatedSlots
    });
    setAvailability(updated);
  };

  const saveAvailability = async () => {
    if (!providerId) return;

    try {
      setSaving(true);

      // Save each day's availability
      for (const [date, data] of availability.entries()) {
        const { error } = await supabase
          .from('provider_availability')
          .upsert({
            provider_id: providerId,
            date,
            is_available: data.is_available,
            time_slots: data.time_slots as unknown as any
          }, { onConflict: 'provider_id,date' });

        if (error) throw error;
      }

      toast.success('Availability saved successfully');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Availability</h1>
            <p className="text-xs text-muted-foreground">Set your working hours</p>
          </div>
          <Button onClick={saveAvailability} disabled={saving}>
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between px-4 pb-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium">
            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week View */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayData = availability.get(dateStr);
            const isPast = isBefore(day, new Date()) && !isToday(day);

            return (
              <motion.div
                key={dateStr}
                whileTap={{ scale: 0.95 }}
                className={`
                  p-2 rounded-lg text-center cursor-pointer transition-colors
                  ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}
                  ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-primary' : ''}
                  ${isPast ? 'opacity-50' : ''}
                  ${dayData?.is_available ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}
                `}
                onClick={() => !isPast && setSelectedDate(day)}
              >
                <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold">{format(day, 'd')}</p>
                <div className="mt-1">
                  {dayData?.is_available ? (
                    <Check className="w-4 h-4 mx-auto text-green-600" />
                  ) : (
                    <div className="w-4 h-4 mx-auto rounded-full bg-red-400" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Day Details */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="day-toggle" className="text-sm">
                      {availability.get(format(selectedDate, 'yyyy-MM-dd'))?.is_available ? 'Available' : 'Unavailable'}
                    </Label>
                    <Switch
                      id="day-toggle"
                      checked={availability.get(format(selectedDate, 'yyyy-MM-dd'))?.is_available}
                      onCheckedChange={() => toggleDayAvailability(format(selectedDate, 'yyyy-MM-dd'))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {availability.get(format(selectedDate, 'yyyy-MM-dd'))?.is_available ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availability.get(format(selectedDate, 'yyyy-MM-dd'))?.time_slots.map((slot, index) => (
                      <motion.div
                        key={`${slot.start}-${slot.end}`}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleSlotAvailability(format(selectedDate, 'yyyy-MM-dd'), index)}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all
                          ${slot.available 
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                            : 'bg-muted border-muted-foreground/20'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {slot.start} - {slot.end}
                            </span>
                          </div>
                          {slot.available && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Day marked as unavailable</p>
                    <p className="text-sm">Toggle the switch above to enable time slots</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!selectedDate && (
          <Card className="bg-muted/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a day to manage time slots</p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const updated = new Map(availability);
              weekDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const current = updated.get(dateStr);
                if (current) {
                  updated.set(dateStr, { ...current, is_available: true });
                }
              });
              setAvailability(updated);
            }}
          >
            <Check className="w-4 h-4 mr-2" />
            Mark Week Available
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const updated = new Map(availability);
              weekDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const current = updated.get(dateStr);
                if (current) {
                  updated.set(dateStr, { ...current, is_available: false });
                }
              });
              setAvailability(updated);
            }}
          >
            Mark Week Unavailable
          </Button>
        </div>
      </div>
    </div>
  );
}
