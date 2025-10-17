import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

/**
 * Native share functionality (like Twitter's share)
 */
export const useNativeShare = () => {
  const share = async (options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use native share sheet
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle,
        });
      } else {
        // Fallback to Web Share API
        if (navigator.share) {
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url,
          });
        } else {
          // Fallback to clipboard
          const shareText = `${options.title}\n${options.text}\n${options.url}`;
          await navigator.clipboard.writeText(shareText);
          toast.success('Copied to clipboard!');
        }
      }
    } catch (error) {
      if ((error as Error).message !== 'Share canceled') {
        console.error('Error sharing:', error);
        toast.error('Failed to share');
      }
    }
  };

  return { share };
};
