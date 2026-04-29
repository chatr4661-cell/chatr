import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Share2, MessageCircle, Copy, Check, Send, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_BONUS_COINS = 500;
const SHARE_BASE = typeof window !== 'undefined' ? window.location.origin : 'https://chatr.chat';

async function ensureCode(userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('chatr_referral_codes')
    .select('code')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (existing?.code) return existing.code;

  // Try to generate via edge function; fall back to local code if unavailable.
  try {
    const { data } = await supabase.functions.invoke('generate-referral-code', { body: { userId } });
    if (data?.code) return data.code;
  } catch {}

  const fallback = `CHATR${userId.slice(0, 6).toUpperCase()}`;
  await supabase
    .from('chatr_referral_codes')
    .upsert({ user_id: userId, code: fallback, is_active: true }, { onConflict: 'user_id' });
  return fallback;
}

export function EarnShareBlock() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (mounted) setLoading(false); return; }
      const c = await ensureCode(auth.user.id);
      if (mounted) { setCode(c); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const link = code ? `${SHARE_BASE}/?ref=${code}` : SHARE_BASE;
  const message = `🚀 I'm earning real ₹ on Chatr — just by listening to short clips & rating things. Use my code ${code ?? ''} and we both get ${REFERRAL_BONUS_COINS} coins. ${link}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  const openSMS = () => {
    window.open(`sms:?&body=${encodeURIComponent(message)}`, '_self');
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Earn on Chatr', text: message, url: link });
      } catch {}
    } else {
      onCopy();
    }
  };

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4 text-emerald-600" />
          Invite & earn ₹50 per friend
          <Badge variant="secondary" className="ml-auto text-[10px]">Viral</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Share your code. Every friend who joins earns you {REFERRAL_BONUS_COINS} coins. Multi-level bonuses pay you even when their friends join.
        </p>

        <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
          {loading ? (
            <Skeleton className="h-7 flex-1" />
          ) : (
            <>
              <code className="flex-1 truncate font-mono text-sm font-semibold">{code ?? '—'}</code>
              <Button size="sm" variant="ghost" onClick={onCopy} disabled={!code} className="h-7 gap-1 px-2">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span className="text-xs">{copied ? 'Copied' : 'Copy link'}</span>
              </Button>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={openWhatsApp} disabled={!code} className="bg-emerald-600 hover:bg-emerald-700">
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </Button>
          <Button onClick={openSMS} disabled={!code} variant="secondary">
            <Send className="mr-1 h-4 w-4" /> SMS
          </Button>
          <Button onClick={nativeShare} disabled={!code} variant="outline">
            <Share2 className="mr-1 h-4 w-4" /> More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface MissionShareButtonProps {
  taskId: string;
  taskTitle: string;
  rewardRupees: number;
}

export function MissionShareButton({ taskId, taskTitle, rewardRupees }: MissionShareButtonProps) {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const c = await ensureCode(auth.user.id);
      if (mounted) setCode(c);
    })();
    return () => { mounted = false; };
  }, []);

  const handleShare = async () => {
    const url = `${SHARE_BASE}/earn?mission=${taskId}${code ? `&ref=${code}` : ''}`;
    const text = `🔥 Quick ₹${rewardRupees} task on Chatr: "${taskTitle}". Grab it before it's gone — ${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: taskTitle, text, url }); return; } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={handleShare}
      className="h-8 gap-1 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
      aria-label="Share this mission"
    >
      <Share2 className="h-4 w-4" />
      Share & earn extra
    </Button>
  );
}
