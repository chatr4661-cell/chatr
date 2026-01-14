import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { StoryCreator } from '@/components/stories/StoryCreator';
import { StoriesCarousel } from '@/components/stories/StoriesCarousel';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

const Stories = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const haptics = useNativeHaptics();
  const [user, setUser] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);

        const state = location.state as any;
        if (state?.createNew) {
          setShowCreator(true);
        } else if (state?.selectedStory) {
          loadStoriesAndShow(session.user.id, state.selectedStory);
        }
      }
    });
  }, [navigate, location.state]);

  const loadStoriesAndShow = async (userId: string, selectedStory: any) => {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles!stories_user_id_fkey(username, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const storiesData = data.map(story => {
        const profileData = Array.isArray(story.profile) ? story.profile[0] : story.profile;
        return {
          ...story,
          profile: profileData || { username: 'Unknown', avatar_url: null }
        };
      });
      setStories(storiesData);
      const index = storiesData.findIndex(s => s.id === selectedStory.id);
      setCurrentIndex(index >= 0 ? index : 0);
      setShowViewer(true);
    }
  };

  const handleNext = () => {
    haptics.light();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowViewer(false);
      navigate('/');
    }
  };

  const handlePrevious = () => {
    haptics.light();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (showCreator && user) {
    return <StoryCreator userId={user.id} onClose={() => navigate('/')} />;
  }

  if (showViewer && stories.length > 0 && user) {
    return (
      <StoryViewer
        stories={stories}
        currentIndex={currentIndex}
        userId={user.id}
        onClose={() => navigate('/')}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-pb">
      {/* Apple-style Header */}
      <AppleHeader
        title="Stories"
        onBack={() => {
          haptics.light();
          navigate('/');
        }}
        glass
      />

      {/* Stories Carousel */}
      <div className="max-w-2xl mx-auto">
        {user && <StoriesCarousel userId={user.id} />}
      </div>
    </div>
  );
};

export default Stories;
