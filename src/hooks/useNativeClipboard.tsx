import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { toast } from 'sonner';

/**
 * Native clipboard access (like Twitter's copy functionality)
 */
export const useNativeClipboard = () => {
  const copy = async (text: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({
          string: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast.success('Copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy');
    }
  };

  const paste = async (): Promise<string> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { value } = await Clipboard.read();
        return value;
      } else {
        return await navigator.clipboard.readText();
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  };

  return { copy, paste };
};
