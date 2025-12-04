import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Timer, Shield } from 'lucide-react';
import { useDisappearingMessages, DISAPPEARING_OPTIONS } from '@/hooks/useDisappearingMessages';

interface DisappearingMessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
}

export const DisappearingMessagesSheet = ({
  open,
  onOpenChange,
  conversationId,
}: DisappearingMessagesSheetProps) => {
  const { duration, loading, updateDuration } = useDisappearingMessages(conversationId);

  const handleChange = async (value: string) => {
    const newDuration = value === 'null' ? null : parseInt(value);
    await updateDuration(newDuration);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Timer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Disappearing Messages</SheetTitle>
              <SheetDescription>
                Messages will auto-delete after the selected time
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4">
          <RadioGroup
            value={duration?.toString() ?? 'null'}
            onValueChange={handleChange}
            disabled={loading}
            className="space-y-3"
          >
            {DISAPPEARING_OPTIONS.map((option) => (
              <div
                key={option.label}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem
                  value={option.value?.toString() ?? 'null'}
                  id={option.label}
                />
                <Label
                  htmlFor={option.label}
                  className="flex-1 cursor-pointer font-medium"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            When enabled, new messages in this chat will disappear after the selected time. 
            This applies to messages from all participants.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
