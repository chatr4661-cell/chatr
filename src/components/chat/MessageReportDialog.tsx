import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessageReportDialogProps {
  open: boolean;
  onClose: () => void;
  messageId: string;
  conversationId: string;
  reportedUserId: string;
  userId: string;
}

export const MessageReportDialog: React.FC<MessageReportDialogProps> = ({
  open,
  onClose,
  messageId,
  conversationId,
  reportedUserId,
  userId,
}) => {
  const [reason, setReason] = React.useState<string>('spam');
  const [details, setDetails] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('message_reports').insert({
        message_id: messageId,
        conversation_id: conversationId,
        reported_by: userId,
        reported_user_id: reportedUserId,
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      toast.success('Report submitted successfully');
      onClose();
      setReason('spam');
      setDetails('');
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Report Message
          </DialogTitle>
          <DialogDescription>
            Help us keep Chatr safe. Your report will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">
              Why are you reporting this message?
            </Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam" className="cursor-pointer flex-1">
                  Spam
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment" className="cursor-pointer flex-1">
                  Harassment or Bullying
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="inappropriate" id="inappropriate" />
                <Label htmlFor="inappropriate" className="cursor-pointer flex-1">
                  Inappropriate Content
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="violence" id="violence" />
                <Label htmlFor="violence" className="cursor-pointer flex-1">
                  Violence or Threats
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="cursor-pointer flex-1">
                  Other
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="details" className="text-sm font-medium">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more context about why you're reporting this message..."
              className="mt-2 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {details.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
