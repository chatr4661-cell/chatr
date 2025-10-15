import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';

interface DaySchedule {
  open: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BusinessHoursEditorProps {
  value: BusinessHours | null;
  onChange: (hours: BusinessHours) => void;
}

const defaultHours: BusinessHours = {
  monday: { open: true, start: '09:00', end: '18:00' },
  tuesday: { open: true, start: '09:00', end: '18:00' },
  wednesday: { open: true, start: '09:00', end: '18:00' },
  thursday: { open: true, start: '09:00', end: '18:00' },
  friday: { open: true, start: '09:00', end: '18:00' },
  saturday: { open: false, start: '10:00', end: '16:00' },
  sunday: { open: false, start: '10:00', end: '16:00' },
};

export function BusinessHoursEditor({ value, onChange }: BusinessHoursEditorProps) {
  const [hours, setHours] = useState<BusinessHours>(value || defaultHours);

  useEffect(() => {
    if (value) {
      setHours(value);
    }
  }, [value]);

  const updateDay = (day: keyof BusinessHours, schedule: Partial<DaySchedule>) => {
    const newHours = {
      ...hours,
      [day]: { ...hours[day], ...schedule },
    };
    setHours(newHours);
    onChange(newHours);
  };

  const days: { key: keyof BusinessHours; label: string }[] = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Business Hours
      </Label>
      <div className="space-y-2">
        {days.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-3 p-3 rounded-lg border"
          >
            <div className="flex items-center gap-2 w-32">
              <Switch
                checked={hours[key].open}
                onCheckedChange={(checked) => updateDay(key, { open: checked })}
              />
              <span className="text-sm font-medium">{label}</span>
            </div>
            
            {hours[key].open ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={hours[key].start}
                  onChange={(e) => updateDay(key, { start: e.target.value })}
                  className="w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={hours[key].end}
                  onChange={(e) => updateDay(key, { end: e.target.value })}
                  className="w-32"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground flex-1">Closed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
