import { ArrowLeft, Camera, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function Capture() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Gesture Screenshot</h1>
        </div>
      </header>

      {/* Capture Area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
              <Hand className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Gesture Screenshot</h2>
              <p className="text-muted-foreground mb-6">
                Use hand gestures to capture screenshots
              </p>
            </div>

            <div className="space-y-3">
              <Button size="lg" className="w-full sm:w-auto">
                <Camera className="h-5 w-5 mr-2" />
                Start Gesture Detection
              </Button>
              <p className="text-sm text-muted-foreground">
                Camera access required for gesture recognition
              </p>
            </div>

            {/* Preview Area Placeholder */}
            <div className="mt-8 aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Camera preview will appear here</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
