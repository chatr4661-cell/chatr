import React, { useEffect, useState } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIStickers } from '@/hooks/useAIStickers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AIStickerPickerProps {
  onSelectSticker: (stickerUrl: string) => void;
  className?: string;
}

type StickerStyle = 'cartoon' | 'emoji' | 'anime' | 'chibi' | 'pixel' | 'sketch';

const STYLES: { value: StickerStyle; label: string }[] = [
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'emoji', label: 'Emoji' },
  { value: 'anime', label: 'Anime' },
  { value: 'chibi', label: 'Chibi' },
  { value: 'pixel', label: 'Pixel Art' },
  { value: 'sketch', label: 'Sketch' },
];

export const AIStickerPicker = ({
  onSelectSticker,
  className
}: AIStickerPickerProps) => {
  const { stickers, loading, generating, fetchStickers, generateSticker, deleteSticker } = useAIStickers();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StickerStyle>('cartoon');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchStickers();
    }
  }, [isOpen, fetchStickers]);

  const handleGenerate = async () => {
    if (!photoUrl) return;
    const sticker = await generateSticker(photoUrl, selectedStyle);
    if (sticker) {
      setPhotoUrl('');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for AI processing
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)}>
          <Sparkles className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Stickers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Generate New */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Create from Photo</h4>
            
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="sticker-photo-input"
              />
              <label
                htmlFor="sticker-photo-input"
                className="flex-1 cursor-pointer"
              >
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-accent/50 transition-colors">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-16 h-16 mx-auto rounded object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload Photo</span>
                    </>
                  )}
                </div>
              </label>
              
              <div className="space-y-2">
                <Select value={selectedStyle} onValueChange={(v) => setSelectedStyle(v as StickerStyle)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleGenerate}
                  disabled={!photoUrl || generating}
                  className="w-28"
                  size="sm"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Existing Stickers */}
          <div>
            <h4 className="font-medium text-sm mb-2">Your Stickers</h4>
            <ScrollArea className="h-48">
              {loading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse bg-muted rounded h-16 w-16" />
                  ))}
                </div>
              ) : stickers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No stickers yet. Create one above!
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {stickers.map(sticker => (
                    <div key={sticker.id} className="relative group">
                      <img
                        src={sticker.stickerUrl}
                        alt="Sticker"
                        className="w-16 h-16 object-contain cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => {
                          onSelectSticker(sticker.stickerUrl);
                          setIsOpen(false);
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSticker(sticker.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
