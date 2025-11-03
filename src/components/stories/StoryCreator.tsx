import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Image as ImageIcon, Send, Camera as CameraIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, CameraResultType } from '@capacitor/camera';

interface StoryCreatorProps {
  userId: string;
  onClose: () => void;
}

export const StoryCreator = ({ userId, onClose }: StoryCreatorProps) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'text'>('text');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [textStory, setTextStory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapturePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl
      });
      
      if (image.dataUrl) {
        setMediaUrl(image.dataUrl);
        setMediaType('image');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result as string);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!mediaUrl && !textStory.trim()) {
      toast.error('Please add content to your story');
      return;
    }

    setUploading(true);

    try {
      let uploadedUrl = null;
      let storyType: 'image' | 'video' | 'text' = 'text';

      if (mediaUrl) {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        
        const fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        uploadedUrl = publicUrl;
        storyType = mediaType;
      }

      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          media_url: uploadedUrl,
          media_type: storyType,
          caption: caption.trim() || textStory.trim(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (storyError) throw storyError;

      toast.success('Story posted! 🎉');
      onClose();
    } catch (error: any) {
      console.error('Story upload error:', error);
      toast.error('Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex items-center justify-between bg-black/50 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
          <X className="h-6 w-6" />
        </Button>
        <h2 className="text-white font-semibold">Create Story</h2>
        <Button
          onClick={handlePost}
          disabled={uploading || (!mediaUrl && !textStory.trim())}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          {uploading ? 'Posting...' : 'Post'}
          <Send className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {mediaUrl ? (
          <div className="relative w-full h-full max-w-lg">
            {mediaType === 'video' ? (
              <video src={mediaUrl} className="w-full h-full object-contain rounded-lg" controls />
            ) : (
              <img src={mediaUrl} alt="Story" className="w-full h-full object-contain rounded-lg" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMediaUrl(null)}
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <Textarea
              value={textStory}
              onChange={(e) => setTextStory(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[300px] text-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
              maxLength={500}
            />
            <p className="text-white/50 text-sm mt-2 text-right">{textStory.length}/500</p>
          </div>
        )}
      </div>

      {!mediaUrl && (
        <div className="p-6 flex gap-4 justify-center bg-black/50 backdrop-blur-sm">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <Button onClick={handleCapturePhoto} variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
            <CameraIcon className="h-5 w-5" />
            Camera
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
            <ImageIcon className="h-5 w-5" />
            Gallery
          </Button>
        </div>
      )}

      {mediaUrl && (
        <div className="p-4 bg-black/50 backdrop-blur-sm">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
            rows={2}
            maxLength={200}
          />
        </div>
      )}
    </div>
  );
};
