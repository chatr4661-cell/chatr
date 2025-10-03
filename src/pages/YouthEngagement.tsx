import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, Users, Calendar, Award, Target } from 'lucide-react';

const YouthEngagement = () => {
  const navigate = useNavigate();

  const programs = [
    {
      icon: Trophy,
      title: 'Health Challenges',
      description: 'Join fitness and wellness challenges',
      points: '500 pts',
      participants: '234 active',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Users,
      title: 'Peer Support Groups',
      description: 'Connect with others your age',
      points: '200 pts',
      participants: '89 members',
      color: 'from-blue-400 to-purple-500'
    },
    {
      icon: Calendar,
      title: 'Health Workshops',
      description: 'Interactive learning sessions',
      points: '300 pts',
      participants: 'Next: Tomorrow 3PM',
      color: 'from-green-400 to-teal-500'
    },
    {
      icon: Target,
      title: 'Goal Setting',
      description: 'Set and track your health goals',
      points: '400 pts',
      participants: 'Your level: Beginner',
      color: 'from-pink-400 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Youth Engagement</h1>
            <p className="text-sm text-muted-foreground">Health programs and activities</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold">1,250 pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Programs */}
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Available Programs</h2>
          <p className="text-sm text-muted-foreground">
            Participate in programs to earn points and improve your health!
          </p>
        </div>

        {programs.map((program) => {
          const Icon = program.icon;
          return (
            <Card key={program.title} className="backdrop-blur-glass bg-gradient-glass border-glass-border shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${program.color} flex items-center justify-center shadow-glow`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{program.title}</CardTitle>
                    <CardDescription>{program.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      {program.points}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {program.participants}
                    </span>
                  </div>
                  <Button size="sm" className="shadow-glow">
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Leaderboard */}
        <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top Participants This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { rank: 1, name: 'Sarah M.', points: 3450 },
              { rank: 2, name: 'Alex K.', points: 3200 },
              { rank: 3, name: 'Jamie L.', points: 2980 }
            ].map((user) => (
              <div key={user.rank} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    user.rank === 1 ? 'bg-yellow-500 text-white' :
                    user.rank === 2 ? 'bg-gray-400 text-white' :
                    'bg-amber-600 text-white'
                  }`}>
                    {user.rank}
                  </span>
                  <span className="font-medium">{user.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{user.points} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default YouthEngagement;
