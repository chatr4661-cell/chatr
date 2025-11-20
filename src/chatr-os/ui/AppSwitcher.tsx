import React from 'react';
import { X, Maximize2 } from 'lucide-react';
import { useChatrOS } from '@/components/ChatrOSProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSwitcher: React.FC<AppSwitcherProps> = ({ isOpen, onClose }) => {
  const { runningApps, terminateApp } = useChatrOS();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 animate-in fade-in duration-200">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Running Apps ({runningApps.length})</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {runningApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No apps currently running</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {runningApps.map((app) => (
                <Card key={app.id} className="p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{app.appName}</h3>
                      <p className="text-sm text-muted-foreground">{app.packageName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => terminateApp(app.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium capitalize">{app.lifecycleState}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPU:</span>
                      <span>{app.cpuUsageAvg?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memory:</span>
                      <span>{(app.memoryUsagePeak || 0 / 1024 / 1024).toFixed(0)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage:</span>
                      <span>{(app.storageUsed / 1024 / 1024).toFixed(1)} MB / {(app.storageQuota / 1024 / 1024).toFixed(0)} MB</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
