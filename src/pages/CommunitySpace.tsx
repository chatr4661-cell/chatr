import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Flame, 
  Trophy, 
  Heart,
  Target,
  Video,
  TrendingUp,
  Award,
  Calendar
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

export default function CommunitySpace() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Communities',
      description: 'Join wellness groups & discussions',
      route: '/communities',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      icon: Flame,
      title: 'Stories',
      description: 'Share your wellness journey',
      route: '/stories',
      color: 'from-pink-500 to-red-600'
    },
    {
      icon: Trophy,
      title: 'Youth Engagement',
      description: 'Health programs & activities',
      route: '/youth',
      color: 'from-yellow-500 to-orange-600'
    },
    {
      icon: Heart,
      title: 'Youth Feed',
      description: 'Connect with wellness community',
      route: '/youth-feed',
      color: 'from-violet-500 to-purple-600'
    }
  ];

  const challenges = [
    {
      name: '10K Steps Challenge',
      participants: 1234,
      reward: 100,
      ends: '3 days',
      icon: Target
    },
    {
      name: 'Hydration Week',
      participants: 856,
      reward: 50,
      ends: '5 days',
      icon: Heart
    },
    {
      name: 'Sleep Quality',
      participants: 632,
      reward: 75,
      ends: '1 week',
      icon: TrendingUp
    }
  ];

  const wellnessCircles = [
    { name: 'Diabetes Support', members: 342, category: 'Health Condition' },
    { name: 'Mental Wellness', members: 567, category: 'Mental Health' },
    { name: 'Fitness Club', members: 789, category: 'Fitness' },
    { name: 'Nutrition Tips', members: 456, category: 'Diet' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Chatr" className="h-8" onClick={() => navigate('/')} />
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/')}>
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Community Space</h1>
          <p className="text-purple-100">Unified social wellness community</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.title}
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate(feature.route)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Health Challenges */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-600" />
                  Active Health Challenges
                </CardTitle>
                <CardDescription>Compete and earn rewards</CardDescription>
              </div>
              <Badge className="bg-orange-600">New Feature</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <div key={challenge.name} className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center">
                        <challenge.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{challenge.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {challenge.participants.toLocaleString()} participants
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-orange-700">
                      {challenge.reward} points
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ends in {challenge.ends}
                  </p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-orange-600">
              View All Challenges
            </Button>
          </CardContent>
        </Card>

        {/* Wellness Circles */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Wellness Circles
            </CardTitle>
            <CardDescription>Join small support groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wellnessCircles.map((circle) => (
                <div key={circle.name} className="p-3 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {circle.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{circle.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {circle.members} members • {circle.category}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-blue-600">
              Explore Wellness Circles
            </Button>
          </CardContent>
        </Card>

        {/* Expert Live Sessions */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-600" />
              Expert Live Sessions
            </CardTitle>
            <CardDescription>Learn from verified health professionals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">Nutrition for Better Sleep</p>
                    <p className="text-sm text-muted-foreground">Dr. Sarah Johnson, Nutritionist</p>
                  </div>
                  <Badge className="bg-green-600">Live</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Today, 6:00 PM
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    234 joined
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-lg border opacity-70">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">Mental Health & Mindfulness</p>
                    <p className="text-sm text-muted-foreground">Dr. Michael Chen, Therapist</p>
                  </div>
                  <Badge variant="outline">Tomorrow</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Tomorrow, 7:00 PM
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    156 registered
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full mt-4 bg-purple-600">
              View All Sessions
            </Button>
          </CardContent>
        </Card>

        {/* Community Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Community Leaderboard
            </CardTitle>
            <CardDescription>Top wellness champions this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div key={rank} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${
                      rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                      rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                      rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                      'bg-muted'
                    } flex items-center justify-center font-bold text-white`}>
                      {rank}
                    </div>
                    <div>
                      <p className="font-medium">User {rank}</p>
                      <p className="text-xs text-muted-foreground">
                        {1500 - (rank * 100)} points
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{3 - (rank - 1)} challenges</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
