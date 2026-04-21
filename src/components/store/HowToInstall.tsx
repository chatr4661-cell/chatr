import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const HowToInstall = () => {
  const [open, setOpen] = useState(false);
  const steps = [
    'Tap "Install App" and confirm the download',
    'If your browser asks, allow installs from this source',
    'Open the downloaded APK to complete installation',
    'Launch the app and sign in with your CHATR account',
  ];

  return (
    <div className="mx-4 mb-6 rounded-2xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
      >
        <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="flex-1 text-sm font-semibold">How to Install</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t">
          <ol className="space-y-2.5 mt-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-xs">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t">
            All CHATR apps are signed and verified. Powered by CHATR Network.
          </p>
        </div>
      )}
    </div>
  );
};
