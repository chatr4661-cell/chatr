import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIBackgroundGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
}

const PRESET_PROMPTS = [
  { label: 'Abstract Gradient', prompt: 'Abstract colorful gradient background, smooth flowing shapes, modern design, high resolution' },
  { label: 'Minimal Pattern', prompt: 'Minimalist geometric pattern background, subtle lines, clean modern design, soft colors' },
  { label: 'Nature Scene', prompt: 'Beautiful nature background, soft focus, serene landscape, professional photography' },
  { label: 'Tech/Digital', prompt: 'Futuristic digital technology background, circuit patterns, neon blue glow, modern' },
  { label: 'Business Pro', prompt: 'Professional corporate background, subtle texture, elegant design, neutral colors' },
  { label: 'Food/Restaurant', prompt: 'Warm restaurant ambiance background, wooden texture, cozy lighting, appetizing feel' },
  { label: 'Fashion/Lifestyle', prompt: 'Elegant fashion photography background, soft studio lighting, premium feel' },
  { label: 'Celebration', prompt: 'Festive celebration background, confetti, sparkles, party atmosphere, vibrant colors' },
];

export const AIBackgroundGenerator = ({ onImageGenerated }: AIBackgroundGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const generateImage = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-image-generator', {
        body: { prompt: finalPrompt + ', high quality, 4k, professional' }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImages(prev => [data.imageUrl, ...prev].slice(0, 6));
        toast.success('Background generated!');
      } else {
        throw new Error('No image returned');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        toast.error('Rate limit reached. Please try again in a moment.');
      } else if (error.message?.includes('402')) {
        toast.error('Credits needed. Please add credits to continue.');
      } else {
        toast.error('Failed to generate image. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Background Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label>Custom Prompt</Label>
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your ideal background..."
              onKeyDown={(e) => e.key === 'Enter' && generateImage()}
            />
            <Button onClick={() => generateImage()} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Preset Prompts */}
        <div className="space-y-2">
          <Label>Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_PROMPTS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => generateImage(preset.prompt)}
                disabled={generating}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="space-y-2">
            <Label>Generated Backgrounds</Label>
            <div className="grid grid-cols-3 gap-2">
              {generatedImages.map((url, index) => (
                <button
                  key={index}
                  onClick={() => onImageGenerated(url)}
                  className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                >
                  <img 
                    src={url} 
                    alt={`Generated ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Click an image to use as background
            </p>
          </div>
        )}

        {generating && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Generating your background...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
