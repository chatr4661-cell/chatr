import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Hand, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useGestureDetection } from '@/hooks/useGestureDetection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Screenshot {
  id: string;
  url: string;
  created_at: string;
}

export default function Capture() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [capturing, setCapturing] = useState(false);

  const handleGestureDetected = async (gesture: string) => {
    if (gesture === 'Open_Palm') {
      await captureScreenshot();
    }
  };

  const { isReady, error, detectGesture } = useGestureDetection(handleGestureDetected);

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.storage
        .from('screenshots')
        .list(`${user.user.id}/`, {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      const screenshotUrls = data.map(file => ({
        id: file.id,
        url: supabase.storage.from('screenshots').getPublicUrl(`${user.user.id}/${file.name}`).data.publicUrl,
        created_at: file.created_at
      }));

      setScreenshots(screenshotUrls);
    } catch (err) {
      console.error('Failed to load screenshots:', err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const captureScreenshot = async () => {
    if (!videoRef.current || !canvasRef.current || capturing) return;

    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileName = `screenshot-${Date.now()}.jpg`;
      const filePath = `${user.user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('screenshots')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      toast.success('Screenshot captured!');
      await loadScreenshots();
    } catch (err) {
      console.error('Capture error:', err);
      toast.error('Failed to capture screenshot');
    } finally {
      setCapturing(false);
    }
  };

  useEffect(() => {
    if (!isStreaming || !videoRef.current || !isReady) return;

    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        detectGesture(videoRef.current);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, isReady, detectGesture]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Gesture Screenshot</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Hand className="h-5 w-5 text-primary" />
              <CardTitle>Camera Preview</CardTitle>
            </div>
            <CardDescription>
              {isReady ? 'Show an open palm (✋) to capture' : 'Loading gesture detection...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {capturing && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              {!isStreaming ? (
                <Button onClick={startCamera} disabled={!isReady}>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button onClick={stopCamera} variant="destructive">
                    Stop Camera
                  </Button>
                  <Button onClick={captureScreenshot} disabled={capturing}>
                    {capturing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    Manual Capture
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {screenshots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Captured Screenshots ({screenshots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {screenshots.map((screenshot) => (
                  <div key={screenshot.id} className="relative group">
                    <img
                      src={screenshot.url}
                      alt="Screenshot"
                      className="w-full aspect-video object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(screenshot.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
