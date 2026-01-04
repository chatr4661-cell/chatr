import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
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
  Sparkles,
  ArrowLeft,
  Bell,
  Settings,
  Flame,
  AlertTriangle,
  Droplet
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { HealthBottomNav } from '@/components/health/HealthBottomNav';
import { HealthHeroCard } from '@/components/health/HealthHeroCard';
import { HealthQuickAction } from '@/components/health/HealthQuickAction';
import { HealthUrgentBanner } from '@/components/health/HealthUrgentBanner';
import logo from '@/assets/chatr-logo.png';

export default function HealthHub() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
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
      if (!user) {
        setLoading(false);
        return;
      }

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (profile?.username) {
        setUserName(profile.username);
      }

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

  const generateAIInsight = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('ai-health-assistant', {
        body: {
          message: 'Generate a brief personalized health insight for today in 2-3 sentences'
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

  const quickActions = [
    {
      icon: Bot,
      label: 'AI Assistant',
      description: 'Get health advice',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      path: '/ai-assistant'
    },
    {
      icon: Activity,
      label: 'Wellness',
      description: 'Track metrics',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      path: '/wellness',
      badge: healthData.vitals.length || undefined
    },
    {
      icon: TrendingUp,
      label: 'BMI Calculator',
      description: 'Body mass index',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      path: '/bmi-calculator'
    },
    {
      icon: Activity,
      label: 'Nutrition',
      description: 'Track meals',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/nutrition-tracker'
    },
    {
      icon: Brain,
      label: 'Mental Health',
      description: 'Assessments & support',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/mental-health'
    },
    {
      icon: Pill,
      label: 'Medications',
      description: 'Reminders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/medicine-reminders',
      badge: healthData.reminders.length || undefined
    },
    {
      icon: Calendar,
      label: 'Reminders',
      description: 'Appointments',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      path: '/health-reminders'
    },
    {
      icon: Shield,
      label: 'Passport',
      description: 'Health records',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      path: '/health-passport'
    },
    {
      icon: FileText,
      label: 'Lab Reports',
      description: 'View reports',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      path: '/lab-reports',
      badge: healthData.reports.length || undefined
    },
    {
      icon: Heart,
      label: 'Risk Analysis',
      description: 'AI predictions',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      path: '/health-risks'
    },
    {
      icon: Brain,
      label: 'Symptom Checker',
      description: 'AI triage',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      path: '/symptom-checker'
    },
    {
      icon: Sparkles,
      label: 'Teleconsult',
      description: 'Talk to doctor',
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      path: '/teleconsultation'
    },
    {
      icon: AlertTriangle,
      label: 'Drug Interactions',
      description: 'Check safety',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      path: '/medication-interactions'
    },
    {
      icon: Flame,
      label: 'Streaks',
      description: 'Earn rewards',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/health-streaks'
    },
    {
      icon: Droplet,
      label: 'Vitals Log',
      description: 'Track vitals',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      path: '/chronic-vitals'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Health Hub - Complete Health Dashboard | Chatr"
        description="Track your wellness, manage medications, store lab reports, and access AI health insights. Your complete digital health companion."
        keywords="health tracking, wellness, medication reminders, lab reports, health passport, AI health assistant"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Health Hub', url: '/health' }
        ]}
      />
      
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-3 max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="h-9 w-9 rounded-xl"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <img 
                  src={logo} 
                  alt="Chatr" 
                  className="h-6 cursor-pointer" 
                  onClick={() => navigate('/')} 
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/notifications')}
                  className="h-9 w-9 rounded-xl relative"
                >
                  <Bell className="h-5 w-5" />
                  {healthData.reminders.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/settings')}
                  className="h-9 w-9 rounded-xl"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
          {/* Hero Card */}
          <HealthHeroCard 
            healthScore={healthData.healthScore}
            aiInsight={aiInsight}
            userName={userName}
          />

          {/* Urgent Reminders */}
          {urgentReminders.length > 0 && (
            <HealthUrgentBanner reminders={urgentReminders} />
          )}

          {/* Section Title */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-bold text-foreground">Health Services</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-sm h-8"
              onClick={() => navigate('/care')}
            >
              View All
            </Button>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <HealthQuickAction
                key={action.path}
                icon={action.icon}
                label={action.label}
                description={action.description}
                color={action.color}
                bgColor={action.bgColor}
                onClick={() => navigate(action.path)}
                badge={action.badge}
                index={index}
              />
            ))}
          </div>

          {/* Bottom spacing for nav */}
          <div className="h-4" />
        </div>

        {/* Bottom Navigation */}
        <HealthBottomNav />
      </div>
    </>
  );
}
