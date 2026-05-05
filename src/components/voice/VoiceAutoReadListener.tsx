// Hooks Supabase Realtime → enqueues incoming chat messages when auto-read is ON.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceContext } from '@/voice/VoicePlayerContext';

export function VoiceAutoReadListener() {
  const { autoReadEnabled, enqueue } = useVoiceContext();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!autoReadEnabled || !userId) return;

    const channel = supabase
      .channel(`voice-autoread:${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const m = payload.new as any;
          if (!m || m.sender_id === userId) return;          // ignore own
          const text = (m.content || '').trim();
          if (!text) return;

          // confirm this user actually participates in the conversation
          const { data: parts } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', m.conversation_id);
          const isMine = parts?.some((p: any) => p.user_id === userId);
          if (!isMine) return;

          enqueue(text, m.id);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [autoReadEnabled, userId, enqueue]);

  return null;
}
