import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from 'next-themes';

export const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base mb-4 block">Theme</Label>
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
      </div>
    </div>
  );
};
