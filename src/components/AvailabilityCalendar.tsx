import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Calendar, Clock } from 'lucide-react';

export interface TimeSlot {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface AvailabilityCalendarProps {
  availability: TimeSlot[];
  onChange: (availability: TimeSlot[]) => void;
}

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function AvailabilityCalendar({ availability, onChange }: AvailabilityCalendarProps) {
  const toggleDay = (day: string) => {
    const updated = availability.map(slot =>
      slot.day === day ? { ...slot, enabled: !slot.enabled } : slot
    );
    onChange(updated);
  };

  const updateTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    const updated = availability.map(slot =>
      slot.day === day ? { ...slot, [field]: value } : slot
    );
    onChange(updated);
  };

  const setAllDays = (enabled: boolean) => {
    const updated = availability.map(slot => ({ ...slot, enabled }));
    onChange(updated);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <Label className="text-base">Availability Schedule</Label>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllDays(true)}
          >
            Enable All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllDays(false)}
          >
            Disable All
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {availability.map((slot) => (
          <div key={slot.day} className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="flex items-center gap-2 w-32">
              <Checkbox
                checked={slot.enabled}
                onCheckedChange={() => toggleDay(slot.day)}
              />
              <Label className={!slot.enabled ? 'text-muted-foreground' : ''}>
                {slot.day}
              </Label>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateTime(slot.day, 'startTime', e.target.value)}
                disabled={!slot.enabled}
                className="w-32"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateTime(slot.day, 'endTime', e.target.value)}
                disabled={!slot.enabled}
                className="w-32"
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Helper function to generate default availability
export function getDefaultAvailability(): TimeSlot[] {
  return DAYS.map(day => ({
    day,
    enabled: day !== 'Sunday',
    startTime: '09:00',
    endTime: '18:00',
  }));
}
