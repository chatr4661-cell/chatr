import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save } from 'lucide-react';

interface CollaborativeNotesProps {
  conversationId: string;
}

export const CollaborativeNotes = ({ conversationId }: CollaborativeNotesProps) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadNotes();
      subscribeToNotes();
    }
  }, [open, conversationId]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('conversation_notes')
      .select('content')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (data) {
      setNotes(data.content || '');
    }
  };

  const subscribeToNotes = () => {
    const channel = supabase
      .channel(`notes-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_notes',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setNotes(payload.new.content || '');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSave = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from('conversation_notes')
      .upsert({
        conversation_id: conversationId,
        content: notes,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Notes updated successfully',
      });
    }

    setIsSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" title="Shared Notes">
          <FileText className="h-5 w-5 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle>Shared Notes</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            These notes are shared with everyone in this conversation
          </p>
          
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Start typing your notes here..."
            className="min-h-[400px] resize-none"
          />

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};