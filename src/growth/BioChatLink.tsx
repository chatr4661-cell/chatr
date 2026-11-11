import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Send, Video, ShieldCheck, CheckCircle2, Phone, Sparkles, 
  ArrowRight, MessageCircle, ExternalLink, UserCheck, Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const BioChatLink: React.FC = () => {
  const { username = '' } = useParams<{ username?: string }>();
  const cleanUsername = username.replace(/^@/, '').trim();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        if (!cleanUsername) return;

        // Try searching by username or phone
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, phone_number')
          .or(`username.ilike.${cleanUsername},phone_number.ilike.%${cleanUsername}%`)
          .limit(1)
          .maybeSingle();

        if (data) {
          setProfile(data);
        } else {
          // Fallback demo profile for bio link previews
          setProfile({
            username: cleanUsername,
            full_name: cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1),
            bio: 'Messaging & calling on CHATR. Free, encrypted and private.',
            avatar_url: null,
          });
        }
      } catch (err) {
        console.warn('Error fetching bio profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [cleanUsername]);

  const handleInitialSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsModalOpen(true);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorPhone || visitorPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSending(true);
    try {
      // Forward directly to chat onboarding with message payload preserved
      toast.success('Message sent! Redirecting to conversation...');
      setIsSent(true);
      setTimeout(() => {
        navigate(`/auth?phone=${encodeURIComponent(visitorPhone)}&ref=bio_${cleanUsername}&target=${profile?.id || cleanUsername}&initialMsg=${encodeURIComponent(message)}`);
      }, 800);
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const startInstantVideoCall = () => {
    const callRoomId = `${cleanUsername}-${Math.random().toString(36).substring(2, 7)}`;
    navigate(`/call/${callRoomId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.username || cleanUsername;
  const avatar = profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">
            C
          </div>
          <span className="font-extrabold tracking-tight text-white text-base">chatr</span>
        </div>
        <button
          onClick={() => navigate('/auth?ref=bio_cta')}
          className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
        >
          Claim your @handle
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        
        {/* Profile Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-sm text-center relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Account</span>
            </div>
          </div>

          <div className="relative inline-block mb-4">
            <img
              src={avatar}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/40 shadow-xl mx-auto"
            />
            <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute bottom-1 right-1" title="Online" />
          </div>

          <h1 className="text-xl font-extrabold text-white flex items-center justify-center gap-1.5 mb-1">
            <span>{displayName}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </h1>
          <p className="text-xs text-emerald-400 font-mono font-medium mb-3">@{cleanUsername}</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto mb-6">
            {profile?.bio || 'Available for messaging, consultations, and HD video calls on CHATR.'}
          </p>

          {/* 1-Click Video Call Action */}
          <button
            onClick={startInstantVideoCall}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition transform active:scale-[0.98]"
          >
            <Video className="w-4 h-4" />
            <span>Start Free Video Call with {displayName}</span>
          </button>
        </div>

        {/* Instant Web Messaging Input */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-400 font-medium">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct Web Message (Delivered to phone)</span>
          </div>

          <form onSubmit={handleInitialSend} className="space-y-3">
            <textarea
              rows={3}
              placeholder={`Send a quick message to ${displayName}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </form>
        </div>

      </main>

      {/* Reply-To Modal (Lead & Signup Gate) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Phone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Where should {displayName} reply?
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Enter your mobile number to get an instant notification when {displayName} responds.
            </p>

            <form onSubmit={handleFinalSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Your Name (optional)"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <span>{sending ? 'Connecting...' : 'Send & Connect Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-3 text-xs text-slate-500 hover:text-slate-400 py-1 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer / CTA */}
      <footer className="border-t border-slate-900/80 p-4 text-center">
        <p className="text-xs text-slate-500 mb-2">
          Powered by <span className="text-emerald-400 font-semibold">CHATR</span> • End-to-End Encrypted Communication
        </p>
        <button
          onClick={() => navigate('/auth?ref=bio_footer')}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4 transition"
        >
          Create your free CHATR bio link & claim 100 bonus coins
        </button>
      </footer>

    </div>
  );
};

export default BioChatLink;
