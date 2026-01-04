import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, CheckCircle, Clock, AlertTriangle, Pill, 
  Activity, Calendar, Video, FlaskConical, ChevronRight,
  Heart, Droplet, Brain, TrendingUp, TrendingDown, Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { format } from 'date-fns';

interface CareStep {
  id: string;
  title: string;
  description: string;
  type: 'medicine' | 'vital' | 'lab' | 'appointment' | 'lifestyle';
  status: 'completed' | 'pending' | 'upcoming' | 'overdue';
  dueDate?: string;
  completedAt?: string;
}

interface Vital {
  id: string;
  vital_type: string;
  value: number;
  unit: string;
  recorded_at: string;
}

interface Medicine {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  time_slots: string[];
}

const pathTypeConfig: Record<string, { icon: React.ElementType; color: string; gradient: string; title: string }> = {
  diabetes: { icon: Droplet, color: 'text-purple-500', gradient: 'from-purple-500 to-violet-600', title: 'Diabetes Care Path' },
  bp: { icon: Heart, color: 'text-red-500', gradient: 'from-red-500 to-rose-600', title: 'BP Management' },
  cardiac: { icon: Heart, color: 'text-rose-500', gradient: 'from-rose-500 to-pink-600', title: 'Cardiac Care Path' },
  mental: { icon: Brain, color: 'text-indigo-500', gradient: 'from-indigo-500 to-purple-600', title: 'Mental Wellness Path' },
  thyroid: { icon: Activity, color: 'text-cyan-500', gradient: 'from-cyan-500 to-blue-600', title: 'Thyroid Management' },
  wellness: { icon: Activity, color: 'text-green-500', gradient: 'from-green-500 to-emerald-600', title: 'General Wellness' },
};

export default function CarePathDetail() {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('timeline');
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [steps, setSteps] = useState<CareStep[]>([]);
  const [progress, setProgress] = useState(45);

  useEffect(() => {
    loadPathData();
  }, [pathId]);

  const loadPathData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load vitals based on path type
      let vitalTypes: string[] = [];
      if (pathId === 'diabetes') {
        vitalTypes = ['blood_sugar_fasting', 'blood_sugar_pp', 'hba1c'];
      } else if (pathId === 'bp') {
        vitalTypes = ['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate'];
      } else if (pathId === 'cardiac') {
        vitalTypes = ['blood_pressure_systolic', 'heart_rate', 'cholesterol'];
      } else if (pathId === 'thyroid') {
        vitalTypes = ['tsh', 'weight'];
      }

      if (vitalTypes.length > 0) {
        const { data: vitalsData } = await supabase
          .from('chronic_vitals')
          .select('*')
          .eq('user_id', user.id)
          .in('vital_type', vitalTypes)
          .order('recorded_at', { ascending: false })
          .limit(10);
        
        if (vitalsData) setVitals(vitalsData);
      }

      // Load medication reminders
      const { data: medicinesData } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (medicinesData) {
        setMedicines(medicinesData);
        
        // Calculate progress based on adherence
        const totalMeds = medicinesData.length;
        if (totalMeds > 0) {
          // Mock adherence calculation - in real app, check completed reminders
          const adherence = Math.floor(70 + Math.random() * 25);
          setProgress(adherence);
        }
      }

      // Generate care steps based on data
      const generatedSteps: CareStep[] = [];
      
      // Add medicine steps
      medicinesData?.forEach((med, idx) => {
        const isCompleted = Math.random() > 0.3;
        generatedSteps.push({
          id: `med-${med.id}`,
          title: `Take ${med.medicine_name}`,
          description: `${med.dosage} - ${med.frequency}`,
          type: 'medicine',
          status: isCompleted ? 'completed' : idx === 0 ? 'pending' : 'upcoming',
          dueDate: isCompleted ? undefined : 'Today',
          completedAt: isCompleted ? 'Today 8:00 AM' : undefined
        });
      });

      // Add vital tracking step
      generatedSteps.push({
        id: 'vital-1',
        title: pathId === 'diabetes' ? 'Log Blood Sugar' : 'Check Blood Pressure',
        description: pathId === 'diabetes' ? 'Post-lunch glucose reading' : 'Evening BP measurement',
        type: 'vital',
        status: vitals.length > 0 ? 'completed' : 'pending',
        dueDate: 'Today 2:00 PM'
      });

      // Add lab test step
      generatedSteps.push({
        id: 'lab-1',
        title: pathId === 'diabetes' ? 'HbA1c Test' : 'Complete Blood Count',
        description: 'Quarterly lab test recommended',
        type: 'lab',
        status: 'upcoming',
        dueDate: 'Jan 15, 2026'
      });

      // Add appointment step
      generatedSteps.push({
        id: 'apt-1',
        title: 'Doctor Follow-up',
        description: 'Monthly check-up with specialist',
        type: 'appointment',
        status: 'upcoming',
        dueDate: 'Jan 20, 2026'
      });

      setSteps(generatedSteps);

    } catch (error) {
      console.error('Error loading path data:', error);
      toast.error('Failed to load care path data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: 'completed' as const, completedAt: format(new Date(), 'h:mm a') }
        : step
    ));
    toast.success('Step completed! +10 Health Coins earned');
  };

  const config = pathTypeConfig[pathId || 'wellness'] || pathTypeConfig.wellness;
  const Icon = config.icon;

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'medicine': return Pill;
      case 'vital': return Activity;
      case 'lab': return FlaskConical;
      case 'appointment': return Calendar;
      default: return CheckCircle;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700 border-0">✓ Done</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 border-0">Pending</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-700 border-0">Overdue</Badge>;
      default: return <Badge variant="outline">Upcoming</Badge>;
    }
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
        title={`${config.title} | Chatr Care`}
        description={`Manage your ${config.title.toLowerCase()} with personalized care steps, medicine tracking, and vital monitoring.`}
      />
      
      <div className="min-h-screen bg-background pb-6">
        {/* Header */}
        <div className={`bg-gradient-to-br ${config.gradient} text-white`}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{config.title}</h1>
                <p className="text-sm text-white/80">Care journey in progress</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Overall Progress</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
              <div className="flex justify-between mt-2 text-xs text-white/70">
                <span>Started: Jan 1, 2026</span>
                <span>Target: Jun 1, 2026</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full bg-background shadow-sm">
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="vitals" className="flex-1">Vitals</TabsTrigger>
              <TabsTrigger value="medicines" className="flex-1">Medicines</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4 space-y-3">
              {steps.length > 0 ? (
                steps.map((step, idx) => {
                  const StepIcon = getStepIcon(step.type);
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className={`${step.status === 'completed' ? 'opacity-70' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              step.status === 'completed' ? 'bg-green-100' : 'bg-muted'
                            }`}>
                              {step.status === 'completed' 
                                ? <CheckCircle className="h-5 w-5 text-green-600" />
                                : <StepIcon className="h-5 w-5 text-muted-foreground" />
                              }
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium">{step.title}</h4>
                                {getStatusBadge(step.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.completedAt || step.dueDate}
                              </p>
                            </div>
                            {step.status === 'pending' && (
                              <Button size="sm" onClick={() => handleCompleteStep(step.id)}>Complete</Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No steps yet</h3>
                  <p className="text-sm text-muted-foreground">Add medicines and vitals to see your care timeline</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="vitals" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {pathId === 'diabetes' ? 'Blood Glucose' : 'Blood Pressure'} Trend
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => navigate('/chronic-vitals')}>
                      <Plus className="h-4 w-4 mr-1" />
                      Log
                    </Button>
                  </div>
                  <CardDescription>Last 7 days readings</CardDescription>
                </CardHeader>
                <CardContent>
                  {vitals.length > 0 ? (
                    <>
                      <div className="flex items-end gap-2 h-32">
                        {vitals.slice(0, 7).map((vital, idx) => {
                          const maxVal = pathId === 'diabetes' ? 300 : 200;
                          return (
                            <motion.div
                              key={vital.id || idx}
                              initial={{ height: 0 }}
                              animate={{ height: `${(vital.value / maxVal) * 100}%` }}
                              transition={{ delay: idx * 0.1 }}
                              className={`flex-1 rounded-t-lg relative group ${
                                vital.value > (pathId === 'diabetes' ? 180 : 140)
                                  ? 'bg-gradient-to-t from-red-500 to-red-300'
                                  : 'bg-gradient-to-t from-purple-500 to-purple-300'
                              }`}
                            >
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {vital.value}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        {vitals.slice(0, 7).map((v, i) => (
                          <span key={i}>{format(new Date(v.recorded_at), 'd')}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No vitals recorded yet</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => navigate('/chronic-vitals')}
                      >
                        Start Logging
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medicines" className="mt-4 space-y-3">
              {medicines.length > 0 ? (
                medicines.map((medicine, idx) => {
                  const adherence = Math.floor(75 + Math.random() * 20);
                  return (
                    <motion.div
                      key={medicine.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Pill className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">{medicine.medicine_name}</h4>
                                <p className="text-sm text-muted-foreground">{medicine.dosage} • {medicine.frequency}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">{adherence}%</p>
                              <p className="text-xs text-muted-foreground">Adherence</p>
                            </div>
                          </div>
                          <Progress value={adherence} className="h-1.5" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <Pill className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No medicines added</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add your medicines to track adherence</p>
                  <Button onClick={() => navigate('/medicine-reminders')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medicine
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
