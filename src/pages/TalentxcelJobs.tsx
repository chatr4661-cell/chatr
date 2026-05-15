import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, WifiOff, Briefcase } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

const JOBS_BASE = 'https://talentxcel.in/jobs';

/**
 * Native-feeling Jobs module powered by TalentXcel.
 * - Native (Capacitor): launches in-app WebView via @capacitor/browser (no Chrome chrome).
 * - Web: TalentXcel sends X-Frame-Options: DENY so iframe is impossible —
 *   render a CHATR-branded launch screen that opens it in a new tab.
 */
export default function TalentxcelJobs() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const targetUrl = jobId ? `${JOBS_BASE}/${jobId}` : JOBS_BASE;
  const launchedRef = useRef(false);
  const [opening, setOpening] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const launch = async () => {
    if (opening) return;
    setOpening(true);

    // Haptic feedback on native
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }

    if (Capacitor.isNativePlatform()) {
      // In-app WebView — no browser chrome, themed, stays inside CHATR shell.
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({
          url: targetUrl,
          presentationStyle: 'popover',
          toolbarColor: '#0F172A',
        });
      } catch (e) {
        window.location.href = targetUrl;
      }
    } else {
      // Web: site blocks iframe embedding — open in new tab.
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }

    setTimeout(() => setOpening(false), 800);
  };

  // Auto-launch once on native so it really feels like a native screen.
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !launchedRef.current && online) {
      launchedRef.current = true;
      launch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-0">
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
          onClick={launch}
          className="w-9 h-9 rounded-full hover:bg-muted active:scale-95 transition flex items-center justify-center"
          aria-label="Reopen"
        >
          <RefreshCw className={`w-4 h-4 ${opening ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center px-6">
        {!online ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">You are offline</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reconnect to browse jobs.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center max-w-sm w-full">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl" />
              <img
                src={chatrIconLogo}
                alt="Chatr"
                className="relative h-20 w-20 rounded-2xl"
              />
            </div>

            <h2 className="text-xl font-semibold tracking-tight">CHATR Jobs</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Discover and apply to thousands of roles, powered by TalentXcel.
              Sign in inside the app to apply.
            </p>

            <button
              onClick={launch}
              disabled={opening}
              className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-70"
            >
              {opening ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4" />
                  Open Jobs
                </>
              )}
            </button>

            <button
              onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
              className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition"
            >
              View on talentxcel.in <ExternalLink className="w-3 h-3" />
            </button>

            <p className="mt-8 text-[11px] text-muted-foreground/70">
              Chatr — A product of Talentxcel Services Pvt Ltd
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
