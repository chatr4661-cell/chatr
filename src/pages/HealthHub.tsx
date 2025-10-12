import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Activity, 
  Pill, 
  Shield, 
  FileText,
  Heart,
  TrendingUp,
  Brain,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/chatr-logo.png';

export default function HealthHub() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>({
    vitals: [],
    reminders: [],
    reports: [],
    healthScore: 0
  });
  const [aiInsight, setAiInsight] = useState('');

  useEffect(() => {
    loadHealthData();
    generateAIInsight();
  }, []);

  const loadHealthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load medication reminders
      const { data: reminders } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Load lab reports
      const { data: reports } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
        .limit(5);

      // Calculate health score based on available data
      const score = 75 + (reminders?.length || 0) * 2 + (reports?.length || 0) * 3;

      setHealthData({
        vitals: [],
        reminders: reminders || [],
        reports: reports || [],
        healthScore: Math.min(100, score)
      });
    } catch (error) {
      console.error('Error loading health data:', error);
      toast('Could not load health data');
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (data: any) => {
    return 75; // Base score
  };

  const generateAIInsight = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('ai-health-assistant', {
        body: {
          prompt: 'Generate a brief personalized health insight for today in 2-3 sentences',
          userId: user.id
        }
      });

      if (!error && data?.response) {
        setAiInsight(data.response);
      }
    } catch (error) {
      console.log('AI insight unavailable');
    }
  };

  const urgentReminders = healthData.reminders.filter((r: any) => {
    const now = new Date();
    const slots = r.time_slots || [];
    return slots.some((slot: string) => {
      const [hour] = slot.split(':');
      return Math.abs(now.getHours() - parseInt(hour)) <= 1;
    });
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Chatr" className="h-8" onClick={() => navigate('/')} />
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/')}>
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Health Hub</h1>
          <p className="text-emerald-50">Your complete health dashboard</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Health Score & AI Insight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" />
                Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-emerald-600 mb-2">
                {healthData.healthScore}
              </div>
              <Progress value={healthData.healthScore} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                {healthData.healthScore >= 80 ? 'Excellent! Keep it up!' :
                 healthData.healthScore >= 60 ? 'Good! Room for improvement' :
                 'Focus on wellness activities'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                AI Health Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {aiInsight || 'Stay active, stay hydrated, and get quality sleep for optimal health!'}
              </p>
              <Button 
                size="sm" 
                className="mt-3 bg-blue-600"
                onClick={() => navigate('/ai-assistant')}
              >
                Ask AI Assistant
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Reminders */}
        {urgentReminders.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5" />
                Upcoming Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {urgentReminders.map((reminder: any) => (
                <div key={reminder.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="font-medium">{reminder.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">{reminder.dosage}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-orange-700">Due Soon</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="passport">Passport</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/ai-assistant')}>
                <CardHeader>
                  <Bot className="w-8 h-8 text-teal-600 mb-2" />
                  <CardTitle>AI Health Assistant</CardTitle>
                  <CardDescription>Get personalized health advice</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/wellness')}>
                <CardHeader>
                  <Activity className="w-8 h-8 text-pink-600 mb-2" />
                  <CardTitle>Wellness Tracking</CardTitle>
                  <CardDescription>{healthData.vitals.length} entries this week</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/medicine-reminders')}>
                <CardHeader>
                  <Pill className="w-8 h-8 text-orange-600 mb-2" />
                  <CardTitle>Medications</CardTitle>
                  <CardDescription>{healthData.reminders.length} active reminders</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/health-passport')}>
                <CardHeader>
                  <Shield className="w-8 h-8 text-emerald-600 mb-2" />
                  <CardTitle>Health Passport</CardTitle>
                  <CardDescription>Digital health ID & records</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/lab-reports')}>
                <CardHeader>
                  <FileText className="w-8 h-8 text-cyan-600 mb-2" />
                  <CardTitle>Lab Reports</CardTitle>
                  <CardDescription>{healthData.reports.length} reports available</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <Brain className="w-8 h-8 text-purple-600 mb-2" />
                  <CardTitle>Symptom Checker</CardTitle>
                  <CardDescription className="text-purple-700">AI-powered triage (New!)</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle>Wellness Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Track your daily wellness metrics</p>
                  <Button className="mt-3" onClick={() => navigate('/wellness')}>
                    Go to Wellness Tracking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <CardTitle>Medication Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                {healthData.reminders.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.reminders.map((reminder: any) => (
                      <div key={reminder.id} className="p-3 border rounded">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{reminder.medicine_name}</p>
                            <p className="text-sm text-muted-foreground">{reminder.dosage}</p>
                          </div>
                          <Badge>{reminder.frequency}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {reminder.time_slots?.map((time: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No medication reminders set</p>
                    <Button className="mt-3" onClick={() => navigate('/medicine-reminders')}>
                      Add Reminder
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Lab Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {healthData.reports.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.reports.map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-3 border rounded hover:bg-accent cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-cyan-600" />
                          <div>
                            <p className="font-medium">{report.report_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.test_date ? new Date(report.test_date).toLocaleDateString() : 'No date'}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">View</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No lab reports uploaded</p>
                    <Button className="mt-3" onClick={() => navigate('/lab-reports')}>
                      Upload Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="passport">
            <Card>
              <CardHeader>
                <CardTitle>Health Passport</CardTitle>
                <CardDescription>Your digital health identity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => navigate('/health-passport')}>
                    <Shield className="w-4 h-4 mr-2" />
                    View Full Health Passport
                  </Button>
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="p-3 border rounded text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {healthData.vitals.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Vital Records</p>
                    </div>
                    <div className="p-3 border rounded text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {healthData.reports.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Lab Reports</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
