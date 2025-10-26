import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetectedObject {
  type: string;
  confidence: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  brand?: {
    brand_id: string;
    brand_name: string;
    placement_id: string;
    replacement_asset_url: string;
    replacement_type: string;
  };
}

export const useVideoBranding = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionId = useRef(crypto.randomUUID());

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, [videoRef]);

  const detectObjects = useCallback(async () => {
    if (isDetecting) return;

    const frameData = captureFrame();
    if (!frameData) return;

    setIsDetecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('detect-video-objects', {
        body: { imageData: frameData, sessionId: sessionId.current }
      });

      if (error) throw error;

      if (data?.objects && data.objects.length > 0) {
        setDetectedObjects(data.objects);
      }
    } catch (error) {
      console.error('Object detection error:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [captureFrame, isDetecting]);

  const trackInteraction = useCallback(async (brandId: string, placementId: string, objectType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.rpc('track_brand_impression', {
        p_brand_id: brandId,
        p_placement_id: placementId,
        p_user_id: user?.id || null,
        p_impression_type: 'interaction',
        p_detected_object: objectType,
        p_duration: 0
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, []);

  // Initialize canvas
  if (!canvasRef.current) {
    canvasRef.current = document.createElement('canvas');
  }

  return {
    detectedObjects,
    detectObjects,
    trackInteraction,
    isDetecting
  };
};
