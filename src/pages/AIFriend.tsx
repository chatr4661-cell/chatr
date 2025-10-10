import { useState, useEffect } from 'react';
import { VoiceInterface } from '@/components/voice/VoiceInterface';
import { MoodPicker } from '@/components/wellness/MoodPicker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Flame } from 'lucide-react';
import { useMoodTracking } from '@/hooks/useMoodTracking';
import { useStreakTracking } from '@/hooks/useStreakTracking';

const AIFriend = () => {
  const [currentMood, setCurrentMood] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [backgroundGradient, setBackgroundGradient] = useState('from-blue-50 to-purple-50');
  
  const { saveMood, loading: moodLoading } = useMoodTracking();
  const { streak } = useStreakTracking('ai_chat');

  useEffect(() => {
    updateBackground();
  }, [currentMood, isSpeaking]);

  const updateBackground = () => {
    const hour = new Date().getHours();
    let gradient = 'from-blue-50 to-purple-50';

    // Time-based backgrounds
    if (hour >= 5 && hour < 12) {
      gradient = 'from-orange-50 via-yellow-50 to-blue-50'; // Morning
    } else if (hour >= 12 && hour < 17) {
      gradient = 'from-blue-50 via-cyan-50 to-teal-50'; // Afternoon
    } else if (hour >= 17 && hour < 21) {
      gradient = 'from-purple-50 via-pink-50 to-orange-50'; // Evening
    } else {
      gradient = 'from-indigo-950 via-purple-900 to-blue-900'; // Night
    }

    // Mood overlays
    if (currentMood === 'great') {
      gradient = 'from-green-50 via-emerald-50 to-teal-50';
    } else if (currentMood === 'sad' || currentMood === 'low') {
      gradient = 'from-gray-100 via-slate-100 to-blue-100';
    }

    // Speaking animation
    if (isSpeaking) {
      gradient += ' animate-pulse';
    }

    setBackgroundGradient(gradient);
  };

  const handleSaveMood = async () => {
    if (!currentMood) return;

    const moodScores: Record<string, number> = {
      'great': 5,
      'good': 4,
      'okay': 3,
      'low': 2,
      'sad': 1
    };

    await saveMood(currentMood, moodScores[currentMood]);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient} transition-all duration-1000 p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Chatr AI Friend
            </h1>
          </div>
          {streak > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">{streak} day streak!</span>
            </div>
          )}
        </div>

        {/* Mood Picker */}
        <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm">
          <MoodPicker value={currentMood} onChange={setCurrentMood} />
          {currentMood && (
            <Button 
              onClick={handleSaveMood}
              disabled={moodLoading}
              className="w-full mt-4"
              variant="outline"
            >
              {moodLoading ? 'Saving...' : 'Save Mood'}
            </Button>
          )}
        </Card>

        {/* Conversation Area */}
        {transcript && (
          <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground mb-2">Chatr is saying:</p>
            <p className="text-lg">{transcript}</p>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Tap the voice button to start talking with Chatr</li>
            <li>• Share how you're feeling - Chatr remembers</li>
            <li>• Talk about anything on your mind</li>
            <li>• The background changes with your mood and time of day</li>
            <li>• Keep your streak alive by chatting daily</li>
          </ul>
        </Card>
      </div>

      {/* Voice Interface */}
      <VoiceInterface 
        onSpeakingChange={setIsSpeaking}
        onTranscriptUpdate={setTranscript}
      />
    </div>
  );
};

export default AIFriend;
