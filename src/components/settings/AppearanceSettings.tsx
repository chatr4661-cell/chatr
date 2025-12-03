import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';

const FONT_SIZE_KEY = 'chatr-font-size';

export const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved) {
      const size = parseInt(saved, 10);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}%`;
    }
  }, []);

  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setFontSize(size);
    localStorage.setItem(FONT_SIZE_KEY, size.toString());
    document.documentElement.style.fontSize = `${size}%`;
  };

  const getFontSizeLabel = (size: number) => {
    if (size <= 85) return 'Small';
    if (size <= 100) return 'Default';
    if (size <= 115) return 'Large';
    return 'Extra Large';
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card className="p-4">
        <Label className="text-base mb-4 block font-semibold">Theme</Label>
        <RadioGroup value={theme} onValueChange={setTheme}>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="cursor-pointer">Light</Label>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="cursor-pointer">System</Label>
          </div>
        </RadioGroup>
      </Card>

      {/* Font Size Accessibility */}
      <Card className="p-4">
        <Label className="text-base mb-2 block font-semibold">Text Size</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Adjust text size for better readability
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">A</span>
            <span className="text-sm font-medium">{getFontSizeLabel(fontSize)}</span>
            <span className="text-lg text-muted-foreground">A</span>
          </div>
          
          <Slider
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={85}
            max={130}
            step={5}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>85%</span>
            <span>100%</span>
            <span>115%</span>
            <span>130%</span>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm">Preview: This is how text will appear throughout the app.</p>
        </div>
      </Card>
    </div>
  );
};
