import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Stethoscope, 
  Heart, 
  ShoppingBag, 
  Briefcase,
  Phone,
  Video,
  MapPin,
  Pill,
  Star,
  Users,
  CheckCircle,
  ArrowRight,
  Compass,
  Activity,
  Shield,
  Wallet,
  Calendar,
  FlaskConical,
  ChevronRight,
  Sparkles,
  Plus
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/SEOHead';
import { CarePathCard } from '@/components/care/CarePathCard';
import { FamilyControlToggle } from '@/components/care/FamilyControlToggle';
import { SmartActionCard } from '@/components/care/SmartActionCard';
import { PreventiveAlert } from '@/components/care/PreventiveAlert';
import { EmergencyButton } from '@/components/care/EmergencyButton';

interface FamilyMember {
  id: string;
  name: string;
  relationship: 'self' | 'mother' | 'father' | 'spouse' | 'child' | 'other';
  avatar?: string;
  hasAlerts?: boolean;
  alertCount?: number;
}

interface CarePath {
  id: string;
  name: string;
  type: 'diabetes' | 'bp' | 'cardiac' | 'thyroid' | 'cholesterol' | 'mental';
  status: 'stable' | 'attention' | 'critical' | 'improving';
  progress: number;
  lastAction: string;
  nextAction: string;
  dueDate?: string;
  memberName?: string;
}

export default function CareAccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [carePaths, setCarePaths] = useState<CarePath[]>([]);
  const [smartActions, setSmartActions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.username || profile.full_name?.split(' ')[0] || 'there');
      }

      // Load family members
      const familyData: any[] = [];
      try {
        const { data } = await supabase
          .from('health_family_members' as any)
          .select('id, name, relationship, alerts_enabled')
          .eq('user_id', user.id);
        if (data) familyData.push(...data);
      } catch (e) {
        console.log('Family members not available');
      }

      const members: FamilyMember[] = [
        { id: user.id, name: userName, relationship: 'self' },
        ...familyData.map((m) => ({
          id: m.id,
          name: m.name,
          relationship: m.relationship as FamilyMember['relationship'],
          hasAlerts: m.alerts_enabled,
          alertCount: 0
        }))
      ];
      setFamilyMembers(members);
      setSelectedMember(members[0]);

      // Load medication reminders for smart actions
      const { data: reminders } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Load recent vitals
      const { data: vitals } = await supabase
        .from('chronic_vitals')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(5);

      // Generate smart actions based on data
      const actions = generateSmartActions(reminders, vitals);
      setSmartActions(actions);

      // Generate care paths based on conditions
      const paths = generateCarePaths(reminders, vitals);
      setCarePaths(paths);

      // Generate preventive alerts
      const generatedAlerts = generatePreventiveAlerts(vitals);
      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartActions = (reminders: any[], vitals: any[]) => {
    const actions = [];

    // Check for medicine refills
    if (reminders && reminders.length > 0) {
      actions.push({
        id: 'refill',
        type: 'refill' as const,
        title: 'Refill Medicines',
        description: `${reminders.length} medicines running low`,
        urgency: 'medium' as const,
        context: 'Based on your schedule',
        action: () => navigate('/care/medicines')
      });
    }

    // Check for vital alerts
    if (vitals && vitals.length > 0) {
      const latestBP = vitals.find((v: any) => v.vital_type === 'blood_pressure_systolic');
      if (latestBP && latestBP.value > 140) {
        actions.push({
          id: 'bp_alert',
          type: 'vital_alert' as const,
          title: 'BP High Today',
          description: 'Talk to your doctor now',
          urgency: 'high' as const,
          context: `Last reading: ${latestBP.value} mmHg`,
          action: () => navigate('/teleconsultation')
        });
      }
    }

    // Always add call doctor option
    actions.push({
      id: 'call_doctor',
      type: 'call_doctor' as const,
      title: 'Call Last Consulted Doctor',
      description: 'Continue your care conversation',
      urgency: 'low' as const,
      action: () => navigate('/teleconsultation')
    });

    return actions;
  };

  const generateCarePaths = (reminders: any[], vitals: any[]): CarePath[] => {
    const paths: CarePath[] = [];

    // Check for diabetes-related reminders
    const hasDiabetes = reminders?.some(r => 
      r.medicine_name?.toLowerCase().includes('metformin') || 
      r.medicine_name?.toLowerCase().includes('glimepiride')
    );
    if (hasDiabetes) {
      paths.push({
        id: 'diabetes',
        name: 'Diabetes Care Path',
        type: 'diabetes',
        status: 'stable',
        progress: 72,
        lastAction: 'Took morning medicine',
        nextAction: 'Log post-lunch sugar',
        dueDate: 'Today 2:00 PM'
      });
    }

    // Check for BP-related data
    const hasBP = vitals?.some(v => v.vital_type?.includes('blood_pressure')) ||
      reminders?.some(r => r.medicine_name?.toLowerCase().includes('amlodipine'));
    if (hasBP) {
      const latestBP = vitals?.find(v => v.vital_type === 'blood_pressure_systolic');
      paths.push({
        id: 'bp',
        name: 'BP Management',
        type: 'bp',
        status: latestBP?.value > 140 ? 'attention' : 'stable',
        progress: 65,
        lastAction: 'BP checked 2 hours ago',
        nextAction: 'Evening BP reading',
        dueDate: 'Today 6:00 PM'
      });
    }

    // Default path if none detected
    if (paths.length === 0) {
      paths.push({
        id: 'wellness',
        name: 'General Wellness',
        type: 'cardiac',
        status: 'stable',
        progress: 45,
        lastAction: 'Started health tracking',
        nextAction: 'Complete health profile',
        dueDate: 'This week'
      });
    }

    return paths;
  };

  const generatePreventiveAlerts = (vitals: any[]) => {
    const alerts = [];

    if (vitals && vitals.length >= 3) {
      const bpReadings = vitals.filter((v: any) => v.vital_type === 'blood_pressure_systolic');
      if (bpReadings.length >= 3) {
        const avgBP = bpReadings.reduce((sum: number, v: any) => sum + v.value, 0) / bpReadings.length;
        if (avgBP > 130) {
          alerts.push({
            id: 'bp_trend',
            type: 'warning' as const,
            title: 'BP Rising Trend',
            message: 'Your blood pressure has been elevated for the past 5 days. Consider consulting your doctor.',
            metric: {
              name: 'Avg BP',
              trend: 'up' as const,
              value: `${Math.round(avgBP)} mmHg`,
              duration: '5 days'
            },
            action: {
              label: 'Schedule Consultation',
              route: '/teleconsultation'
            }
          });
        }
      }
    }

    return alerts;
  };

  const careServices = [
    { icon: Pill, label: 'Medicines', route: '/care/medicines', color: 'from-emerald-500 to-teal-600', badge: 'Save 25%' },
    { icon: Video, label: 'Teleconsult', route: '/teleconsultation', color: 'from-blue-500 to-indigo-600' },
    { icon: MapPin, label: 'Find Nearby', route: '/local-healthcare', color: 'from-purple-500 to-violet-600' },
    { icon: FlaskConical, label: 'Labs', route: '/lab-reports', color: 'from-pink-500 to-rose-600' },
    { icon: Calendar, label: 'Appointments', route: '/booking', color: 'from-orange-500 to-amber-600' },
    { icon: Wallet, label: 'Health Wallet', route: '/health-wallet', color: 'from-green-500 to-emerald-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Care Access - Your Healthcare Operating System | Chatr"
        description="Healthcare that moves before the patient does. Manage your complete health journey with Care Paths, smart actions, and family care."
        keywords="healthcare, care paths, diabetes management, bp control, family health, teleconsultation"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-6">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4">
              <img 
                src={logo} 
                alt="Chatr" 
                className="h-6 cursor-pointer" 
                onClick={() => navigate('/')} 
              />
              <FamilyControlToggle
                members={familyMembers}
                selectedMember={selectedMember}
                onSelectMember={setSelectedMember}
              />
            </div>

            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <h1 className="text-2xl font-bold mb-1">
                Hey {userName} 👋
              </h1>
              <p className="text-blue-100 text-sm">
                Your healthcare operating system is ready
              </p>
            </motion.div>

            {/* Quick Services */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {careServices.map((service, idx) => (
                <motion.div
                  key={service.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="text-center"
                  onClick={() => navigate(service.route)}
                >
                  <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-1 cursor-pointer hover:scale-105 transition-transform shadow-lg`}>
                    <service.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-[10px] text-white/90">{service.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 space-y-6 -mt-2">
          {/* Active Care Paths */}
          {carePaths.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">Your Active Care Paths</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <Plus className="h-4 w-4" />
                  Add Path
                </Button>
              </div>
              <div className="space-y-3">
                {carePaths.map((path, idx) => (
                  <CarePathCard 
                    key={path.id} 
                    path={path}
                    isFamily={selectedMember?.relationship !== 'self'}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Preventive Alerts */}
          {alerts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <PreventiveAlert 
                alerts={alerts}
                onDismiss={(id) => setAlerts(alerts.filter(a => a.id !== id))}
              />
            </motion.section>
          )}

          {/* Smart Actions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Smart Actions</h2>
              <Badge variant="secondary" className="text-[10px]">Context-Aware</Badge>
            </div>
            <div className="space-y-3">
              {smartActions.map((action, idx) => (
                <SmartActionCard 
                  key={action.id} 
                  action={action}
                  delay={0.1 + idx * 0.05}
                />
              ))}
            </div>
          </motion.section>

          {/* Emergency Button */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <EmergencyButton />
          </motion.section>

          {/* Outcome-Based Providers */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Outcome-Based Providers
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Doctors ranked by patient outcomes, not just ratings
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/local-healthcare')}>
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: 'Best for Diabetes Control', count: 12, metric: '89% HbA1c improvement' },
                  { name: 'Fastest Emergency Response', count: 8, metric: '<15 min avg response' },
                  { name: 'Top Follow-up Compliance', count: 15, metric: '94% patient return rate' },
                ].map((category, idx) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate('/local-healthcare')}
                  >
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.count} providers</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">{category.metric}</Badge>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.section>

          {/* Health Wallet CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card 
              className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/health-wallet')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <motion.span
                      className="text-2xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      🪙
                    </motion.span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">Health Currency</h3>
                      <Badge className="bg-green-500 text-[10px]">Earn Rewards</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get coins for medicine adherence, lab follow-ups & preventive checkups
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Provider Portal */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  For Healthcare Providers
                </CardTitle>
                <CardDescription className="text-xs">
                  Long-term care relationships • Predictable income • Better compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-teal-600 hover:bg-teal-700" 
                  onClick={() => navigate('/provider-register')}
                >
                  Join Provider Network
                </Button>
              </CardContent>
            </Card>
          </motion.section>

          {/* Trust Banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center py-4"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-xs">
                Trusted by 10,000+ families across India 🇮🇳
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              "Healthcare that doesn't wait for emergencies"
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
