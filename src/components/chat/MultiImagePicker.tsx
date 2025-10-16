import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MultiImagePickerProps {
  onImagesSelected: (files: File[]) => void;
  maxImages?: number;
}

export const MultiImagePicker = ({ onImagesSelected, maxImages = 5 }: MultiImagePickerProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > maxImages) {
      toast.error(`You can only select up to ${maxImages} images`);
      return;
    }

    const newFiles = [...selectedFiles, ...files].slice(0, maxImages);
    setSelectedFiles(newFiles);

    // Generate previews
    const newPreviews: string[] = [];
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newFiles.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });

    onImagesSelected(newFiles);
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onImagesSelected(newFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setPreviews([]);
    onImagesSelected([]);
  };

  return (
    <div className="space-y-2">
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img 
                src={preview} 
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 object-cover rounded-lg border border-border"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('multi-image-input')?.click()}
          disabled={selectedFiles.length >= maxImages}
        >
          <Upload className="h-4 w-4 mr-2" />
          {selectedFiles.length > 0 ? `Add More (${selectedFiles.length}/${maxImages})` : 'Select Images'}
        </Button>
        
        {selectedFiles.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
          >
            Clear All
          </Button>
        )}
      </div>

      <input
        id="multi-image-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};
