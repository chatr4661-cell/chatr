import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, Server, Lock, Download } from 'lucide-react';
import { AppIconBadge } from '@/components/store/AppIconBadge';

interface InstallConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: {
    id: string;
    app_name: string;
    icon_url?: string | null;
    category_id?: string | null;
    version?: string | null;
    file_size_bytes?: number | null;
    apk_url?: string | null;
  } | null;
  onConfirm: () => void;
  isUpdate?: boolean;
}

const formatSize = (bytes: number | null | undefined) => {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export const InstallConfirmDialog = ({ open, onOpenChange, app, onConfirm, isUpdate }: InstallConfirmDialogProps) => {
  if (!app) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Verified header */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 px-6 py-4 border-b">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Safe & Verified by CHATR</span>
          </div>
        </div>

        <div className="px-6 pt-5 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-4">
              <AppIconBadge name={app.app_name} category={app.category_id} iconUrl={app.icon_url} size="lg" />
              <div className="flex-1 min-w-0 pt-1">
                <DialogTitle className="text-base">{app.app_name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Version {app.version || '1.0.0'} • {formatSize(app.file_size_bytes)}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Trust facts */}
          <div className="mt-5 space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs">
              <Server className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Direct secure download from CHATR servers</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <Lock className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">No ads. No tracking. No malware.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <Shield className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Verified before release by CHATR security team</span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-5 gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={onConfirm}>
            <Download className="h-4 w-4" />
            {isUpdate ? 'Update Now' : 'Download & Install'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
