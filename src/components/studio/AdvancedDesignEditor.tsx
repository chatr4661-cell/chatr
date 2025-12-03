import { useState, useRef, useCallback } from 'react';
import { Canvas as FabricCanvas, Textbox, FabricImage } from 'fabric';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Download, Save, Palette, Image as ImageIcon, Sparkles, Layers } from 'lucide-react';
import { FabricCanvasEditor } from './FabricCanvas';
import { AIBackgroundGenerator } from './AIBackgroundGenerator';

interface Template {
  id: string;
  name: string;
  category: string;
  template_data: {
    background: string;
    elements: any[];
  };
  dimensions: { width: number; height: number };
}

interface AdvancedDesignEditorProps {
  template: Template;
  onBack: () => void;
}

const BACKGROUND_COLORS = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
  '#1e293b', '#0f172a', '#000000', '#1a1a2e',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
];

export const AdvancedDesignEditor = ({ template, onBack }: AdvancedDesignEditorProps) => {
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(template.template_data.background);
  const [designName, setDesignName] = useState(`My ${template.name}`);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleCanvasReady = useCallback((fabricCanvas: FabricCanvas) => {
    setCanvas(fabricCanvas);
    
    // Load template elements
    template.template_data.elements.forEach((el) => {
      if (el.type === 'text') {
        const text = new Textbox(el.value || el.placeholder?.replace(/_/g, ' ').toUpperCase() || 'Text', {
          left: el.x,
          top: el.y,
          fontSize: el.fontSize || 24,
          fontWeight: el.fontWeight || 'normal',
          fill: el.color || '#000000',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: el.textAlign || 'left',
          width: 300,
        });
        fabricCanvas.add(text);
      }
    });
    fabricCanvas.renderAll();
  }, [template]);

  const handleBackgroundChange = (bg: string) => {
    setBackgroundColor(bg);
    if (canvas) {
      if (bg.startsWith('linear-gradient')) {
        // For gradients, we need to create an image or use solid fallback
        const gradientMatch = bg.match(/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/);
        if (gradientMatch) {
          const color1 = gradientMatch[2].trim().split(' ')[0];
          canvas.backgroundColor = color1; // Fallback to first color
        }
      } else {
        canvas.backgroundColor = bg;
      }
      canvas.renderAll();
    }
  };

  const handleAIImageGenerated = (imageUrl: string) => {
    if (!canvas) return;
    
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const { width, height } = template.dimensions;
      img.scaleToWidth(width);
      img.scaleToHeight(height);
      img.set({ left: 0, top: 0, selectable: false, evented: false });
      
      // Add as background (send to back)
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      toast.success('AI background applied!');
    }).catch(() => {
      toast.error('Failed to apply background');
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl).then((img) => {
        const { width, height } = template.dimensions;
        const maxSize = Math.min(width, height) * 0.5;
        const imgScale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
        img.scale(imgScale);
        img.set({ left: 50, top: 50 });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        toast.success('Image added');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (!canvas) return;

    const { width, height } = template.dimensions;
    const currentZoom = canvas.getZoom();
    
    // Export at full resolution
    canvas.setZoom(1);
    canvas.setDimensions({ width, height });
    
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    
    // Restore canvas
    canvas.setZoom(currentZoom);
    
    const link = document.createElement('a');
    link.download = `${designName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success('Design exported!');
  };

  const handleSave = async () => {
    if (!canvas) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const canvasJson = canvas.toJSON();

      const { error } = await supabase
        .from('studio_user_designs' as any)
        .insert({
          user_id: user.id,
          template_id: template.id,
          name: designName,
          design_data: canvasJson
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
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

      {/* Design Name */}
      <div className="flex gap-2 items-center">
        <Label className="shrink-0">Name:</Label>
        <Input
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-4">
        {/* Canvas Area */}
        <Card>
          <CardContent className="pt-4">
            <FabricCanvasEditor
              width={template.dimensions.width}
              height={template.dimensions.height}
              backgroundColor={backgroundColor.startsWith('linear') ? '#ffffff' : backgroundColor}
              onCanvasReady={handleCanvasReady}
            />
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="canvas" className="gap-1 text-xs">
                <Layers className="h-3 w-3" />
                Canvas
              </TabsTrigger>
              <TabsTrigger value="background" className="gap-1 text-xs">
                <Palette className="h-3 w-3" />
                Background
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="canvas" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add Elements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Upload Product Image
                  </Button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toolbar above the canvas to add shapes, text, and more.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Click objects to select and edit</li>
                    <li>• Drag corners to resize</li>
                    <li>• Use toolbar for formatting</li>
                    <li>• Double-click text to edit</li>
                    <li>• Ctrl+Z to undo changes</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="background" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Solid Colors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-8 gap-1">
                    {BACKGROUND_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-7 h-7 rounded border-2 transition-transform hover:scale-110 ${
                          backgroundColor === color ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleBackgroundChange(color)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Gradients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADIENT_PRESETS.map((gradient, i) => (
                      <button
                        key={i}
                        className={`w-full aspect-square rounded border-2 transition-transform hover:scale-105 ${
                          backgroundColor === gradient ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                        }`}
                        style={{ background: gradient }}
                        onClick={() => handleBackgroundChange(gradient)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Custom Color</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="color"
                    value={backgroundColor.startsWith('#') ? backgroundColor : '#ffffff'}
                    onChange={(e) => handleBackgroundChange(e.target.value)}
                    className="w-full h-10"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <ScrollArea className="h-[500px]">
                <AIBackgroundGenerator onImageGenerated={handleAIImageGenerated} />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
