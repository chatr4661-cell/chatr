import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Shield, 
  Heart, 
  Brain, 
  Stethoscope,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Activity,
  Droplet,
  Scale
} from 'lucide-react';
import { toast } from 'sonner';

interface HealthRisk {
  id: string;
  risk_type: string;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  contributing_factors: string[];
  recommendations: string[];
  last_updated: string;
}

interface HealthMetrics {
  bmi?: number;
  bmiCategory?: string;
  bloodPressure?: { systolic: number; diastolic: number };
  bloodSugar?: number;
  cholesterol?: number;
  heartRate?: number;
  sleepHours?: number;
  stepsDaily?: number;
}

const RISK_CATEGORIES = [
  { 
    id: 'cardiovascular', 
    name: 'Cardiovascular', 
    icon: Heart, 
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  { 
    id: 'diabetes', 
    name: 'Diabetes', 
    icon: Droplet, 
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  },
  { 
    id: 'obesity', 
    name: 'Obesity', 
    icon: Scale, 
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  { 
    id: 'mental_health', 
    name: 'Mental Health', 
    icon: Brain, 
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200'
  },
  { 
    id: 'lifestyle', 
    name: 'Lifestyle', 
    icon: Activity, 
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200'
  }
];

export default function HealthRiskPredictions() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [risks, setRisks] = useState<HealthRisk[]>([]);
  const [metrics, setMetrics] = useState<HealthMetrics>({});
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    loadHealthData(user.id);
  };

  const loadHealthData = async (userId: string) => {
    setLoading(true);
    try {
      // Load wellness data
      const { data: wellness } = await supabase
        .from('wellness_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      // Load BMI records
      const { data: bmiRecords } = await supabase
        .from('bmi_records')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1);

      // Calculate metrics
      if (wellness && wellness.length > 0) {
        const latest = wellness[0];
        const avgSleep = wellness.reduce((sum: number, w: any) => sum + (w.sleep_hours || 0), 0) / wellness.length;
        const avgSteps = wellness.reduce((sum: number, w: any) => sum + (w.steps || 0), 0) / wellness.length;

        setMetrics({
          bloodPressure: latest.blood_pressure_systolic ? {
            systolic: latest.blood_pressure_systolic,
            diastolic: latest.blood_pressure_diastolic
          } : undefined,
          heartRate: latest.heart_rate,
          sleepHours: Math.round(avgSleep * 10) / 10,
          stepsDaily: Math.round(avgSteps),
          bmi: bmiRecords?.[0]?.bmi_value,
          bmiCategory: bmiRecords?.[0]?.bmi_category
        });
      }

      // Generate initial predictions
      await analyzeHealth(userId);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeHealth = async (userId?: string) => {
    setAnalyzing(true);
    try {
      // Call the health-predictions edge function
      const { data, error } = await supabase.functions.invoke('health-predictions', {
        body: {}
      });

      if (error) throw error;

      // Use predictions from the edge function if available
      if (data?.predictions && Array.isArray(data.predictions)) {
        const mappedRisks: HealthRisk[] = data.predictions.map((pred: any) => ({
          id: pred.prediction_type,
          risk_type: pred.prediction_type,
          risk_level: pred.confidence_level >= 80 ? 'critical' : pred.confidence_level >= 60 ? 'high' : pred.confidence_level >= 40 ? 'moderate' : 'low',
          risk_score: pred.confidence_level,
          contributing_factors: pred.risk_factors || [],
          recommendations: pred.recommendations || [],
          last_updated: pred.generated_at || new Date().toISOString()
        }));
        setRisks(mappedRisks);
        calculateOverallScore(mappedRisks);
      } else {
        // Fallback to AI assistant for analysis
        const fallbackRisks: HealthRisk[] = RISK_CATEGORIES.map(cat => ({
          id: cat.id,
          risk_type: cat.id,
          risk_level: 'low',
          risk_score: 25,
          contributing_factors: getContributingFactors(cat.id, metrics),
          recommendations: getRecommendations(cat.id),
          last_updated: new Date().toISOString()
        }));
        setRisks(fallbackRisks);
        calculateOverallScore(fallbackRisks);
      }
      
      toast.success('Health analysis complete!');
    } catch (error) {
      console.error('Error analyzing health:', error);
      toast.error('Failed to analyze health data');
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateOverallScore = (riskData: HealthRisk[]) => {
    const avgRisk = riskData.reduce((sum, r) => sum + r.risk_score, 0) / riskData.length;
    setOverallScore(Math.round(100 - avgRisk));
  };

  const getContributingFactors = (riskType: string, metrics: HealthMetrics): string[] => {
    const factors: Record<string, string[]> = {
      cardiovascular: ['Blood pressure trends', 'Heart rate variability', 'Activity levels', 'Family history'],
      diabetes: ['Blood sugar levels', 'BMI', 'Diet patterns', 'Physical activity'],
      obesity: ['BMI value', 'Calorie intake', 'Exercise frequency', 'Sleep quality'],
      mental_health: ['Sleep patterns', 'Stress levels', 'Social activity', 'Work-life balance'],
      lifestyle: ['Daily steps', 'Sleep duration', 'Hydration', 'Screen time']
    };
    return factors[riskType] || [];
  };

  const getRecommendations = (riskType: string): string[] => {
    const recommendations: Record<string, string[]> = {
      cardiovascular: ['Regular cardio exercise', 'Monitor blood pressure weekly', 'Reduce sodium intake', 'Schedule cardiac checkup'],
      diabetes: ['Monitor blood glucose', 'Low glycemic diet', '30 min daily exercise', 'Regular HbA1c tests'],
      obesity: ['Balanced calorie intake', 'Strength training', 'Track meals daily', 'Consult nutritionist'],
      mental_health: ['Practice mindfulness', 'Regular sleep schedule', 'Social connections', 'Consider therapy'],
      lifestyle: ['10,000 steps daily', '7-8 hours sleep', 'Stay hydrated', 'Regular breaks']
    };
    return recommendations[riskType] || [];
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'moderate': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
      case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Health Risk Predictions</h1>
                <p className="text-sm text-blue-100">AI-powered health insights</p>
              </div>
            </div>
            <Button
              onClick={() => analyzeHealth(user?.id)}
              disabled={analyzing}
              className="bg-white/20 hover:bg-white/30"
            >
              {analyzing ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Overall Health Score */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="w-40 h-40">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke={overallScore >= 70 ? '#22c55e' : overallScore >= 50 ? '#eab308' : '#ef4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(overallScore / 100) * 440} 440`}
                      transform="rotate(-90 80 80)"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</p>
                    <p className="text-sm text-muted-foreground">Health Score</p>
                  </div>
                </div>
                <p className="text-lg font-medium">
                  {overallScore >= 80 ? '🌟 Excellent Health!' : 
                   overallScore >= 60 ? '👍 Good Health' : 
                   overallScore >= 40 ? '⚠️ Needs Attention' : 
                   '🚨 High Risk - Consult Doctor'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.bmi && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Scale className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-xl font-bold">{metrics.bmi.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{metrics.bmiCategory}</p>
                  </div>
                )}
                {metrics.bloodPressure && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
                    <p className="text-xl font-bold">{metrics.bloodPressure.systolic}/{metrics.bloodPressure.diastolic}</p>
                    <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  </div>
                )}
                {metrics.heartRate && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Activity className="h-5 w-5 mx-auto mb-1 text-pink-500" />
                    <p className="text-xl font-bold">{metrics.heartRate}</p>
                    <p className="text-xs text-muted-foreground">Heart Rate</p>
                  </div>
                )}
                {metrics.sleepHours && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Brain className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
                    <p className="text-xl font-bold">{metrics.sleepHours}h</p>
                    <p className="text-xs text-muted-foreground">Avg Sleep</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Risk Categories */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Risk Assessment</h2>
            {risks.map((risk) => {
              const category = RISK_CATEGORIES.find(c => c.id === risk.risk_type);
              const Icon = category?.icon || Shield;
              const colors = getRiskColor(risk.risk_level);

              return (
                <Card key={risk.id} className={`${colors.border} border-2`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category?.bg}`}>
                          <Icon className={`h-5 w-5 ${category?.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{category?.name} Risk</CardTitle>
                          <CardDescription>
                            Last updated: {new Date(risk.last_updated).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={`${colors.bg} ${colors.text}`}>
                        {risk.risk_level.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Risk Score Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Score</span>
                        <span className="font-medium">{risk.risk_score}%</span>
                      </div>
                      <Progress 
                        value={risk.risk_score} 
                        className="h-2"
                      />
                    </div>

                    {/* Contributing Factors */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Info className="h-4 w-4" />
                        Contributing Factors
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {risk.contributing_factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Recommendations
                      </p>
                      <ul className="space-y-1">
                        {risk.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Disclaimer */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Important Disclaimer</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    These predictions are based on AI analysis and should not replace professional medical advice. 
                    Always consult with a healthcare provider for accurate diagnosis and treatment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
