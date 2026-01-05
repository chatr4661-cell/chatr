/**
 * Backup & Restore Sheet
 * UI for managing chat backups
 */

import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useMessageBackup } from '@/hooks/useMessageBackup';
import { format } from 'date-fns';
import { 
  Cloud, 
  CloudUpload, 
  Download, 
  Trash2, 
  HardDrive,
  Shield,
  Clock,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupRestoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BackupRestoreSheet: React.FC<BackupRestoreSheetProps> = ({
  open,
  onOpenChange
}) => {
  const {
    isBackingUp,
    isRestoring,
    progress,
    backups,
    createBackup,
    restoreBackup,
    loadBackups,
    deleteBackup,
    exportToFile
  } = useMessageBackup();

  const [includeMedia, setIncludeMedia] = React.useState(false);

  useEffect(() => {
    if (open) {
      loadBackups();
    }
  }, [open, loadBackups]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Chat Backup
          </SheetTitle>
          <SheetDescription>
            Backup your messages to the cloud or export to a file
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] pb-6">
          {/* Backup Progress */}
          {progress && (progress.phase !== 'complete' && progress.phase !== 'error') && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progress.message}</span>
                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          )}

          {/* Create Backup Section */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <CloudUpload className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Create Backup</h3>
                <p className="text-sm text-muted-foreground">
                  Back up all your messages to the cloud
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <Label htmlFor="include-media" className="text-sm">
                Include media files
              </Label>
              <Switch 
                id="include-media"
                checked={includeMedia}
                onCheckedChange={setIncludeMedia}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={() => createBackup(includeMedia)}
                disabled={isBackingUp}
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Backup Now
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={exportToFile}
                disabled={isBackingUp}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 px-2">
            <Shield className="w-4 h-4 text-green-500 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your backups are encrypted end-to-end. Only you can access them.
            </p>
          </div>

          {/* Backup History */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Backup History
            </h3>

            {backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HardDrive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No backups yet</p>
                <p className="text-xs">Create your first backup above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div 
                    key={backup.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(backup.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {backup.message_count} messages • {formatFileSize(backup.size_bytes || 0)}
                          {backup.includes_media && ' • Includes media'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restoreBackup(backup.id)}
                        disabled={isRestoring}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteBackup(backup.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto Backup Settings */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">Auto Backup</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-backup" className="text-sm">
                  Enable automatic backups
                </Label>
                <Switch id="auto-backup" />
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically backup your messages daily when connected to Wi-Fi
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
