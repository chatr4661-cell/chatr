import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  Droplet,
  Activity,
  Thermometer,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VitalReading {
  id: string;
  vital_type: string;
  value: number;
  unit: string;
  notes: string | null;
  recorded_at: string;
}

const VITAL_TYPES = [
  { id: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', icon: Heart, color: 'text-red-400', bg: 'bg-red-50' },
  { id: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplet, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Activity, color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'temperature', label: 'Temperature', unit: '°F', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'weight', label: 'Weight', unit: 'kg', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
];

export default function ChronicVitalsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVitals();
  }, []);

  const loadVitals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('chronic_vitals')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (data) {
        setVitals(data);
      }
    } catch (error) {
      console.error('Error loading vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveVital = async () => {
    if (!selectedType || !value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const vitalConfig = VITAL_TYPES.find(v => v.id === selectedType);

      const { error } = await supabase
        .from('chronic_vitals')
        .insert({
          user_id: user.id,
          vital_type: selectedType,
          value: parseFloat(value),
          unit: vitalConfig?.unit || '',
          notes: notes || null
        });

      if (error) throw error;

      toast.success('Vital recorded successfully!');
      setDialogOpen(false);
      setValue('');
      setNotes('');
      setSelectedType('');
      loadVitals();
    } catch (error) {
      console.error('Error saving vital:', error);
      toast.error('Failed to save vital');
    } finally {
      setSaving(false);
    }
  };

  const getLatestByType = (type: string) => {
    return vitals.find(v => v.vital_type === type);
  };

  const getTrend = (type: string) => {
    const readings = vitals.filter(v => v.vital_type === type).slice(0, 5);
    if (readings.length < 2) return 'stable';
    const latest = readings[0].value;
    const previous = readings[1].value;
    if (latest > previous * 1.05) return 'up';
    if (latest < previous * 0.95) return 'down';
    return 'stable';
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
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white">
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
                <h1 className="text-xl font-bold">Chronic Vitals Log</h1>
                <p className="text-sm text-white/80">Track your health vitals daily</p>
              </div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-white/20 hover:bg-white/30">
                  <Plus className="h-4 w-4 mr-1" />
                  Log Vital
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log New Vital Reading</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Vital Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vital type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VITAL_TYPES.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label} ({type.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      type="number"
                      placeholder="Enter value"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input
                      placeholder="Any additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={saveVital}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Reading'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Quick Stats */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Latest Readings</h2>
            <div className="grid grid-cols-2 gap-3">
              {VITAL_TYPES.map((type, idx) => {
                const latest = getLatestByType(type.id);
                const trend = getTrend(type.id);
                const Icon = type.icon;

                return (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={`${type.bg} border-0`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          <span className="text-xs font-medium truncate">{type.label}</span>
                        </div>
                        {latest ? (
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl font-bold">{latest.value}</p>
                              <p className="text-xs text-muted-foreground">{type.unit}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                              {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                              {trend === 'stable' && <Activity className="h-4 w-4 text-blue-500" />}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No data</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Recent History */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Recent History
            </h2>

            {vitals.length > 0 ? (
              <div className="space-y-2">
                {vitals.slice(0, 20).map((vital, idx) => {
                  const config = VITAL_TYPES.find(t => t.id === vital.vital_type);
                  const Icon = config?.icon || Activity;

                  return (
                    <motion.div
                      key={vital.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <Card>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${config?.bg || 'bg-muted'} flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${config?.color || 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="font-medium">
                                {vital.value} {vital.unit}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {config?.label || vital.vital_type}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(vital.recorded_at), 'MMM d')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(vital.recorded_at), 'h:mm a')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium">No Vitals Recorded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start logging your vitals to track your health over time
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log First Vital
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* View Charts */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/care/medicines/vitals')}
          >
            View Detailed Charts
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
