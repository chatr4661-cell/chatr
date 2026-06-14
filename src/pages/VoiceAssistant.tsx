import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Square, Loader2, AudioLines, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceConversation } from '@/voice/useVoiceConversation';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Tap to start',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const { status, active, supported, interim, turns, start, stop, interrupt } =
    useVoiceConversation({
      systemPrompt:
        "You are Chatr's voice assistant. Reply in short, natural spoken sentences. " +
        'Keep answers to 1-3 sentences unless asked for more. No markdown or emojis — your reply is read aloud.',
      lang: 'en-IN',
    });

  const orbState = useMemo(() => {
    if (status === 'listening') return 'ring-primary/60 scale-105';
    if (status === 'thinking') return 'ring-amber-400/60';
    if (status === 'speaking') return 'ring-emerald-400/70 scale-110';
    return 'ring-border';
  }, [status]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>Voice Assistant — Chatr</title>
        <meta name="description" content="Talk naturally with Chatr's zero-cost on-device voice assistant." />
      </Helmet>

      <header className="flex items-center gap-3 px-4 h-14 border-b border-border/60 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold leading-none">Voice Assistant</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">On-device first · zero-cost</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-between px-5 py-8">
        {/* Transcript */}
        <div className="w-full max-w-md flex-1 overflow-y-auto space-y-3 mb-6">
          {turns.length === 0 && !interim && (
            <p className="text-center text-sm text-muted-foreground mt-10">
              {supported
                ? 'Start a conversation — speak naturally and I’ll reply out loud.'
                : 'Voice is not supported in this browser. Try Chrome or the Chatr app.'}
            </p>
          )}
          {turns.map((t, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm',
                t.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground rounded-br-md'
                  : 'mr-auto bg-muted text-foreground rounded-bl-md',
              )}
            >
              {t.text}
            </div>
          ))}
          {interim && (
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm bg-primary/40 text-primary-foreground italic">
              {interim}
            </div>
          )}
        </div>

        {/* Orb */}
        <div className="flex flex-col items-center gap-5">
          <div
            className={cn(
              'w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-4 transition-all duration-300 flex items-center justify-center',
              orbState,
            )}
          >
            {status === 'thinking' ? (
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            ) : status === 'speaking' ? (
              <AudioLines className="w-8 h-8 text-emerald-400 animate-pulse" />
            ) : (
              <Mic className={cn('w-8 h-8', active ? 'text-primary' : 'text-muted-foreground')} />
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">{STATUS_LABEL[status]}</p>

          <div className="flex items-center gap-3">
            {!active ? (
              <Button onClick={start} disabled={!supported} size="lg" className="rounded-full px-8">
                <Mic className="w-4 h-4 mr-2" /> Start
              </Button>
            ) : (
              <>
                {status === 'speaking' && (
                  <Button onClick={interrupt} variant="secondary" size="lg" className="rounded-full">
                    <Hand className="w-4 h-4 mr-2" /> Interrupt
                  </Button>
                )}
                <Button onClick={stop} variant="destructive" size="lg" className="rounded-full px-8">
                  <Square className="w-4 h-4 mr-2" /> Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
