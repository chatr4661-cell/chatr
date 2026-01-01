import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Scale, Ruler, Activity, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface BMIRecord {
  id: string;
  weight_kg: number;
  height_cm: number;
  bmi_value: number;
  bmi_category: string;
  waist_cm?: number;
  body_fat_percent?: number;
  recorded_at: string;
}

interface BMIResult {
  bmi: number;
  category: string;
  healthRisks: string[];
  recommendations: string[];
  idealWeightRange: { min: number; max: number };
}

const BMI_CATEGORIES = {
  underweight: { color: 'text-blue-600', bg: 'bg-blue-100', icon: AlertTriangle },
  normal: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  overweight: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle },
  obese: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle }
};

export default function BMICalculator() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BMIRecord[]>([]);
  const [result, setResult] = useState<BMIResult | null>(null);
  
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    waist: '',
    bodyFat: ''
  });

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
    loadHistory(user.id);
  };

  const loadHistory = async (userId: string) => {
    const { data } = await supabase
      .from('bmi_records')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(10);
    
    if (data) setHistory(data as BMIRecord[]);
  };

  const calculateBMI = async () => {
    if (!formData.weight || !formData.height) {
      toast.error('Please enter weight and height');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('health-bmi-calculator', {
        body: {
          action: 'calculate',
          weight_kg: parseFloat(formData.weight),
          height_cm: parseFloat(formData.height),
          waist_cm: formData.waist ? parseFloat(formData.waist) : undefined,
          body_fat_percent: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined
        }
      });

      if (error) throw error;

      setResult(data);
      toast.success('BMI calculated successfully!');
      
      // Reload history
      if (user) loadHistory(user.id);
    } catch (error: any) {
      console.error('Error calculating BMI:', error);
      toast.error('Failed to calculate BMI');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryStyle = (category: string) => {
    const cat = category.toLowerCase().replace(' ', '') as keyof typeof BMI_CATEGORIES;
    return BMI_CATEGORIES[cat] || BMI_CATEGORIES.normal;
  };

  const getBMIProgress = (bmi: number) => {
    // BMI scale: 15-40 mapped to 0-100%
    return Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
              <h1 className="text-xl font-bold">BMI Calculator</h1>
              <p className="text-sm text-teal-100">Track your body mass index</p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Calculator Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-teal-600" />
                Calculate Your BMI
              </CardTitle>
              <CardDescription>
                Enter your measurements to calculate your Body Mass Index
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg) *</Label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm) *</Label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder="170"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waist">Waist (cm) - Optional</Label>
                  <Input
                    id="waist"
                    type="number"
                    step="0.1"
                    placeholder="80"
                    value={formData.waist}
                    onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bodyFat">Body Fat % - Optional</Label>
                  <Input
                    id="bodyFat"
                    type="number"
                    step="0.1"
                    placeholder="20"
                    value={formData.bodyFat}
                    onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                onClick={calculateBMI} 
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {loading ? 'Calculating...' : 'Calculate BMI'}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className="border-2 border-teal-200">
              <CardHeader>
                <CardTitle>Your Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BMI Score */}
                <div className="text-center">
                  <div className="text-6xl font-bold text-teal-600 mb-2">
                    {result.bmi.toFixed(1)}
                  </div>
                  <Badge className={`${getCategoryStyle(result.category).bg} ${getCategoryStyle(result.category).color} text-lg px-4 py-1`}>
                    {result.category}
                  </Badge>
                </div>

                {/* BMI Scale */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>15</span>
                    <span>18.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>40</span>
                  </div>
                  <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-500">
                    <div 
                      className="absolute top-0 w-3 h-4 bg-black rounded-full border-2 border-white"
                      style={{ left: `calc(${getBMIProgress(result.bmi)}% - 6px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Underweight</span>
                    <span>Normal</span>
                    <span>Overweight</span>
                    <span>Obese</span>
                  </div>
                </div>

                {/* Ideal Weight Range */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Ideal Weight Range</p>
                  <p className="text-xl font-semibold">
                    {result.idealWeightRange.min.toFixed(1)} - {result.idealWeightRange.max.toFixed(1)} kg
                  </p>
                </div>

                {/* Health Risks */}
                {result.healthRisks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Health Risks
                    </h4>
                    <ul className="space-y-1">
                      {result.healthRisks.map((risk, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-orange-500">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  BMI History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((record) => (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{record.bmi_value.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.recorded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getCategoryStyle(record.bmi_category).bg}>
                          {record.bmi_category}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {record.weight_kg}kg • {record.height_cm}cm
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* BMI Categories Info */}
          <Card>
            <CardHeader>
              <CardTitle>BMI Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-700">Underweight</p>
                  <p className="text-sm text-blue-600">&lt; 18.5</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-700">Normal</p>
                  <p className="text-sm text-green-600">18.5 - 24.9</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-yellow-700">Overweight</p>
                  <p className="text-sm text-yellow-600">25 - 29.9</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="font-medium text-red-700">Obese</p>
                  <p className="text-sm text-red-600">≥ 30</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
