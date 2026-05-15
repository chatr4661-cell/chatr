import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, WifiOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

const JOBS_URL = 'https://talentxcel.in/jobs';

/**
 * Native-feeling Jobs module — embeds TalentXcel inside a WebView/iframe.
 * Keeps CHATR shell visible, hides browser chrome, native loader + offline retry.
 */
export default function TalentxcelJobs() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    // Haptic feedback on entry (native only)
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }).catch(() => {});
    }

    // Safety timeout to hide loader if iframe load event never fires
    const t = window.setTimeout(() => setLoading(false), 8000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.clearTimeout(t);
    };
  }, [reloadKey]);

  const handleReload = () => {
    setLoading(true);
    setErrored(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-0">
      {/* Native header */}
      <header
        className="flex items-center gap-3 px-3 border-b border-border bg-background/95 backdrop-blur-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', paddingBottom: 8 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-muted active:scale-95 transition flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate">Jobs</h1>
          <p className="text-[11px] text-muted-foreground truncate">Powered by TalentXcel</p>
        </div>
        <button
          onClick={handleReload}
          className="w-9 h-9 rounded-full hover:bg-muted active:scale-95 transition flex items-center justify-center"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Top progress bar */}
      {loading && !errored && online && (
        <div className="h-0.5 w-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 bg-primary animate-[slide_1.2s_ease-in-out_infinite]" />
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {/* Native loader */}
        {loading && !errored && online && (
          <div className="absolute inset-0 z-10 bg-background flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <img src={chatrIconLogo} alt="Chatr" className="h-16 w-16 animate-pulse" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading CHATR Jobs…</p>
            </div>
          </div>
        )}

        {/* Offline / error state */}
        {(!online || errored) && (
          <div className="absolute inset-0 z-20 bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{!online ? 'You are offline' : "Couldn't load Jobs"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {!online ? 'Check your connection and try again.' : 'Something went wrong. Please retry.'}
              </p>
            </div>
            <button
              onClick={handleReload}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Embedded TalentXcel — full-bleed, no browser chrome */}
        {online && (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={JOBS_URL}
            title="CHATR Jobs"
            className="absolute inset-0 w-full h-full border-0 bg-background"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setErrored(true);
            }}
            allow="geolocation; clipboard-read; clipboard-write; camera; microphone; identity-credentials-get; publickey-credentials-get *"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>

      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
