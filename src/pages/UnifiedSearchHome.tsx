import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Utensils, Wrench, Heart, Briefcase, TrendingUp, HeartHandshake, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UnifiedSearchHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      icon: Utensils,
      title: 'Food',
      description: 'Order from restaurants',
      route: '/food',
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-600'
    },
    {
      icon: Wrench,
      title: 'Services',
      description: 'Home services & more',
      route: '/services',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-600'
    },
    {
      icon: Heart,
      title: 'Healthcare',
      description: 'Doctors & clinics',
      route: '/healthcare',
      gradient: 'from-pink-500/20 to-rose-500/20',
      iconColor: 'text-pink-600'
    },
    {
      icon: Briefcase,
      title: 'Jobs',
      description: 'Find opportunities',
      route: '/jobs',
      gradient: 'from-purple-500/20 to-indigo-500/20',
      iconColor: 'text-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'Deals',
      description: 'Local offers',
      route: '/deals',
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-600'
    },
    {
      icon: HeartHandshake,
      title: 'Care',
      description: 'Healthcare access',
      route: '/care',
      gradient: 'from-teal-500/20 to-cyan-500/20',
      iconColor: 'text-teal-600'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/chatr-home?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">
              CHATR
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Your unified platform for everything you need
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for food, services, healthcare, jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-2xl border-2 focus:border-primary"
              />
              {searchQuery && (
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
                >
                  Search
                </Button>
              )}
            </div>
          </form>

          {/* Location Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <MapPin className="h-4 w-4" />
            <span>Showing results near you</span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6">Explore Categories</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card
              key={category.route}
              className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-gradient-to-br ${category.gradient} border-2`}
              onClick={() => navigate(category.route)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-background/80 flex items-center justify-center ${category.iconColor}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-background/80 backdrop-blur-sm border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Button variant="ghost" onClick={() => navigate('/about')}>
              About
            </Button>
            <Button variant="ghost" onClick={() => navigate('/help')}>
              Help
            </Button>
            <Button variant="ghost" onClick={() => navigate('/contact')}>
              Contact
            </Button>
            <Button variant="ghost" onClick={() => navigate('/privacy')}>
              Privacy
            </Button>
            <Button variant="ghost" onClick={() => navigate('/terms')}>
              Terms
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
