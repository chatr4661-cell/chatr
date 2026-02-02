import React, { memo, useMemo } from 'react';

// Get time-based gradient colors - computed once
const getTimeBasedStyle = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { gradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500', emoji: '🌅' };
  } else if (hour >= 12 && hour < 17) {
    return { gradient: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500', emoji: '☀️' };
  } else if (hour >= 17 && hour < 21) {
    return { gradient: 'bg-gradient-to-r from-orange-500 via-rose-500 to-purple-500', emoji: '🌆' };
  } else {
    return { gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600', emoji: '🌙' };
  }
};

interface PersonalizedSectionProps {
  userName?: string;
}

export const PersonalizedSection = memo<PersonalizedSectionProps>(({ userName }) => {
  const { gradient, emoji } = useMemo(getTimeBasedStyle, []);

  // Don't render if no user name
  if (!userName) return null;

  return (
    <div className="text-center">
      <h2 className="text-xl font-bold">
        <span className={`${gradient} bg-clip-text text-transparent`}>
          Hello {userName}
        </span>
        <span className="ml-1">{emoji}</span>
      </h2>
    </div>
  );
});

PersonalizedSection.displayName = 'PersonalizedSection';
