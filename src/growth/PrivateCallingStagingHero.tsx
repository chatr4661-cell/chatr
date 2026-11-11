import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PhoneCall, Video, Share2, Copy, Check, ShieldCheck, 
  MessageSquare, User, Sparkles, Zap, Lock, ArrowRight, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export const PrivateCallingStagingHero: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Generate a cryptographically random room slug
  // Security Task 3: 122-bit Cryptographically Secure UUIDv4 Room ID Generator
  const [roomSlug] = useState(() => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `p-${crypto.randomUUID()}`;
      }
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `p-${hex}`;
    } catch {
      return `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 12)}`;
    }
  });

  const roomUrl = `https://chatr.chat/call/${roomSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    toast.success('Private call link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join my private HD call on CHATR (No app download or phone number exchange required):\n${roomUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleStartCall = () => {
    navigate(`/call/${roomSlug}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Privacy Anchor Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Zero-Contact Calling • No Phone Number Exchanged</span>
        </div>
      </div>

      {/* Main Staging Headline */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          Call Anyone Privately.
          <br />
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Without Sharing Your Phone Number.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Instant 48kHz HD Audio & Video. No app download. No contact saving required.
          Works directly in Mobile Chrome, Safari & Desktop.
        </p>
      </div>

      {/* Interactive Call Link Generator Card */}
      <div className="bg-card border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>YOUR DISPOSABLE PRIVATE ROOM</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" /> P2P Protected
            </span>
          </div>

          {/* Generated URL Box */}
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-muted/60 border border-border/60">
            <span className="text-xs sm:text-sm font-mono text-foreground font-medium truncate flex-1 pl-2">
              {roomUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 border border-border transition shrink-0"
              title="Copy private link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleStartCall}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Start Private Call</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base shadow-md flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Feature Guarantees */}
        <div className="grid grid-cols-3 gap-2 pt-6 mt-6 border-t border-border/60 text-center text-xs text-muted-foreground">
          <div className="space-y-1">
            <span className="block font-semibold text-foreground">Zero App Download</span>
            <span className="text-[11px]">Opens in mobile browser</span>
          </div>
          <div className="space-y-1">
            <span className="block font-semibold text-foreground">48 kHz Studio Audio</span>
            <span className="text-[11px]">Live speech subtitles</span>
          </div>
          <div className="space-y-1">
            <span className="block font-semibold text-foreground">Max 2 Participants</span>
            <span className="text-[11px]">Strict eavesdrop guard</span>
          </div>
        </div>
      </div>

      {/* Persistent Navigation to Authenticated Modules (Chats & Profile Preserved) */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card hover:bg-muted border border-border text-xs sm:text-sm font-semibold text-foreground transition shadow-xs"
        >
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Go to Messages & Chats</span>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card hover:bg-muted border border-border text-xs sm:text-sm font-semibold text-foreground transition shadow-xs"
        >
          <User className="w-4 h-4 text-primary" />
          <span>Account & Profile</span>
        </button>
      </div>
    </div>
  );
};
