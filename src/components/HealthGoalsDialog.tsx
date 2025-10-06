import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface HealthGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const HealthGoalsDialog = ({ open, onOpenChange, onSuccess }: HealthGoalsDialogProps) => {
  const [goalType, setGoalType] = useState('');
  const [goalName, setGoalName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const goalTypes = [
    { value: 'weight', label: 'Weight Loss/Gain', unit: 'kg' },
    { value: 'steps', label: 'Daily Steps', unit: 'steps' },
    { value: 'water', label: 'Water Intake', unit: 'glasses' },
    { value: 'exercise', label: 'Exercise Minutes', unit: 'minutes' },
    { value: 'sleep', label: 'Sleep Hours', unit: 'hours' },
    { value: 'other', label: 'Other', unit: '' }
  ];

  const handleGoalTypeChange = (value: string) => {
    setGoalType(value);
    const selected = goalTypes.find(g => g.value === value);
    if (selected?.unit) setUnit(selected.unit);
  };

  const handleSave = async () => {
    if (!goalType || !goalName || !targetValue || !unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('health_goals')
        .insert({
          user_id: user.id,
          goal_type: goalType,
          goal_name: goalName,
          target_value: parseFloat(targetValue),
          unit,
          target_date: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
          notes: notes || null
        });

      if (error) throw error;

      toast.success('Health goal created successfully!');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create health goal');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setGoalType('');
    setGoalName('');
    setTargetValue('');
    setUnit('');
    setTargetDate(undefined);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Health Goal</DialogTitle>
          <DialogDescription>Set a new health and wellness goal</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goalType">Goal Type *</Label>
            <Select value={goalType} onValueChange={handleGoalTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="goalName">Goal Name *</Label>
            <Input
              id="goalName"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g., Lose 5kg in 3 months"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetValue">Target Value *</Label>
              <Input
                id="targetValue"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g., 10000"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., steps, kg"
              />
            </div>
          </div>

          <div>
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'PPP') : <span>Pick target date (optional)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is this goal important to you?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
