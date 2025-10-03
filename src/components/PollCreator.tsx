import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PollCreatorProps {
  open: boolean;
  onClose: () => void;
  onSend: (question: string, options: string[]) => void;
}

export const PollCreator = ({ open, onClose, onSend }: PollCreatorProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const { toast } = useToast();

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSend = () => {
    const validOptions = options.filter(o => o.trim());
    
    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a poll question',
        variant: 'destructive'
      });
      return;
    }

    if (validOptions.length < 2) {
      toast({
        title: 'Error',
        description: 'Please enter at least 2 options',
        variant: 'destructive'
      });
      return;
    }

    onSend(question, validOptions);
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label>Options</Label>
            <ScrollArea className="h-48 mt-2">
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            {options.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={addOption}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSend} className="flex-1">
              Send Poll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
