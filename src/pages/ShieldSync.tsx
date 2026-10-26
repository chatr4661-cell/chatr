import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Smartphone, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Zap, 
  ArrowRight,
  Radio,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { shieldMetricsService, ShieldLiveMetrics } from '@/services/shieldMetricsService';

export default function ShieldSync() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || searchParams.get('sync_token') || 'direct';
  const [synced, setSynced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [metrics, setMetrics] = useState<ShieldLiveMetrics>(shieldMetricsService.getMetrics());

  useEffect(() => {
    const unsub = shieldMetricsService.subscribe(setMetrics);
    return () => unsub();
  }, []);

  useEffect(() => {
    const userAgent = navigator.userAgent || '';
    const mobileDetected = /android|iphone|ipad|ipod/i.test(userAgent);
    setIsMobile(mobileDetected);

    // Deep link scheme targeting
    const deepLinkUrl = `chatr://shield-sync?token=${encodeURIComponent(token)}`;
    const androidIntentUrl = `intent://chatr.chat/shield-sync?token=${encodeURIComponent(token)}#Intent;scheme=chatr;package=com.chatr.app;end`;

    // Attempt automatic app launch on mobile
    if (mobileDetected) {
      if (/android/i.test(userAgent)) {
        window.location.href = androidIntentUrl;
        setTimeout(() => {
          window.location.href = deepLinkUrl;
        }, 400);
      } else {
        window.location.href = deepLinkUrl;
      }
    }

    // Broadcast synchronization confirmation to desktop session via Supabase Realtime
    if (token) {
      const channel = supabase.channel(`shield-sync-${token}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'synced',
            payload: {
              token,
              timestamp: new Date().toISOString(),
              platform: /android/i.test(userAgent) ? 'Android' : /iphone|ipad/i.test(userAgent) ? 'iOS' : 'Web Browser',
              userAgent,
            },
          });
          setSynced(true);
        }
      });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [token]);

  const handleLaunchApp = () => {
    const deepLinkUrl = `chatr://shield-sync?token=${encodeURIComponent(token)}`;
    const androidIntentUrl = `intent://chatr.chat/shield-sync?token=${encodeURIComponent(token)}#Intent;scheme=chatr;package=com.chatr.app;end`;

    if (/android/i.test(navigator.userAgent)) {
      window.location.href = androidIntentUrl;
      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 300);
    } else {
      window.location.href = deepLinkUrl;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030818] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Neon Wave Glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-cyan-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#071129]/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-cyan-950/60 flex flex-col items-center text-center relative z-10">
        
        {/* Shield Icon */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <ShieldCheck className="w-9 h-9 text-cyan-400" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#071129] animate-pulse" />
        </div>

        {/* Title without TM */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
          CHATR <span className="text-cyan-400">Shield</span>
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-blue-200 mt-1">
          Cross-Device Mobile Shield Sync
        </p>
        <p className="text-xs text-blue-300/70 mt-1">
          Scan with the Chatr Mobile app (Android / iOS) to synchronize real-time spam intelligence across all devices.
        </p>

        {/* Sync Status Badge */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs border-cyan-400/40 text-cyan-300 bg-cyan-950/40 px-3 py-1 font-bold">
            Auto-Sync On
          </Badge>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Mesh
          </div>
        </div>

        {/* Sync confirmation box */}
        <div className="my-5 w-full p-4 rounded-2xl bg-[#091535] border border-blue-500/25 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Real-Time Spam Mesh Linked</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono">TOKEN: {token.slice(0, 10)}...</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/20 text-xs">
            <div>
              <span className="text-[10px] text-blue-300/60">Calls Screened:</span>
              <p className="font-bold text-white">{metrics.callsScreened.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/60">Threats Blocked:</span>
              <p className="font-bold text-red-400">{metrics.threatsBlocked.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="w-full space-y-2.5">
          <Button 
            onClick={handleLaunchApp}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 bg-[length:200%_auto] hover:bg-right text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Smartphone className="w-4 h-4 text-slate-950" />
            Open Direct Chatr App on Phone
          </Button>

          <Button 
            variant="outline"
            onClick={() => navigate('/calls')}
            className="w-full h-10 rounded-xl border-blue-500/40 text-blue-200 hover:bg-blue-600/20 text-xs flex items-center justify-center gap-1.5"
          >
            Continue to Web Calls & Dialer
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-blue-300/60">
            <a href="/download" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <Download className="w-3 h-3" />
              Download APK
            </a>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Lock className="w-3 h-3" />
              E2E Encrypted Mesh
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
