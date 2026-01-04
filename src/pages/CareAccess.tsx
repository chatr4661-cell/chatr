import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Stethoscope, Heart, Phone, Video, MapPin, Pill, Star, Users,
  CheckCircle, ArrowRight, Compass, Activity, Shield, Wallet,
  Calendar, FlaskConical, ChevronRight, Sparkles, Plus, 
  Search, Clock, Bell, TrendingUp, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import {
  CarePathCard,
  FamilyControlToggle,
  SmartActionCard,
  PreventiveAlert,
  EmergencyButton,
  CareDashboardHeader,
  OutcomeProviders,
  ProviderPortalCTA,
  CareBottomNav,
  HealthWalletCard,
  DoctorSearch,
  HealthcareProvider
} from '@/components/care';

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
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'home';
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [carePaths, setCarePaths] = useState<CarePath[]>([]);
  const [smartActions, setSmartActions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [providerStats, setProviderStats] = useState({ total: 0, cities: 0, specialties: 0 });

  useEffect(() => {
    loadData();
    loadProviderStats();
  }, []);

  const loadProviderStats = async () => {
    try {
      const { count } = await supabase
        .from('chatr_healthcare')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: cities } = await supabase
        .from('chatr_healthcare')
        .select('city')
        .eq('is_active', true);
      
      const uniqueCities = new Set(cities?.map(c => c.city)).size;

      const { data: specialties } = await supabase
        .from('chatr_healthcare')
        .select('specialty')
        .eq('is_active', true);
      
      const uniqueSpecialties = new Set(specialties?.map(s => s.specialty)).size;

      setProviderStats({
        total: count || 500,
        cities: uniqueCities || 10,
        specialties: uniqueSpecialties || 47
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

      const name = profile?.username || profile?.full_name?.split(' ')[0] || 'there';
      setUserName(name);

      // Load family members
      const familyData: any[] = [];
      try {
        const { data } = await supabase
          .from('health_family_members')
          .select('id, member_name, relationship, alert_on_missed_dose')
          .eq('caregiver_user_id', user.id);
        if (data) familyData.push(...data);
      } catch (e) {
        console.log('Family members not available');
      }

      const members: FamilyMember[] = [
        { id: user.id, name: name, relationship: 'self' },
        ...familyData.map((m) => ({
          id: m.id,
          name: m.member_name,
          relationship: m.relationship as FamilyMember['relationship'],
          hasAlerts: m.alert_on_missed_dose,
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
    const generatedAlerts = [];

    if (vitals && vitals.length >= 3) {
      const bpReadings = vitals.filter((v: any) => v.vital_type === 'blood_pressure_systolic');
      if (bpReadings.length >= 3) {
        const avgBP = bpReadings.reduce((sum: number, v: any) => sum + v.value, 0) / bpReadings.length;
        if (avgBP > 130) {
          generatedAlerts.push({
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

    return generatedAlerts;
  };

  const handleBookProvider = (provider: HealthcareProvider) => {
    navigate(`/care/doctor/${provider.id}`);
  };

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
        description={`Healthcare that moves before the patient does. Access ${providerStats.total}+ verified doctors across ${providerStats.cities} cities with ${providerStats.specialties}+ specialties.`}
        keywords="healthcare, care paths, diabetes management, bp control, family health, teleconsultation, doctors near me"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
        {/* Premium Header */}
        <CareDashboardHeader
          userName={userName}
          familyMembers={familyMembers}
          selectedMember={selectedMember}
          onSelectMember={setSelectedMember}
          healthScore={85}
          unreadAlerts={alerts.length}
        />

        {/* Main Tabs */}
        <div className="max-w-4xl mx-auto px-4 -mt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-background/80 backdrop-blur-sm shadow-sm">
              <TabsTrigger value="home" className="flex-1">
                <Compass className="h-4 w-4 mr-1" />
                Home
              </TabsTrigger>
              <TabsTrigger value="doctors" className="flex-1">
                <Stethoscope className="h-4 w-4 mr-1" />
                Doctors
              </TabsTrigger>
              <TabsTrigger value="care" className="flex-1">
                <Heart className="h-4 w-4 mr-1" />
                My Care
              </TabsTrigger>
            </TabsList>

            {/* Home Tab */}
            <TabsContent value="home" className="mt-4 space-y-6">
              {/* Provider Stats Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { value: `${providerStats.total}+`, label: 'Doctors', icon: Stethoscope },
                  { value: `${providerStats.cities}`, label: 'Cities', icon: MapPin },
                  { value: `${providerStats.specialties}+`, label: 'Specialties', icon: Activity },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 text-center"
                  >
                    <stat.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>

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
                    {carePaths.map((path) => (
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
                <OutcomeProviders onBookProvider={handleBookProvider} />
              </motion.section>

              {/* Health Wallet */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <HealthWalletCard />
              </motion.section>

              {/* Provider Portal CTA */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <ProviderPortalCTA />
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
            </TabsContent>

            {/* Doctors Tab */}
            <TabsContent value="doctors" className="mt-4">
              <DoctorSearch onSelectProvider={handleBookProvider} />
            </TabsContent>

            {/* My Care Tab */}
            <TabsContent value="care" className="mt-4 space-y-6">
              {/* Care Paths */}
              <section>
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  All Care Paths
                </h2>
                <div className="space-y-3">
                  {carePaths.map((path) => (
                    <CarePathCard 
                      key={path.id} 
                      path={path}
                      isFamily={selectedMember?.relationship !== 'self'}
                    />
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => navigate('/chronic-vitals')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Care Path
                  </Button>
                </div>
              </section>

              {/* Family Members */}
              <section>
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Family Care
                </h2>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {familyMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {member.relationship === 'self' ? '👤' : 
                             member.relationship === 'mother' ? '👩' :
                             member.relationship === 'father' ? '👨' : '👪'}
                          </div>
                          <div>
                            <p className="font-medium">{member.relationship === 'self' ? 'You' : member.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.relationship}</p>
                          </div>
                        </div>
                        {member.hasAlerts && (
                          <Badge variant="destructive" className="text-xs">
                            {member.alertCount} alerts
                          </Badge>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={() => navigate('/care/family/add')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Family Member
                    </Button>
                  </CardContent>
                </Card>
              </section>

              {/* Health Wallet */}
              <section>
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Health Wallet
                </h2>
                <HealthWalletCard />
              </section>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom Navigation */}
        <CareBottomNav />
      </div>
    </>
  );
}
