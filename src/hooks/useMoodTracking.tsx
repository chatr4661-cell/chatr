import { useState } from 'react';
import { toast } from 'sonner';

export const useMoodTracking = () => {
  const [loading, setLoading] = useState(false);

  const saveMood = async (mood: string, moodScore: number) => {
    setLoading(true);
    try {
      // Store in localStorage for now until types regenerate
      const moods = JSON.parse(localStorage.getItem('mood_entries') || '[]');
      moods.push({
        mood,
        mood_score: moodScore,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('mood_entries', JSON.stringify(moods));
      
      toast.success('Mood saved!');
      return true;
    } catch (error) {
      console.error('Mood save error:', error);
      toast.error('Failed to save mood');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { saveMood, loading };
};
