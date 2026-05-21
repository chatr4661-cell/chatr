/**
 * VoiceNoteFallbackSheet
 *
 * When a call truly cannot be re-established (90s resume window expired on a
 * sub-2G network), this sheet lets the caller record a 30s voice note and
 * deliver it to the partner via SMS link. Guarantees the user *never* feels
 * the call "just failed" — there is always a path through.
 *
 * Flow:
 *   1. MediaRecorder captures up to 30s of mic audio (opus/webm).
 *   2. Blob is uploaded to the public `voice-notes` storage bucket.
 *   3. send-sms edge function is invoked with a short message + public URL.
 *   4. Sheet auto-dismisses on success.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  contactName: string;
  contactPhone?: string;
  onClose: () => void;
}

const MAX_SECONDS = 30;

export default function VoiceNoteFallbackSheet({ open, contactName, contactPhone, onClose }: Props) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review' | 'sending' | 'sent' | 'error'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      cleanup();
      setPhase('idle');
      setSeconds(0);
      setErrorMsg(null);
      blobRef.current = null;
    }
  }, [open]);

  const cleanup = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 24000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: mime });
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setPhase('review');
      };
      rec.start();
      recorderRef.current = rec;
      setPhase('recording');
      setSeconds(0);
      tickRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; }
          return prev + 1;
        });
      }, 1000);
    } catch (e: any) {
      console.error('[VoiceNote] mic error', e);
      setErrorMsg('Microphone unavailable');
      setPhase('error');
    }
  };

  const stopRecording = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { recorderRef.current?.stop(); } catch {}
  };

  const send = async () => {
    if (!blobRef.current) return;
    if (!contactPhone) { setErrorMsg('No phone number for contact'); setPhase('error'); return; }
    setPhase('sending');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const ext = blobRef.current.type.includes('mp4') ? 'm4a' : 'webm';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('voice-notes')
        .upload(path, blobRef.current, { contentType: blobRef.current.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('voice-notes').getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: smsErr } = await supabase.functions.invoke('send-sms', {
        body: {
          to: contactPhone,
          body: `Chatr: Your call dropped on a weak network. Voice note from ${contactName || 'a contact'}: ${url}`,
        },
      });
      if (smsErr) throw smsErr;
      setPhase('sent');
      setTimeout(onClose, 1600);
    } catch (e: any) {
      console.error('[VoiceNote] send error', e);
      setErrorMsg(e?.message || 'Failed to send');
      setPhase('error');
    }
  };

  if (!open) return null;
  const pct = (seconds / MAX_SECONDS) * 100;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 240 }}
          className="w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl bg-background/95 backdrop-blur-2xl border border-border/40 shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Network too weak</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send {contactName} a voice note instead — delivered by SMS.
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="relative my-6 flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              {phase === 'recording' && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              {phase === 'sending' ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> :
               phase === 'sent' ? <Send className="w-8 h-8 text-primary" /> :
               <Mic className="w-8 h-8 text-primary" />}
            </div>
            <div className="mt-4 text-sm font-mono text-foreground tabular-nums">
              {seconds.toString().padStart(2, '0')} / {MAX_SECONDS}s
            </div>
            <div className="w-full mt-2 h-1 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-primary" animate={{ width: `${pct}%` }} />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-destructive text-center mb-3">{errorMsg}</p>
          )}

          <div className="flex gap-2">
            {phase === 'idle' || phase === 'error' ? (
              <button
                onClick={startRecording}
                className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition"
              >
                Start recording
              </button>
            ) : phase === 'recording' ? (
              <button
                onClick={stopRecording}
                className="flex-1 h-11 rounded-full bg-destructive text-destructive-foreground text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop
              </button>
            ) : phase === 'review' ? (
              <>
                <button
                  onClick={() => { blobRef.current = null; setSeconds(0); setPhase('idle'); }}
                  className="flex-1 h-11 rounded-full bg-muted text-foreground text-sm font-medium"
                >
                  Retake
                </button>
                <button
                  onClick={send}
                  className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Send className="w-3.5 h-3.5" /> Send via SMS
                </button>
              </>
            ) : phase === 'sent' ? (
              <div className="flex-1 text-center text-sm text-primary font-medium">Sent ✓</div>
            ) : (
              <div className="flex-1 text-center text-sm text-muted-foreground">Sending…</div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
