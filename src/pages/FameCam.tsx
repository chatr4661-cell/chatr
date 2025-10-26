import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FameCamViewfinder from "@/components/famecam/FameCamViewfinder";
import AIGuidanceOverlay from "@/components/famecam/AIGuidanceOverlay";
import ChallengeRadar from "@/components/famecam/ChallengeRadar";
import FameMeter from "@/components/famecam/FameMeter";
import CoinsTracker from "@/components/famecam/CoinsTracker";
import PostPreviewDialog from "@/components/famecam/PostPreviewDialog";
import { capturePhoto } from "@/utils/mediaUtils";

export default function FameCam() {
  const navigate = useNavigate();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [aiGuidance, setAiGuidance] = useState<any>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [currentCategory, setCurrentCategory] = useState("Dance");
  const [fameScore, setFameScore] = useState(50);
  const [showSparkAnimation, setShowSparkAnimation] = useState(false);

  useEffect(() => {
    fetchUserCoins();
    fetchAIGuidance();
    
    // Simulate dynamic fame score fluctuation
    const scoreInterval = setInterval(() => {
      setFameScore(prev => {
        const change = Math.random() * 10 - 5;
        const newScore = Math.max(30, Math.min(95, prev + change));
        return newScore;
      });
    }, 2000);

    return () => clearInterval(scoreInterval);
  }, []);

  const fetchUserCoins = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (data) setUserCoins(data.balance);
    }
  };

  const fetchAIGuidance = async () => {
    // Simulate AI guidance for now
    setAiGuidance({
      category: "Dance",
      tips: [
        "Natural lighting works best",
        "Hold camera at eye level",
        "Try a slight tilt to the left"
      ],
      trendingNow: true
    });
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    setShowSparkAnimation(true);
    
    try {
      const imageData = await capturePhoto();
      if (imageData) {
        setCapturedImage(imageData);
        
        // Show "Fame Spark" animation
        setTimeout(() => {
          setShowPreview(true);
          setShowSparkAnimation(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Capture error:', error);
      toast.error("Failed to capture photo");
      setShowSparkAnimation(false);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category);
    // Fetch new AI guidance for this category
    fetchAIGuidance();
  };

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6" />
            FameCam
          </h1>
          <CoinsTracker coins={userCoins} />
        </div>
      </div>

      {/* Main Camera View */}
      <div className="flex-1 relative">
        <FameCamViewfinder />
        
        {/* AI Overlay */}
        {aiGuidance && (
          <AIGuidanceOverlay 
            guidance={aiGuidance}
            currentCategory={currentCategory}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {/* Challenge Radar (top right) */}
        <div className="absolute top-20 right-4 z-10">
          <ChallengeRadar />
        </div>

        {/* Fame Meter (left side) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <FameMeter score={fameScore} />
        </div>

        {/* Fame Spark Animation */}
        {showSparkAnimation && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-30 animate-fade-in">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">✨</div>
              <div className="text-2xl font-bold text-white drop-shadow-lg animate-pulse">
                Fame Spark Detected!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Capture Button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="w-20 h-20 rounded-full bg-white border-4 border-primary shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
            <Camera className="w-8 h-8 text-primary" />
          </div>
        </button>
      </div>

      {/* Post Preview Dialog */}
      {capturedImage && (
        <PostPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          imageUrl={capturedImage}
          onSuccess={() => {
            fetchUserCoins();
            setCapturedImage(null);
          }}
        />
      )}
    </div>
  );
}
