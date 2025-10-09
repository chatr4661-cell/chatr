import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CallMediaCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  className?: string;
}

export function CallMediaCapture({ videoRef, className }: CallMediaCaptureProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const captureScreenshot = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-screenshot-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Screenshot saved",
          description: "Call screenshot has been saved to your downloads"
        });
      }, 'image/png');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast({
        title: "Capture failed",
        description: "Could not capture screenshot",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={captureScreenshot}
      className={cn(
        "text-white hover:bg-white/10 rounded-full w-12 h-12 p-0",
        className
      )}
      title="Take screenshot"
    >
      <Camera className="w-5 h-5" />
    </Button>
  );
}
