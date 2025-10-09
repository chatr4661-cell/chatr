import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageReminderProps {
  messageId: string;
  messageContent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessageReminder = ({ messageId, messageContent, open, onOpenChange }: MessageReminderProps) => {
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const { toast } = useToast();

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', 
    '17:00', '18:00', '19:00', '20:00'
  ];

  const handleSetReminder = async () => {
    if (!date || !selectedTime) {
      toast({
        title: 'Missing information',
        description: 'Please select both date and time',
        variant: 'destructive',
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(':');
    const reminderDate = new Date(date);
    reminderDate.setHours(parseInt(hours), parseInt(minutes), 0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('message_reminders')
      .insert({
        user_id: user.id,
        message_id: messageId,
        reminder_time: reminderDate.toISOString(),
        message_preview: messageContent.substring(0, 100),
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to set reminder',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Reminder set',
      description: `You'll be reminded on ${reminderDate.toLocaleDateString()} at ${selectedTime}`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remind Me Later</DialogTitle>
          <DialogDescription>
            Set a reminder to reply to this message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground line-clamp-2">{messageContent}</p>
          </div>

          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date()}
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Time</label>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTime(time)}
                  className="text-xs"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSetReminder} className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};