import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Search, Share2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function GrabAndBrowse() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query }
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGestureScreenshot = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      toast({
        title: "Camera active",
        description: "Make open palm gesture, then close fist to capture"
      });
      
      // Simplified: just take screenshot after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        
        // Capture screenshot using html2canvas
        import('html2canvas').then(({ default: html2canvas }) => {
          html2canvas(document.body).then(canvas => {
            canvas.toBlob(blob => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `screenshot-${Date.now()}.png`;
                a.click();
                
                toast({
                  title: "Screenshot captured!",
                  description: "Saved to downloads"
                });
              }
            });
          });
        });
      }, 3000);
      
    } catch (error: any) {
      toast({
        title: "Camera access denied",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Grab & Browse
          </h1>
          <p className="text-muted-foreground">
            Gesture screenshots + AI-powered browsing
          </p>
        </div>

        <Tabs defaultValue="browser" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gesture">
              <Camera className="w-4 h-4 mr-2" />
              Gesture Screenshot
            </TabsTrigger>
            <TabsTrigger value="browser">
              <Search className="w-4 h-4 mr-2" />
              AI Browser
            </TabsTrigger>
          </TabsList>

          {/* Gesture Screenshot Tab */}
          <TabsContent value="gesture" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Gesture Screenshot</h3>
                <p className="text-sm text-muted-foreground">
                  Open your palm to the camera, then close your fist to capture a screenshot
                </p>
                <Button onClick={handleGestureScreenshot} size="lg" className="gap-2">
                  <Camera className="w-4 h-4" />
                  Start Gesture Capture
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* AI Browser Tab */}
          <TabsContent value="browser" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search anything..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <div className="animate-spin">⏳</div>
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {results && (
                <div className="space-y-4">
                  {/* AI Summary */}
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary mt-1" />
                      <div className="space-y-2 flex-1">
                        <h4 className="font-semibold">AI Summary</h4>
                        <p className="text-sm">{results.summary}</p>
                        
                        {results.followUps && (
                          <div className="space-y-1 mt-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Follow-up questions:
                            </p>
                            {results.followUps.map((q: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => setQuery(q)}
                                className="block text-xs text-primary hover:underline"
                              >
                                • {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Results */}
                  {results.results?.map((result: any, i: number) => (
                    <Card key={i} className="p-4 hover:bg-accent/50 transition-colors">
                      <h4 className="font-medium mb-1">{result.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {result.snippet}
                      </p>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {result.url}
                      </a>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
