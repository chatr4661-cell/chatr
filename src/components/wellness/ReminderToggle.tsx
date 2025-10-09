import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';

interface ReminderToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ReminderToggle({ enabled, onToggle }: ReminderToggleProps) {
  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="reminder" className="text-base font-semibold">Daily Reminder</Label>
            <p className="text-sm text-muted-foreground">Get notified to log your data</p>
          </div>
        </div>
        <Switch
          id="reminder"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>
    </Card>
  );
}
