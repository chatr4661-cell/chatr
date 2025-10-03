import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, Phone, MapPin, Clock, Star } from 'lucide-react';

const AlliedHealthcare = () => {
  const navigate = useNavigate();

  const providers = [
    {
      id: 1,
      name: 'Apollo Physical Therapy Center',
      specialty: 'Physical Therapy',
      rating: 4.8,
      reviews: 342,
      distance: '2.3 km',
      availability: 'Available Today',
      phone: '+91 98765 43210',
      color: 'from-blue-400 to-blue-600',
      icon: '🏃'
    },
    {
      id: 2,
      name: 'Nutrition & Wellness Clinic',
      specialty: 'Nutritionist',
      rating: 4.9,
      reviews: 567,
      distance: '1.8 km',
      availability: 'Next: Tomorrow 10AM',
      phone: '+91 98765 43211',
      color: 'from-green-400 to-green-600',
      icon: '🥗'
    },
    {
      id: 3,
      name: 'Speech & Language Center',
      specialty: 'Speech Therapy',
      rating: 4.7,
      reviews: 234,
      distance: '3.5 km',
      availability: 'Available Today',
      phone: '+91 98765 43212',
      color: 'from-purple-400 to-purple-600',
      icon: '🗣️'
    },
    {
      id: 4,
      name: 'Mindful Counseling Services',
      specialty: 'Mental Health Counseling',
      rating: 4.9,
      reviews: 892,
      distance: '1.2 km',
      availability: 'Available Today',
      phone: '+91 98765 43213',
      color: 'from-pink-400 to-pink-600',
      icon: '🧠'
    },
    {
      id: 5,
      name: 'Occupational Therapy Plus',
      specialty: 'Occupational Therapy',
      rating: 4.6,
      reviews: 187,
      distance: '4.1 km',
      availability: 'Next: Friday 2PM',
      phone: '+91 98765 43214',
      color: 'from-yellow-400 to-yellow-600',
      icon: '✋'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 pb-6">
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Allied Healthcare</h1>
            <p className="text-sm text-muted-foreground">Specialized healthcare services</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 max-w-4xl mx-auto">
        <Card className="backdrop-blur-glass bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-glass-border">
          <CardContent className="pt-6">
            <p className="text-sm text-center">
              Access a network of specialized healthcare professionals including physiotherapists, nutritionists, speech therapists, and more.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Providers */}
      <div className="px-4 max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-semibold">Available Providers</h2>
        
        {providers.map((provider) => (
          <Card key={provider.id} className="backdrop-blur-glass bg-gradient-glass border-glass-border shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-glow text-3xl`}>
                  {provider.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  <CardDescription>{provider.specialty}</CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-medium">{provider.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ({provider.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.distance} away</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">{provider.availability}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 shadow-glow">
                  Book Appointment
                </Button>
                <Button variant="outline" size="icon">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlliedHealthcare;
