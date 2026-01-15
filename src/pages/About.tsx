import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Heart, Zap, Shield, Globe, Award } from 'lucide-react';
import chatrLogo from '@/assets/chatr-brand-logo.png';
import { SEOHead } from '@/components/SEOHead';

export default function About() {
  const navigate = useNavigate();

  const values = [
    {
      icon: Users,
      title: 'Community First',
      description: 'Building meaningful connections through technology'
    },
    {
      icon: Heart,
      title: 'Health & Wellness',
      description: 'Making healthcare accessible to everyone'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Constantly evolving with cutting-edge features'
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      description: 'Your data, your control, always protected'
    },
    {
      icon: Globe,
      title: 'Accessibility',
      description: 'Available anytime, anywhere, for everyone'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Delivering world-class user experience'
    }
  ];

  const milestones = [
    { year: '2025', event: 'Chatr+ Launch', description: 'Launched as India\'s first super-app ecosystem' },
    { year: '2025 Q2', event: 'AI Integration', description: 'Integrated advanced AI for health and chat' },
    { year: '2025 Q3', event: 'Business Hub', description: 'Launched comprehensive business tools' },
    { year: '2025 Q4', event: 'Community Growth', description: 'Reached 325+ active users and growing' }
  ];

  return (
    <>
      <SEOHead
        title="About Chatr+ | India's AI Superapp for Chat, Healthcare & Services"
        description="Learn about Chatr+, India's next-generation superapp integrating communication, healthcare, business tools, and lifestyle services. Mission, vision, and company info."
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">About Chatr+</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <Card className="p-8 text-center space-y-4">
          <img src={chatrLogo} alt="Chatr+" className="h-20 mx-auto" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
            Say It. Share It. Live It.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Chatr+ is India's next-generation super-app that seamlessly integrates communication, 
            healthcare, business tools, and lifestyle services into one powerful ecosystem.
          </p>
        </Card>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-3">
            <h3 className="text-xl font-bold text-primary">Our Mission</h3>
            <p className="text-muted-foreground">
              To revolutionize digital communication by creating an all-in-one platform that 
              empowers users to connect, collaborate, and thrive in their personal and professional lives.
            </p>
          </Card>
          <Card className="p-6 space-y-3">
            <h3 className="text-xl font-bold text-cyan-500">Our Vision</h3>
            <p className="text-muted-foreground">
              To become the most trusted and comprehensive digital ecosystem in India, 
              making technology accessible, meaningful, and beneficial for everyone.
            </p>
          </Card>
        </div>

        {/* Core Values */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-center">Our Core Values</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {values.map((value, index) => (
              <Card key={index} className="p-6 space-y-3 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">{value.title}</h4>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Journey Timeline */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-center">Our Journey</h3>
          <Card className="p-6">
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-right">
                    <span className="font-bold text-primary">{milestone.year}</span>
                  </div>
                  <div className="flex-shrink-0 w-px bg-border relative">
                    <div className="absolute -left-1 top-2 w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className="font-semibold">{milestone.event}</h4>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Company Info */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xl font-bold">Company Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Product</p>
              <p className="font-semibold">Chatr</p>
            </div>
            <div>
              <p className="text-muted-foreground">Operated By</p>
              <p className="font-semibold">Talentxcel Services Pvt Ltd</p>
            </div>
            <div>
              <p className="text-muted-foreground">Headquarters</p>
              <p className="font-semibold">Noida, Uttar Pradesh, India</p>
            </div>
            <div>
              <p className="text-muted-foreground">Industry</p>
              <p className="font-semibold">Technology, Healthcare, Communication</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            © 2026 Talentxcel Services Pvt Ltd. All rights reserved.
          </p>
        </Card>

        {/* CTA */}
        <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-primary/5 to-cyan-500/5">
          <h3 className="text-2xl font-bold">Join the Chatr+ Community</h3>
          <p className="text-muted-foreground">
            Experience the future of digital communication today
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button variant="outline" onClick={() => navigate('/contact')}>
              Contact Us
            </Button>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}
