import { 
  MessageSquare, 
  Heart, 
  Ambulance, 
  Pill, 
  Activity, 
  Users, 
  ShoppingBag, 
  Sparkles,
  Stethoscope,
  Bell,
  Trophy,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ServiceCard from "@/components/ServiceCard";

const Index = () => {
  const services = [
    {
      icon: Sparkles,
      title: "AI Health Assistant",
      description: "24/7 intelligent health guidance and symptom analysis",
      iconColor: "bg-primary"
    },
    {
      icon: Stethoscope,
      title: "Doctor Consultation",
      description: "Connect with verified doctors via video, audio, or chat",
      iconColor: "bg-secondary"
    },
    {
      icon: Shield,
      title: "Emergency SOS",
      description: "One-tap panic button for instant emergency response",
      iconColor: "bg-destructive"
    },
    {
      icon: Activity,
      title: "Wellness Tracking",
      description: "Track steps, calories, water intake, and medicine reminders",
      iconColor: "bg-accent"
    },
    {
      icon: Ambulance,
      title: "Ambulance Service",
      description: "Quick ambulance dispatch with live tracking",
      iconColor: "bg-secondary"
    },
    {
      icon: Pill,
      title: "Pharmacy & Medicine",
      description: "Order medicines from nearby verified pharmacies",
      iconColor: "bg-primary"
    },
    {
      icon: Heart,
      title: "Home Nursing",
      description: "Professional nursing care in the comfort of your home",
      iconColor: "bg-accent"
    },
    {
      icon: Trophy,
      title: "Youth Engagement",
      description: "Gamified health challenges and community features",
      iconColor: "bg-secondary"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-8 border border-primary/20">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Where chat meets care</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              HealthMessenger
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Your complete healthcare ecosystem in one chat-based platform. Connect, consult, and care — all in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-elevated">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2">
                For Healthcare Providers
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>10M+ Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            All Your Healthcare Needs in One App
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From messaging your doctor to ordering medicines, tracking wellness to emergency care — everything you need is just a chat away.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>
      </section>

      {/* Features Highlight */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                  Chat-First Healthcare Experience
                </h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">Instant Messaging</h3>
                      <p className="text-muted-foreground">Connect with healthcare providers through familiar chat interfaces</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">AI-Powered Insights</h3>
                      <p className="text-muted-foreground">Get personalized health recommendations and medicine reminders</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">Integrated Marketplace</h3>
                      <p className="text-muted-foreground">Order medicines, book services, all within the chat</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-card p-8 rounded-3xl border border-border/50 shadow-elevated">
                <div className="space-y-4">
                  <div className="bg-card p-4 rounded-2xl shadow-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">AI Health Assistant</div>
                        <div className="text-xs text-muted-foreground">Active now</div>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-xl">
                      <p className="text-sm text-foreground">Hi! How can I assist you today?</p>
                    </div>
                  </div>
                  <div className="bg-card p-4 rounded-2xl shadow-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Dr. Sarah Johnson</div>
                        <div className="text-xs text-muted-foreground">General Physician</div>
                      </div>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <p className="text-sm text-foreground">Your appointment is confirmed for 3:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-hero rounded-3xl p-12 shadow-elevated">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Transform Your Healthcare?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join millions who trust HealthMessenger for their daily health needs. Free to start, premium for $2/month.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
            Download App Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
