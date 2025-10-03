import { useNavigate } from 'react-router-dom';
import { 
  Bot, Stethoscope, AlertCircle, Activity, 
  Users, ShoppingBag, MessageCircle, Heart 
} from 'lucide-react';
import ServiceCard from '@/components/ServiceCard';

const Index = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: Bot,
      title: 'AI Health Assistant',
      description: 'Get instant health advice and symptom analysis',
      iconColor: 'bg-gradient-to-br from-teal-400 to-teal-600',
      path: '/ai-assistant',
    },
    {
      icon: Stethoscope,
      title: 'Doctor/Nurse Booking',
      description: 'Book appointments with healthcare professionals',
      iconColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      path: '/booking',
    },
    {
      icon: AlertCircle,
      title: 'Emergency',
      description: 'Quick access to emergency services',
      iconColor: 'bg-gradient-to-br from-red-400 to-red-600',
      path: '/emergency',
    },
    {
      icon: Activity,
      title: 'Wellness Tracking',
      description: 'Monitor your health metrics and goals',
      iconColor: 'bg-gradient-to-br from-pink-400 to-pink-600',
      path: '/wellness',
    },
    {
      icon: Users,
      title: 'Youth Engagement',
      description: 'Health programs for young people',
      iconColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      path: '/youth',
    },
    {
      icon: ShoppingBag,
      title: 'Marketplace',
      description: 'Order medicines and health products',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      path: '/marketplace',
    },
    {
      icon: MessageCircle,
      title: 'Messaging',
      description: 'Chat with healthcare providers',
      iconColor: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
      path: '/chat',
    },
    {
      icon: Heart,
      title: 'Allied Healthcare',
      description: 'Access to specialized healthcare services',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      path: '/allied',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-glass bg-gradient-glass border-b border-glass-border shadow-glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow">
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">HealthMessenger</h1>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium shadow-glow hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Your Complete Healthcare
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Messaging Platform
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with healthcare professionals, manage your wellness, and access emergency services all in one place.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              onClick={() => navigate(service.path)}
              className="cursor-pointer"
            >
              <ServiceCard
                icon={service.icon}
                title={service.title}
                description={service.description}
                iconColor={service.iconColor}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden backdrop-blur-glass bg-gradient-glass border-t border-glass-border shadow-elevated">
        <div className="flex justify-around items-center h-16 px-4">
          <button className="flex flex-col items-center gap-1 text-primary">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Stethoscope className="w-6 h-6" />
            <span className="text-xs">Book</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Activity className="w-6 h-6" />
            <span className="text-xs">Wellness</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <ShoppingBag className="w-6 h-6" />
            <span className="text-xs">Shop</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Index;
