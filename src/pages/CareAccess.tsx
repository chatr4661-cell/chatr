import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  AlertTriangle, 
  Heart, 
  ShoppingBag, 
  Briefcase,
  Phone,
  Video,
  MapPin,
  Clock,
  DollarSign,
  Pill
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

export default function CareAccess() {
  const navigate = useNavigate();

  const careServices = [
    {
      icon: Stethoscope,
      title: 'Book Doctor',
      description: 'Schedule appointments with healthcare providers',
      route: '/booking',
      color: 'from-blue-500 to-blue-600',
      badge: null
    },
    {
      icon: Video,
      title: 'Teleconsultation',
      description: 'Instant video/audio consultation with doctors',
      route: '/booking',
      color: 'from-purple-500 to-purple-600',
      badge: 'New'
    },
    {
      icon: AlertTriangle,
      title: 'Emergency Services',
      description: 'Quick access to emergency care',
      route: '/emergency',
      color: 'from-red-500 to-red-600',
      badge: null
    },
    {
      icon: Heart,
      title: 'Allied Healthcare',
      description: 'Specialized health services & therapies',
      route: '/allied-healthcare',
      color: 'from-indigo-500 to-indigo-600',
      badge: null
    },
    {
      icon: ShoppingBag,
      title: 'Marketplace',
      description: 'Order medicines & health products',
      route: '/marketplace',
      color: 'from-purple-500 to-pink-600',
      badge: null
    },
    {
      icon: Pill,
      title: 'Pharmacy Delivery',
      description: 'Get medications delivered to your door',
      route: '/marketplace',
      color: 'from-green-500 to-emerald-600',
      badge: 'New'
    },
    {
      icon: Briefcase,
      title: 'Become a Provider',
      description: 'Register as a healthcare professional',
      route: '/provider-register',
      color: 'from-teal-500 to-cyan-600',
      badge: null
    }
  ];

  const quickActions = [
    { icon: Phone, label: 'Call Doctor', action: () => navigate('/booking') },
    { icon: Video, label: 'Video Call', action: () => navigate('/booking') },
    { icon: MapPin, label: 'Find Nearby', action: () => navigate('/booking') },
    { icon: Clock, label: 'Appointments', action: () => navigate('/booking') }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Chatr" className="h-8" onClick={() => navigate('/')} />
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/')}>
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Care Access</h1>
          <p className="text-blue-100">Complete patient-to-provider ecosystem</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Instant access to care</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={action.action}
                >
                  <action.icon className="w-6 h-6" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Care Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {careServices.map((service) => (
            <Card 
              key={service.title}
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate(service.route)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-3`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                  {service.badge && (
                    <Badge variant="secondary" className="text-xs">{service.badge}</Badge>
                  )}
                </div>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Provider Portal */}
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-teal-600" />
              Healthcare Provider Portal
            </CardTitle>
            <CardDescription>
              Are you a healthcare professional? Join our network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-teal-600">500+</p>
                <p className="text-sm text-muted-foreground">Active Providers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-teal-600">10k+</p>
                <p className="text-sm text-muted-foreground">Consultations</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-teal-600">4.8★</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-teal-600" onClick={() => navigate('/provider-register')}>
              Register as Provider
            </Button>
          </CardContent>
        </Card>

        {/* Health Wallet - New Feature */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Health Wallet
              <Badge className="ml-2">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              Track expenses, insurance, and health rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Manage all your healthcare finances in one place. Link insurance, track spending, and earn rewards for healthy actions.
            </p>
            <Button variant="outline" disabled>
              Learn More
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
