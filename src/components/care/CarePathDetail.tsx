import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ArrowLeft, CheckCircle, Clock, AlertTriangle, Pill, 
  Activity, Calendar, Video, FlaskConical, ChevronRight,
  Heart, Droplet, Brain, TrendingUp, TrendingDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CareStep {
  id: string;
  title: string;
  description: string;
  type: 'medicine' | 'vital' | 'lab' | 'appointment' | 'lifestyle';
  status: 'completed' | 'pending' | 'upcoming' | 'overdue';
  dueDate?: string;
  completedAt?: string;
}

interface CarePathData {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  startDate: string;
  targetDate: string;
  steps: CareStep[];
  vitals: Array<{ date: string; value: number; type: string }>;
  medicines: Array<{ name: string; dosage: string; frequency: string; adherence: number }>;
}

const pathTypeConfig: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  diabetes: { icon: Droplet, color: 'text-purple-500', gradient: 'from-purple-500 to-violet-600' },
  bp: { icon: Heart, color: 'text-red-500', gradient: 'from-red-500 to-rose-600' },
  cardiac: { icon: Heart, color: 'text-rose-500', gradient: 'from-rose-500 to-pink-600' },
  mental: { icon: Brain, color: 'text-indigo-500', gradient: 'from-indigo-500 to-purple-600' },
};

export default function CarePathDetail() {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pathData, setPathData] = useState<CarePathData | null>(null);
  const [selectedTab, setSelectedTab] = useState('timeline');

  useEffect(() => {
    loadPathData();
  }, [pathId]);

  const loadPathData = async () => {
    // Mock data - in real app, load from database
    setPathData({
      id: pathId || 'diabetes',
      name: 'Diabetes Care Path',
      type: 'diabetes',
      status: 'stable',
      progress: 72,
      startDate: '2025-01-01',
      targetDate: '2025-06-01',
      steps: [
        { id: '1', title: 'Morning Medication', description: 'Take Metformin 500mg', type: 'medicine', status: 'completed', completedAt: 'Today 8:00 AM' },
        { id: '2', title: 'Fasting Sugar Check', description: 'Log fasting blood glucose', type: 'vital', status: 'completed', completedAt: 'Today 7:30 AM' },
        { id: '3', title: 'Post-Lunch Sugar', description: 'Log blood glucose 2 hours after lunch', type: 'vital', status: 'pending', dueDate: 'Today 2:00 PM' },
        { id: '4', title: 'Evening Walk', description: '30 minutes moderate walking', type: 'lifestyle', status: 'upcoming', dueDate: 'Today 6:00 PM' },
        { id: '5', title: 'HbA1c Test', description: 'Quarterly lab test', type: 'lab', status: 'upcoming', dueDate: 'Jan 15, 2026' },
        { id: '6', title: 'Endocrinologist Follow-up', description: 'Monthly check-up', type: 'appointment', status: 'upcoming', dueDate: 'Jan 20, 2026' },
      ],
      vitals: [
        { date: '2025-01-01', value: 145, type: 'fasting_glucose' },
        { date: '2025-01-02', value: 138, type: 'fasting_glucose' },
        { date: '2025-01-03', value: 142, type: 'fasting_glucose' },
        { date: '2025-01-04', value: 135, type: 'fasting_glucose' },
      ],
      medicines: [
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', adherence: 95 },
        { name: 'Glimepiride', dosage: '2mg', frequency: 'Once daily', adherence: 88 },
      ]
    });
    setLoading(false);
  };

  const config = pathTypeConfig[pathData?.type || 'diabetes'];
  const Icon = config?.icon || Activity;

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
      case 'completed': return <Badge className="bg-green-100 text-green-700">✓ Done</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
      default: return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  if (loading || !pathData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className={`bg-gradient-to-br ${config?.gradient || 'from-blue-500 to-indigo-600'} text-white`}>
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
              <h1 className="text-xl font-bold">{pathData.name}</h1>
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
              <span className="font-bold">{pathData.progress}%</span>
            </div>
            <Progress value={pathData.progress} className="h-2 bg-white/20" />
            <div className="flex justify-between mt-2 text-xs text-white/70">
              <span>Started: {pathData.startDate}</span>
              <span>Target: {pathData.targetDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full">
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="vitals" className="flex-1">Vitals</TabsTrigger>
            <TabsTrigger value="medicines" className="flex-1">Medicines</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-3">
            {pathData.steps.map((step, idx) => {
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
                          <Button size="sm">Complete</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>

          <TabsContent value="vitals" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Blood Glucose Trend</CardTitle>
                <CardDescription>Last 7 days fasting readings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {pathData.vitals.map((vital, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ height: 0 }}
                      animate={{ height: `${(vital.value / 200) * 100}%` }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex-1 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-lg relative group"
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {vital.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  {pathData.vitals.map((v, i) => (
                    <span key={i}>{new Date(v.date).getDate()}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medicines" className="mt-4 space-y-3">
            {pathData.medicines.map((medicine, idx) => (
              <motion.div
                key={medicine.name}
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
                          <h4 className="font-medium">{medicine.name}</h4>
                          <p className="text-sm text-muted-foreground">{medicine.dosage} • {medicine.frequency}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{medicine.adherence}%</p>
                        <p className="text-xs text-muted-foreground">Adherence</p>
                      </div>
                    </div>
                    <Progress value={medicine.adherence} className="h-1.5" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
