import { useState } from 'react';
import { Activity, Heart, Droplet, Footprints, Brain, Send, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ChatrWorldHealthHub() {
  const [symptoms, setSymptoms] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState(0);
  const [water, setWater] = useState(0);

  const healthTips = [
    { icon: Footprints, title: 'Daily Steps', value: steps, target: 10000, unit: 'steps', color: 'from-green-500 to-emerald-500' },
    { icon: Droplet, title: 'Water Intake', value: water, target: 8, unit: 'glasses', color: 'from-blue-500 to-cyan-500' },
    { icon: Heart, title: 'Heart Rate', value: 72, target: 100, unit: 'bpm', color: 'from-red-500 to-pink-500' },
    { icon: Activity, title: 'Calories', value: 1800, target: 2500, unit: 'kcal', color: 'from-orange-500 to-amber-500' },
  ];

  const handleSymptomCheck = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    setLoading(true);
    setAiResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('chatr-world-ai', {
        body: {
          type: 'symptom_check',
          data: { symptoms }
        }
      });

      if (error) throw error;
      setAiResponse(data.result || '');
    } catch (error) {
      console.error('Symptom check error:', error);
      toast.error('Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  const quickTips = [
    'Drink at least 8 glasses of water daily',
    'Take a 5-minute break every hour from screens',
    'Practice deep breathing for stress relief',
    'Get 7-8 hours of sleep for optimal health',
    'Include fruits and vegetables in every meal',
  ];

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {healthTips.map((tip, index) => {
          const Icon = tip.icon;
          const percentage = Math.min((tip.value / tip.target) * 100, 100);
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${tip.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-bold">{tip.value.toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{tip.title}</p>
                <Progress value={percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {tip.value} / {tip.target.toLocaleString()} {tip.unit}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Steps Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Footprints className="h-5 w-5 text-green-500" />
              Log Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter steps"
                value={steps || ''}
                onChange={(e) => setSteps(parseInt(e.target.value) || 0)}
              />
              <Button onClick={() => toast.success('Steps logged!')}>Log</Button>
            </div>
          </CardContent>
        </Card>

        {/* Water Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplet className="h-5 w-5 text-blue-500" />
              Water Intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map(n => (
                <Button
                  key={n}
                  variant={water >= n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWater(n)}
                >
                  {n} 🥤
                </Button>
              ))}
              {[5, 6, 7, 8].map(n => (
                <Button
                  key={n}
                  variant={water >= n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWater(n)}
                >
                  {n} 🥤
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Symptom Checker */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Symptom Checker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This is not a substitute for professional medical advice. Always consult a healthcare provider.
            </p>
          </div>

          <Textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe your symptoms in detail... e.g., 'I have a headache and mild fever since yesterday'"
            rows={3}
          />

          <Button
            onClick={handleSymptomCheck}
            disabled={loading || !symptoms.trim()}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Analyze Symptoms
          </Button>

          {aiResponse && (
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Brain className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium mb-2">AI Health Assistant</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiResponse}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Wellness Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quickTips.map((tip, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {index + 1}
                </div>
                <p className="text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}