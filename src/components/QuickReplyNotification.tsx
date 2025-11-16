import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface QuickReplyNotificationProps {
  conversationId: string;
  senderName: string;
  message: string;
  onClose: () => void;
}

export const QuickReplyNotification = ({
  conversationId,
  senderName,
  message,
  onClose
}: QuickReplyNotificationProps) => {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: reply,
        type: 'text'
      });

      toast.success('Reply sent');
      onClose();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 p-4 shadow-lg border-2 border-primary z-[200] animate-in slide-in-from-bottom">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold">{senderName}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{message}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Type a reply..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !reply.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
