import { AlertTriangle, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import type { MicPermission } from '@/voice/useSpeechInput';

interface Props {
  permission: MicPermission;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Explains *why* the mic is blocked and how to re-enable it.
 * Shown when the browser/OS denies microphone access.
 */
export function MicPermissionBanner({ permission, onRetry, className, compact }: Props) {
  if (permission !== 'denied' && permission !== 'unsupported') return null;

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

  const title = permission === 'unsupported'
    ? 'Voice input not supported'
    : 'Microphone access blocked';

  let steps: string[] = [];
  if (permission === 'denied') {
    if (isNative && platform === 'android') {
      steps = [
        'Open phone Settings → Apps → Chatr → Permissions',
        'Enable “Microphone”',
        'Return to Chatr and tap Retry',
      ];
    } else if (isNative && platform === 'ios') {
      steps = [
        'Open iOS Settings → Chatr',
        'Toggle “Microphone” on',
        'Return to Chatr and tap Retry',
      ];
    } else {
      steps = [
        'Click the lock icon in your browser address bar',
        'Set “Microphone” to Allow',
        'Reload the page, then tap Retry',
      ];
    }
  } else {
    steps = ['Try the latest Chrome, Edge, or Safari, or use the Chatr mobile app.'];
  }

  const openSystemSettings = async () => {
    if (isNative) {
      try {
        const mod: any = await import('@capacitor/app').catch(() => null);
        // No standardized "open app settings" in core Capacitor; best-effort.
        if (mod?.App?.exitApp && false) mod.App.exitApp();
      } catch {}
    }
  };

  return (
    <div
      role="alert"
      className={`rounded-xl border border-destructive/30 bg-destructive/5 text-destructive-foreground ${compact ? 'p-2.5' : 'p-3'} ${className || ''}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <ol className="mt-1 list-decimal pl-4 space-y-0.5 text-xs text-muted-foreground">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <div className="mt-2 flex flex-wrap gap-2">
            {onRetry && permission === 'denied' && (
              <Button type="button" size="sm" variant="secondary" onClick={onRetry} className="h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            )}
            {isNative && permission === 'denied' && (
              <Button type="button" size="sm" variant="ghost" onClick={openSystemSettings} className="h-7 text-xs">
                <SettingsIcon className="w-3 h-3 mr-1" /> Open settings
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
