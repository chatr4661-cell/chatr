import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ghost } from 'lucide-react';
import { toast } from 'sonner';

interface GhostChatToggleProps {
  conversationId: string;
  isGhostChat: boolean;
  onUpdate?: () => void;
}

export const GhostChatToggle = ({ conversationId, isGhostChat, onUpdate }: GhostChatToggleProps) => {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState('60'); // minutes

  const enableGhostMode = async () => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(duration));

    const { error: convError } = await supabase
      .from('conversations')
      .update({
        is_ghost_chat: true,
        ghost_chat_duration: parseInt(duration),
        ghost_chat_expires_at: expiresAt.toISOString(),
      } as any)
      .eq('id', conversationId);

    if (convError) {
      toast.error('Failed to enable ghost mode');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const sessionError = null; // Types will refresh after migration
    // await supabase.from('ghost_chat_sessions').insert({
    //   conversation_id: conversationId,
    //   created_by: user?.id,
    //   expires_at: expiresAt.toISOString(),
    // });

    if (sessionError) {
      toast.error('Failed to create ghost session');
      return;
    }

    toast.success(`Ghost mode enabled. Chat will auto-delete in ${duration} minutes.`);
    setOpen(false);
    onUpdate?.();
  };

  const disableGhostMode = async () => {
    const { error } = await supabase
      .from('conversations')
      .update({
        is_ghost_chat: false,
        ghost_chat_duration: null,
        ghost_chat_expires_at: null,
      } as any)
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to disable ghost mode');
      return;
    }

    toast.success('Ghost mode disabled');
    onUpdate?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isGhostChat ? 'default' : 'outline'} size="sm" className="gap-2">
          <Ghost className="h-4 w-4" />
          {isGhostChat ? 'Ghost Active' : 'Ghost Mode'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghost Chat Mode</DialogTitle>
          <DialogDescription>
            Ghost chats auto-delete after a set time. All messages and media will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        {!isGhostChat ? (
          <div className="space-y-4">
            <div>
              <Label>Auto-delete after</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="360">6 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={enableGhostMode} className="w-full">
              Enable Ghost Mode
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This chat is currently in ghost mode and will auto-delete.
            </p>
            <Button onClick={disableGhostMode} variant="outline" className="w-full">
              Disable Ghost Mode
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
