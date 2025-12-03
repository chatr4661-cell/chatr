import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, Textbox, FabricImage, FabricObject } from 'fabric';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Square, Circle as CircleIcon, Type, Image as ImageIcon, 
  Trash2, Copy, Layers, ChevronUp, ChevronDown, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';

interface FabricCanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  onCanvasReady?: (canvas: FabricCanvas) => void;
  onSelectionChange?: (hasSelection: boolean, object?: FabricObject) => void;
}

export const FabricCanvasEditor = ({ 
  width, 
  height, 
  backgroundColor, 
  onCanvasReady,
  onSelectionChange 
}: FabricCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate scale to fit canvas in viewport
  const maxWidth = Math.min(600, window.innerWidth - 40);
  const scale = Math.min(maxWidth / width, 500 / height);
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width: displayWidth,
      height: displayHeight,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    // Set zoom to match scale
    fabricCanvas.setZoom(scale);

    fabricCanvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj || null);
      onSelectionChange?.(true, obj);
    });

    fabricCanvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj || null);
      onSelectionChange?.(true, obj);
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      onSelectionChange?.(false);
    });

    fabricCanvas.on('object:modified', () => {
      saveHistory(fabricCanvas);
    });

    setCanvas(fabricCanvas);
    onCanvasReady?.(fabricCanvas);
    saveHistory(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [width, height, scale]);

  useEffect(() => {
    if (canvas) {
      canvas.backgroundColor = backgroundColor;
      canvas.renderAll();
    }
  }, [backgroundColor, canvas]);

  const saveHistory = useCallback((c: FabricCanvas) => {
    const json = JSON.stringify(c.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = () => {
    if (!canvas || historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    canvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const redo = () => {
    if (!canvas || historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    canvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const addRectangle = () => {
    if (!canvas) return;
    const rect = new Rect({
      left: 50,
      top: 50,
      fill: '#3b82f6',
      width: 100,
      height: 100,
      strokeWidth: 0,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    saveHistory(canvas);
    toast.success('Rectangle added');
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new Circle({
      left: 50,
      top: 50,
      fill: '#10b981',
      radius: 50,
      strokeWidth: 0,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    saveHistory(canvas);
    toast.success('Circle added');
  };

  const addText = () => {
    if (!canvas) return;
    const text = new Textbox('Your Text Here', {
      left: 50,
      top: 50,
      fontSize: 24,
      fill: '#000000',
      fontFamily: 'Inter, system-ui, sans-serif',
      width: 200,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    saveHistory(canvas);
    toast.success('Text added');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl).then((img) => {
        // Scale image to fit canvas
        const maxSize = Math.min(width, height) * 0.5;
        const imgScale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
        img.scale(imgScale);
        img.set({ left: 50, top: 50 });
        canvas.add(img);
        canvas.setActiveObject(img);
        saveHistory(canvas);
        toast.success('Image added');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addImageFromUrl = (url: string) => {
    if (!canvas) return;
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const maxSize = Math.min(width, height) * 0.5;
      const imgScale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
      img.scale(imgScale);
      img.set({ left: 50, top: 50 });
      canvas.add(img);
      canvas.setActiveObject(img);
      saveHistory(canvas);
      toast.success('Image added from URL');
    }).catch(() => {
      toast.error('Failed to load image');
    });
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    saveHistory(canvas);
    toast.success('Deleted');
  };

  const duplicateSelected = () => {
    if (!canvas || !selectedObject) return;
    selectedObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (selectedObject.left || 0) + 20,
        top: (selectedObject.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      saveHistory(canvas);
      toast.success('Duplicated');
    });
  };

  const bringForward = () => {
    if (!canvas || !selectedObject) return;
    canvas.bringObjectForward(selectedObject);
    saveHistory(canvas);
  };

  const sendBackward = () => {
    if (!canvas || !selectedObject) return;
    canvas.sendObjectBackwards(selectedObject);
    saveHistory(canvas);
  };

  const handleZoom = (delta: number) => {
    if (!canvas) return;
    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);
    canvas.setZoom(scale * newZoom);
    canvas.setDimensions({
      width: displayWidth * newZoom,
      height: displayHeight * newZoom,
    });
  };

  const updateSelectedColor = (color: string) => {
    if (!canvas || !selectedObject) return;
    if ('fill' in selectedObject) {
      selectedObject.set('fill', color);
      canvas.renderAll();
      saveHistory(canvas);
    }
  };

  const updateTextStyle = (property: string, value: any) => {
    if (!canvas || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set(property as keyof Textbox, value);
    canvas.renderAll();
    saveHistory(canvas);
  };

  const exportCanvas = () => {
    if (!canvas) return null;
    // Create export at full resolution
    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width, height });
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    canvas.setZoom(currentZoom);
    canvas.setDimensions({ width: displayWidth * zoom, height: displayHeight * zoom });
    return dataUrl;
  };

  // Expose methods via ref or callback
  useEffect(() => {
    if (canvas && onCanvasReady) {
      (canvas as any).exportFullSize = exportCanvas;
      (canvas as any).addImageFromUrl = addImageFromUrl;
    }
  }, [canvas]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
        {/* Shape Tools */}
        <div className="flex gap-1 border-r pr-2">
          <Button variant="outline" size="icon" onClick={addRectangle} title="Add Rectangle">
            <Square className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={addCircle} title="Add Circle">
            <CircleIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={addText} title="Add Text">
            <Type className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="Add Image">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Edit Tools */}
        <div className="flex gap-1 border-r pr-2">
          <Button variant="outline" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Selection Tools */}
        {selectedObject && (
          <div className="flex gap-1 border-r pr-2">
            <Button variant="outline" size="icon" onClick={duplicateSelected} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={deleteSelected} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={bringForward} title="Bring Forward">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={sendBackward} title="Send Backward">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Color Picker */}
        {selectedObject && 'fill' in selectedObject && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <div 
                  className="w-4 h-4 rounded border" 
                  style={{ backgroundColor: (selectedObject.fill as string) || '#000' }}
                />
                Color
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <Label>Fill Color</Label>
                <div className="grid grid-cols-8 gap-1">
                  {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
                    '#ec4899', '#6b7280', '#1e293b', '#0f172a', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff'].map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => updateSelectedColor(color)}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={(selectedObject.fill as string) || '#000000'}
                  onChange={(e) => updateSelectedColor(e.target.value)}
                  className="h-8 w-full"
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Text Styling */}
        {selectedObject instanceof Textbox && (
          <div className="flex gap-1 border-r pr-2">
            <Button 
              variant={selectedObject.fontWeight === 'bold' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => updateTextStyle('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant={selectedObject.fontStyle === 'italic' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => updateTextStyle('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant={selectedObject.underline ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => updateTextStyle('underline', !selectedObject.underline)}
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button 
              variant={selectedObject.textAlign === 'left' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => updateTextStyle('textAlign', 'left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant={selectedObject.textAlign === 'center' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => updateTextStyle('textAlign', 'center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button 
              variant={selectedObject.textAlign === 'right' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => updateTextStyle('textAlign', 'right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex gap-1 items-center ml-auto">
          <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg overflow-auto bg-muted/20 p-4 flex justify-center">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
};
