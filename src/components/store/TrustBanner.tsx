import { ShieldCheck, Server, Ban } from 'lucide-react';

export const TrustBanner = () => {
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-background to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20 border-b">
      <div className="px-4 py-4 max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground">Official CHATR App Store</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">All apps are verified before release</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="truncate">Verified & Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Server className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="truncate">CHATR Servers</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Ban className="h-3 w-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span className="truncate">No ads. No malware.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
