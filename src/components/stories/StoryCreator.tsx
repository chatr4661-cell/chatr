import * as React from 'react';
import { Camera, X, Image as ImageIcon, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface StoryCreatorProps {
  userId: string;
  onClose: () => void;
}

export const StoryCreator = ({ userId, onClose }: StoryCreatorProps) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadStory = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Create story record
      const { error: insertError } = await supabase
        .from('stories')
        .insert([{
          user_id: userId,
          media_url: publicUrl,
          media_type: selectedFile.type.startsWith('image/') ? 'image' : 'video',
          caption: caption || null,
          privacy: 'contacts',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }]);

      if (insertError) throw insertError;

      toast.success('Story posted!');
      navigate('/');
    } catch (error: any) {
      console.error('Error uploading story:', error);
      toast.error(error.message || 'Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold">Create Story</h2>
        <Button
          onClick={uploadStory}
          disabled={!selectedFile || uploading}
          size="sm"
        >
          {uploading ? 'Posting...' : 'Post'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {!preview ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              className="w-48"
            >
              <Upload className="mr-2 h-5 w-5" />
              Choose File
            </Button>

            <p className="text-sm text-muted-foreground">
              Select an image or video to share
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative aspect-[9/16] max-h-[60vh] mx-auto bg-black rounded-lg overflow-hidden">
              {selectedFile?.type.startsWith('image/') ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={preview}
                  className="w-full h-full object-contain"
                  controls
                />
              )}
            </div>

            {/* Caption */}
            <Textarea
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="max-w-2xl mx-auto"
              rows={3}
            />

            {/* Change file */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  setCaption('');
                }}
              >
                Choose Different File
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};