import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isAutoSaveEnabled, setAutoSaveEnabled } from '@/utils/mediaGallery';
import { Image, Video, Download } from 'lucide-react';

export const MediaAutoSaveSettings = () => {
  const [autoSave, setAutoSave] = useState(isAutoSaveEnabled());

  const handleToggle = (enabled: boolean) => {
    setAutoSave(enabled);
    setAutoSaveEnabled(enabled);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Media Auto-Save
        </CardTitle>
        <CardDescription>
          Automatically save received images and videos to your device gallery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-save" className="text-base font-medium">
              Auto-save to Gallery
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, photos and videos sent to you will be automatically saved
            </p>
          </div>
          <Switch
            id="auto-save"
            checked={autoSave}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="w-4 h-4" />
            <span>Images will be saved as JPG/PNG</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="w-4 h-4" />
            <span>Videos will be saved as MP4/WEBM</span>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="text-muted-foreground">
            💡 <strong>Tip:</strong> You can also manually save any media by opening it and tapping the gallery icon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
