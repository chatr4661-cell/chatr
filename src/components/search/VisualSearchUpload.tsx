import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export const VisualSearchUpload = ({ onSearchComplete }: { onSearchComplete: (results: any) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        setPreview(base64);

        // Upload to storage (optional - for permanent storage)
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `visual-searches/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        }

        const imageUrl = uploadData
          ? supabase.storage.from('chat-media').getPublicUrl(filePath).data.publicUrl
          : null;

        // Call visual search function
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase.functions.invoke('visual-search', {
          body: {
            imageUrl,
            imageBase64: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
            userId: user?.id
          }
        });

        if (error) throw error;

        toast.success('Image analyzed successfully!');
        onSearchComplete(data);
      };

      reader.onerror = () => {
        toast.error('Failed to read image');
        setUploading(false);
      };

    } catch (error) {
      console.error('Visual search error:', error);
      toast.error('Failed to analyze image');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      handleFileUpload(file);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-2 border-dashed">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : preview ? (
            <img src={preview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-primary" />
          )}
        </div>

        <h3 className="font-semibold mb-2">Visual Search</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a photo to find similar services or products
        </p>

        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => document.getElementById('visual-search-file')?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </Button>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => document.getElementById('visual-search-camera')?.click()}
            className="gap-2"
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </Button>
        </div>

        <input
          id="visual-search-file"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          id="visual-search-camera"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {uploading && (
          <p className="text-xs text-muted-foreground mt-4">
            Analyzing image with AI...
          </p>
        )}
      </div>
    </Card>
  );
};
