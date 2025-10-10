import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AIImageGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSend: (imageUrl: string, prompt: string) => void;
}

export const AIImageGenerator = ({ open, onClose, onSend }: AIImageGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a description',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: { 
          type: 'generate-image',
          prompt: prompt.trim() 
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onSend(data.imageUrl, prompt);
        setPrompt('');
        onClose();
        toast({
          title: 'Success',
          description: 'Image generated successfully!'
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate AI Image
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt">Image Description</Label>
            <Input
              id="prompt"
              placeholder="A beautiful sunset over mountains..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2"
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Describe the image you want to create
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={generating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate} 
              className="flex-1"
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
