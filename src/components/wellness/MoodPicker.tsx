import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MoodPickerProps {
  value: string;
  onChange: (mood: string) => void;
}

const moods = [
  { emoji: '😊', label: 'Great', value: 'great' },
  { emoji: '🙂', label: 'Good', value: 'good' },
  { emoji: '😐', label: 'Okay', value: 'okay' },
  { emoji: '😔', label: 'Low', value: 'low' },
  { emoji: '😞', label: 'Sad', value: 'sad' },
];

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="space-y-3">
      <Label>How are you feeling today?</Label>
      <div className="flex gap-3 justify-between">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200",
              "hover:scale-110 hover:shadow-lg",
              value === mood.value
                ? "bg-primary text-primary-foreground shadow-glow scale-110"
                : "bg-background/50 border border-glass-border"
            )}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className="text-xs font-medium">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
