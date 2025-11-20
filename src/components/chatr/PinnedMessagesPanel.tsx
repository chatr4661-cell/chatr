import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Pin, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface PinnedMessagesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
}

export function PinnedMessagesPanel({ open, onOpenChange, conversationId, userId }: PinnedMessagesPanelProps) {
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);

  useEffect(() => {
    if (open) loadPinnedMessages();
  }, [open, conversationId]);

  const loadPinnedMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setPinnedMessages(data.map(m => ({ ...m, profiles: { username: 'User' } })));
  };

  const handleUnpin = async (messageId: string) => {
    // For now, just remove from state
    setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5" />
            Pinned Messages
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {pinnedMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No pinned messages
            </div>
          ) : (
            pinnedMessages.map(msg => (
              <div key={msg.id} className="bg-muted/50 rounded-lg p-3 relative group">
                <button
                  onClick={() => handleUnpin(msg.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-xs font-semibold text-primary mb-1">
                  {msg.profiles?.username}
                </div>
                <div className="text-sm mb-2">{msg.content}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
