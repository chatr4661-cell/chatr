import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Coins, Share2, Instagram, Twitter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface PostPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSuccess: () => void;
}

export default function PostPreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  onSuccess
}: PostPreviewDialogProps) {
  const [caption, setCaption] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (open && imageUrl) {
      analyzeContent();
    }
  }, [open, imageUrl]);

  const analyzeContent = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-fame-content', {
        body: { imageUrl, caption, category: 'general' }
      });

      if (error) throw error;
      setAnalysis(data);
      
      // Auto-populate suggested hashtags
      if (data.trendingHashtags?.length > 0) {
        setCaption(prev => prev + '\n\n' + data.trendingHashtags.join(' '));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("AI analysis unavailable");
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePost = async () => {
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, await fetch(imageUrl).then(r => r.blob()), {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Create fame cam post
      const { error: postError } = await supabase
        .from('fame_cam_posts')
        .insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: 'photo',
          caption,
          hashtags: analysis?.trendingHashtags || [],
          ai_virality_score: analysis?.viralityScore || 50,
          coins_earned: analysis?.estimatedCoins || 50,
          is_viral: analysis?.isLikelyViral || false
        });

      if (postError) throw postError;

      // Award coins
      const { data: currentPoints } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('user_points')
        .update({ 
          balance: (currentPoints?.balance || 0) + (analysis?.estimatedCoins || 50)
        })
        .eq('user_id', user.id);

      await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          amount: analysis?.estimatedCoins || 50,
          transaction_type: 'earn',
          source: 'fame_cam',
          description: `FameCam post reward`
        });

      // Show "Fame Spark" moment with custom component
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="text-lg font-bold">✨ Fame Spark Detected!</div>
          <div>You earned {analysis?.estimatedCoins || 50} FameCoins 🪙</div>
          {analysis?.isLikelyViral && <div className="text-xs text-green-400">This could go viral! 🔥</div>}
        </div>,
        { duration: 3000 }
      );

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Post error:', error);
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Post Your Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Image */}
          <div className="relative rounded-lg overflow-hidden bg-accent">
            <img src={imageUrl} alt="Preview" className="w-full h-auto" />
          </div>

          {/* AI Analysis */}
          {analyzing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analyzing virality...</span>
                <Sparkles className="w-4 h-4 animate-pulse text-primary" />
              </div>
              <Progress value={66} className="h-1" />
            </div>
          ) : analysis && (
            <div className="space-y-3 p-4 bg-accent/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Virality Score</span>
                </div>
                <Badge variant={analysis.viralityScore >= 80 ? "default" : "secondary"}>
                  {analysis.viralityScore}/100
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Earnings</span>
                <div className="flex items-center gap-1 font-semibold">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  {analysis.estimatedCoins} coins
                </div>
              </div>

              {analysis.suggestions?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">AI Suggestions:</span>
                  {analysis.suggestions.slice(0, 3).map((sug: any, idx: number) => (
                    <div key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{sug.tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Caption & Hashtags</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a catchy caption... ✨"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Post Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handlePost}
              disabled={posting || analyzing}
              className="flex-1"
            >
              {posting ? "Posting..." : "Post to Chatr Feed"}
            </Button>
            <Button variant="outline" size="icon" disabled>
              <Instagram className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" disabled>
              <Twitter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
