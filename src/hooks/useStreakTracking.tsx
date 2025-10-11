import * as React from 'react';

export const useStreakTracking = (streakType: string) => {
  const [streak, setStreak] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const loadStreak = () => {
      try {
        const streaks = JSON.parse(localStorage.getItem('streaks') || '{}');
        setStreak(streaks[streakType] || 0);
      } catch (error) {
        console.error('Streak load error:', error);
      }
    };
    loadStreak();
  }, [streakType]);

  const updateStreak = () => {
    try {
      const streaks = JSON.parse(localStorage.getItem('streaks') || '{}');
      const newStreak = (streaks[streakType] || 0) + 1;
      streaks[streakType] = newStreak;
      localStorage.setItem('streaks', JSON.stringify(streaks));
      setStreak(newStreak);
    } catch (error) {
      console.error('Streak update error:', error);
    }
  };

  return { streak, loading, updateStreak };
};
