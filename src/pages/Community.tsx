import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Heart, Calendar, Target, MessageCircle, Award, Video, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocationStatus } from '@/hooks/useLocationStatus';

export default function Community() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>();
  const { status: locationStatus } = useLocationStatus(userId);
  const [activeTab, setActiveTab] = useState('communities');

  // States for different sections
  const [communities, setCommunities] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    loadCommunityData();
    subscribeToUpdates();
  }, [locationStatus.city]);

  const loadCommunityData = async () => {
    setLoading(true);
    await Promise.all([
      loadCommunities(),
      loadStories(),
      loadPrograms(),
      loadCircles(),
      loadSessions(),
      loadChallenges(),
      loadLeaderboard()
    ]);
    setLoading(false);
  };

  const loadCommunities = async () => {
    try {
      let query = supabase
        .from('wellness_communities' as any)
        .select('*')
        .eq('is_active', true)
        .order('members_count', { ascending: false })
        .limit(6);

      if (locationStatus.city) {
        query = query.or(`city.eq.${locationStatus.city},city.is.null`);
      }

      const { data } = await query;
      setCommunities(data || []);
    } catch (error) {
      console.error('Error loading communities:', error);
    }
  };

  const loadStories = async () => {
    try {
      const { data } = await supabase
        .from('wellness_stories' as any)
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('is_public', true)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      setStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const loadPrograms = async () => {
    try {
      let query = supabase
        .from('wellness_programs' as any)
        .select('*')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      if (locationStatus.city) {
        query = query.or(`city.eq.${locationStatus.city},event_type.eq.online`);
      }

      const { data } = await query;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadCircles = async () => {
    try {
      const { data } = await supabase
        .from('wellness_circles' as any)
        .select('*')
        .eq('is_private', false)
        .order('members_count', { ascending: false })
        .limit(8);

      setCircles(data || []);
    } catch (error) {
      console.error('Error loading circles:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await supabase
        .from('expert_sessions' as any)
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('session_datetime', { ascending: true })
        .limit(4);

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadChallenges = async () => {
    try {
      const { data } = await supabase
        .from('health_challenges' as any)
        .select('*')
        .eq('is_active', true)
        .order('participant_count', { ascending: false })
        .limit(6);

      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await supabase
        .from('user_stats' as any)
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .order('total_points', { ascending: false })
        .limit(10);

      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('community-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wellness_stories' },
        () => loadStories()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_stats' },
        () => loadLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!userId) {
      toast({ title: 'Please login to join communities', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('community_members' as any)
      .insert({ community_id: communityId, user_id: userId });

    if (error) {
      toast({ title: 'Error joining community', variant: 'destructive' });
    } else {
      toast({ title: 'Successfully joined community!' });
      loadCommunities();
    }
  };

  const handleLikeStory = async (storyId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('story_likes' as any)
      .insert({ story_id: storyId, user_id: userId });

    if (!error) {
      loadStories();
    }
  };

  const handleJoinCircle = async (circleId: string) => {
    if (!userId) {
      toast({ title: 'Please login to join circles', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('circle_members' as any)
      .insert({ circle_id: circleId, user_id: userId });

    if (error) {
      toast({ title: 'Error joining circle', variant: 'destructive' });
    } else {
      toast({ title: 'Successfully joined circle!' });
      loadCircles();
    }
  };

  const handleRegisterSession = async (sessionId: string) => {
    if (!userId) {
      toast({ title: 'Please login to register', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('session_participants' as any)
      .insert({ session_id: sessionId, user_id: userId });

    if (error) {
      toast({ title: 'Error registering for session', variant: 'destructive' });
    } else {
      toast({ title: 'Successfully registered!' });
      loadSessions();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Wellness Community</h1>
            {locationStatus.city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Join your local wellness community in {locationStatus.city}
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="communities">Groups</TabsTrigger>
          <TabsTrigger value="stories">Stories</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="sessions">Live</TabsTrigger>
        </TabsList>

        {/* Communities Tab */}
        <TabsContent value="communities" className="space-y-6">
          {/* Communities Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Join wellness groups & discussions
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {communities.map((community) => (
                <Card key={community.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {community.image_url && (
                      <img 
                        src={community.image_url} 
                        alt={community.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{community.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {community.category}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {community.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {community.members_count} members
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleJoinCommunity(community.id)}
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Wellness Circles */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Join small support groups
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {circles.map((circle) => (
                <Card key={circle.id} className="p-3">
                  <h3 className="font-medium text-sm">{circle.name}</h3>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {circle.category}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {circle.members_count} members
                  </p>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    variant="outline"
                    onClick={() => handleJoinCircle(circle.id)}
                  >
                    Join Circle
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Youth Programs */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Health programs & activities
            </h2>
            {programs.map((program) => (
              <Card key={program.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{program.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {program.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {program.event_type === 'online' ? 'Online' : program.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(program.event_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button size="sm">Register</Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories" className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Share your wellness journey</h2>
            <Button size="sm" onClick={() => navigate('/create-story')}>
              <Plus className="h-4 w-4 mr-1" />
              Post Story
            </Button>
          </div>
          {stories.map((story: any) => (
            <Card key={story.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={story.profiles?.avatar_url} />
                  <AvatarFallback>{story.profiles?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{story.profiles?.username}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {story.content}
                  </p>
                  {story.image_url && (
                    <img
                      src={story.image_url}
                      alt="Story"
                      className="mt-3 rounded-lg max-h-64 object-cover"
                    />
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikeStory(story.id)}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      {story.likes_count}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {story.comments_count}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-3">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Compete and earn rewards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="p-4">
                <h3 className="font-semibold">{challenge.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {challenge.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-muted-foreground">
                    <span>{challenge.participant_count} participants</span>
                  </div>
                  <Badge variant="secondary">
                    {challenge.reward_points} points
                  </Badge>
                </div>
                <Button className="w-full mt-3">Join Challenge</Button>
              </Card>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top wellness champions this month
            </h2>
            {leaderboard.slice(0, 3).map((user: any, index) => (
              <Card key={user.user_id} className="p-4 mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-primary">
                    #{index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src={user.profiles?.avatar_url} />
                    <AvatarFallback>{user.profiles?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{user.profiles?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.challenges_completed} challenges completed
                    </p>
                  </div>
                  <Badge>{user.total_points} pts</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Live Sessions Tab */}
        <TabsContent value="sessions" className="space-y-3">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Learn from verified health professionals
          </h2>
          {sessions.map((session) => (
            <Card key={session.id} className="p-4">
              <div className="flex items-start gap-3">
                {session.expert_avatar_url && (
                  <Avatar>
                    <AvatarImage src={session.expert_avatar_url} />
                    <AvatarFallback>{session.expert_name[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{session.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.expert_name} • {session.expert_role}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={session.status === 'live' ? 'destructive' : 'secondary'}>
                      {session.status === 'live' ? '🔴 Live Now' : 'Upcoming'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.session_datetime).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    className="w-full mt-3"
                    onClick={() => handleRegisterSession(session.id)}
                  >
                    {session.status === 'live' ? 'Join Live' : 'Register'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
