import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Download, Save, Upload, Image as ImageIcon } from 'lucide-react';

interface DesignElement {
  type: 'text' | 'image';
  placeholder?: string;
  value?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  background?: string;
  textAlign?: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  template_data: {
    background: string;
    elements: DesignElement[];
  };
  dimensions: { width: number; height: number };
}

interface DesignEditorProps {
  template: Template;
  onBack: () => void;
}

export const DesignEditor = ({ template, onBack }: DesignEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [designData, setDesignData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [designName, setDesignName] = useState(`My ${template.name}`);

  // Initialize placeholders
  useEffect(() => {
    const initialData: Record<string, string> = {};
    template.template_data.elements.forEach((el) => {
      if (el.placeholder) {
        initialData[el.placeholder] = el.value || '';
      }
    });
    setDesignData(initialData);
  }, [template]);

  // Render canvas
  useEffect(() => {
    renderCanvas();
  }, [designData, template]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = template.dimensions;
    const scale = Math.min(400 / width, 500 / height);
    
    canvas.width = width * scale;
    canvas.height = height * scale;

    ctx.scale(scale, scale);

    // Background
    const bg = template.template_data.background;
    if (bg.startsWith('linear-gradient')) {
      // Parse gradient
      const gradientMatch = bg.match(/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/);
      if (gradientMatch) {
        const angle = parseInt(gradientMatch[1]) || 135;
        const color1 = gradientMatch[2].trim().split(' ')[0];
        const color2 = gradientMatch[3].trim().split(' ')[0];
        
        const rad = (angle - 90) * Math.PI / 180;
        const x1 = width / 2 - Math.cos(rad) * width / 2;
        const y1 = height / 2 - Math.sin(rad) * height / 2;
        const x2 = width / 2 + Math.cos(rad) * width / 2;
        const y2 = height / 2 + Math.sin(rad) * height / 2;
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
      }
    } else {
      ctx.fillStyle = bg;
    }
    ctx.fillRect(0, 0, width, height);

    // Elements
    template.template_data.elements.forEach((el) => {
      if (el.type === 'text') {
        const text = el.placeholder ? (designData[el.placeholder] || el.placeholder.replace(/_/g, ' ').toUpperCase()) : (el.value || '');
        
        ctx.fillStyle = el.color || '#000000';
        ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize || 24}px Inter, system-ui, sans-serif`;
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'left';
        
        if (el.background) {
          const metrics = ctx.measureText(text);
          ctx.fillStyle = el.background;
          ctx.fillRect(el.x - 10, el.y - el.fontSize! * 0.8, metrics.width + 20, el.fontSize! * 1.2);
          ctx.fillStyle = el.color || '#ffffff';
        }
        
        ctx.fillText(text, el.x, el.y);
      } else if (el.type === 'image') {
        // Draw placeholder box for images
        ctx.strokeStyle = '#cccccc';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(el.x, el.y, el.width || 200, el.height || 200);
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#e5e5e5';
        ctx.fillRect(el.x, el.y, el.width || 200, el.height || 200);
        
        ctx.fillStyle = '#999999';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          el.placeholder?.replace(/_/g, ' ').toUpperCase() || 'IMAGE',
          el.x + (el.width || 200) / 2,
          el.y + (el.height || 200) / 2
        );
      }
    });
  };

  const handleInputChange = (placeholder: string, value: string) => {
    setDesignData(prev => ({ ...prev, [placeholder]: value }));
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create full-size export
    const exportCanvas = document.createElement('canvas');
    const { width, height } = template.dimensions;
    exportCanvas.width = width;
    exportCanvas.height = height;
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Re-render at full size
    const bg = template.template_data.background;
    if (bg.startsWith('linear-gradient')) {
      const gradientMatch = bg.match(/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/);
      if (gradientMatch) {
        const angle = parseInt(gradientMatch[1]) || 135;
        const color1 = gradientMatch[2].trim().split(' ')[0];
        const color2 = gradientMatch[3].trim().split(' ')[0];
        
        const rad = (angle - 90) * Math.PI / 180;
        const x1 = width / 2 - Math.cos(rad) * width / 2;
        const y1 = height / 2 - Math.sin(rad) * height / 2;
        const x2 = width / 2 + Math.cos(rad) * width / 2;
        const y2 = height / 2 + Math.sin(rad) * height / 2;
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
      }
    } else {
      ctx.fillStyle = bg;
    }
    ctx.fillRect(0, 0, width, height);

    template.template_data.elements.forEach((el) => {
      if (el.type === 'text') {
        const text = el.placeholder ? (designData[el.placeholder] || '') : (el.value || '');
        if (!text) return;
        
        ctx.fillStyle = el.color || '#000000';
        ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize || 24}px Inter, system-ui, sans-serif`;
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'left';
        
        if (el.background) {
          const metrics = ctx.measureText(text);
          ctx.fillStyle = el.background;
          ctx.fillRect(el.x - 10, el.y - el.fontSize! * 0.8, metrics.width + 20, el.fontSize! * 1.2);
          ctx.fillStyle = el.color || '#ffffff';
        }
        
        ctx.fillText(text, el.x, el.y);
      }
    });

    const link = document.createElement('a');
    link.download = `${designName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    
    toast.success('Design downloaded!');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('studio_user_designs' as any)
        .insert({
          user_id: user.id,
          template_id: template.id,
          name: designName,
          design_data: designData
        });

      if (error) throw error;
      toast.success('Design saved!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save design');
    } finally {
      setSaving(false);
    }
  };

  const textPlaceholders = template.template_data.elements
    .filter(el => el.type === 'text' && el.placeholder)
    .map(el => el.placeholder!);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <canvas 
              ref={canvasRef} 
              className="border rounded-lg shadow-lg max-w-full"
            />
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Design Name</Label>
              <Input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="My Design"
              />
            </div>

            {textPlaceholders.map((placeholder) => (
              <div key={placeholder}>
                <Label className="capitalize">{placeholder.replace(/_/g, ' ')}</Label>
                <Input
                  value={designData[placeholder] || ''}
                  onChange={(e) => handleInputChange(placeholder, e.target.value)}
                  placeholder={`Enter ${placeholder.replace(/_/g, ' ')}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
