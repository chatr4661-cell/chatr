import React, { useState } from 'react';
import { Timer, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DURATIONS = [
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '24 hours' },
  { value: 604800, label: '7 days' },
];

interface DisappearingMessagesDialogProps {
  conversationId: string;
  currentDuration?: number;
  onUpdate: (duration: number | null) => void;
}

export const DisappearingMessagesDialog = ({ 
  conversationId, 
  currentDuration,
  onUpdate 
}: DisappearingMessagesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<string>(currentDuration?.toString() || '0');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const durationValue = duration === '0' ? null : parseInt(duration);
      
      const { error } = await supabase
        .from('conversations')
        .update({
          disappearing_messages_duration: durationValue,
        })
        .eq('id', conversationId);

      if (error) throw error;

      onUpdate(durationValue);
      toast.success(
        durationValue 
          ? 'Disappearing messages enabled' 
          : 'Disappearing messages disabled'
      );
      setOpen(false);
    } catch (error) {
      console.error('Failed to update disappearing messages:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Timer className="h-4 w-4" />
          Disappearing Messages
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disappearing Messages</DialogTitle>
          <DialogDescription>
            Messages will automatically delete after the selected time period
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Delete messages after</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Off</SelectItem>
                {DURATIONS.map(d => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {duration !== '0' && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                ⚠️ Messages will be permanently deleted for all participants after {
                  DURATIONS.find(d => d.value.toString() === duration)?.label
                }
              </p>
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
