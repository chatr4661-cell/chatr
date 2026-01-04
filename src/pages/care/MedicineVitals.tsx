import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Droplet, Heart, Activity, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';
import { VitalsChart } from '@/components/care/VitalsChart';

interface VitalReading {
  id: string;
  vital_type: string;
  value: number;
  unit: string | null;
  reading_time: string | null;
  notes: string | null;
  recorded_at: string;
}

const vitalTypes = [
  { id: 'blood_sugar_fasting', name: 'Blood Sugar (Fasting)', unit: 'mg/dL', icon: Droplet, color: 'text-blue-500', normal: { min: 70, max: 100 } },
  { id: 'blood_sugar_pp', name: 'Blood Sugar (PP)', unit: 'mg/dL', icon: Droplet, color: 'text-blue-500', normal: { min: 70, max: 140 } },
  { id: 'bp_systolic', name: 'BP Systolic', unit: 'mmHg', icon: Heart, color: 'text-red-500', normal: { min: 90, max: 120 } },
  { id: 'bp_diastolic', name: 'BP Diastolic', unit: 'mmHg', icon: Heart, color: 'text-red-500', normal: { min: 60, max: 80 } },
  { id: 'weight', name: 'Weight', unit: 'kg', icon: Scale, color: 'text-green-500', normal: { min: 0, max: 200 } },
  { id: 'tsh', name: 'TSH', unit: 'mIU/L', icon: Activity, color: 'text-purple-500', normal: { min: 0.4, max: 4.0 } },
];

const MedicineVitals = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member');
  
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('blood_sugar');
  const [newReading, setNewReading] = useState({
    vital_type: 'blood_sugar_fasting',
    value: '',
    reading_time: 'fasting',
    notes: ''
  });

  useEffect(() => {
    loadReadings();
  }, []);

  const loadReadings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('chronic_vitals')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (memberId) {
        query = query.eq('family_member_id', memberId);
      } else {
        query = query.is('family_member_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error('Error loading vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addReading = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const vitalConfig = vitalTypes.find(v => v.id === newReading.vital_type);
      
      const { error } = await supabase
        .from('chronic_vitals')
        .insert({
          user_id: user.id,
          family_member_id: memberId || null,
          vital_type: newReading.vital_type,
          value: parseFloat(newReading.value),
          unit: vitalConfig?.unit,
          reading_time: newReading.reading_time,
          notes: newReading.notes || null
        });

      if (error) throw error;
      
      toast.success('Vital recorded');
      setShowAddDialog(false);
      setNewReading({ vital_type: 'blood_sugar_fasting', value: '', reading_time: 'fasting', notes: '' });
      loadReadings();
    } catch (error) {
      console.error('Error adding vital:', error);
      toast.error('Failed to record vital');
    }
  };

  const getVitalStatus = (type: string, value: number) => {
    const config = vitalTypes.find(v => v.id === type);
    if (!config) return 'normal';
    
    if (value < config.normal.min) return 'low';
    if (value > config.normal.max) return 'high';
    return 'normal';
  };

  const getLatestReading = (type: string) => {
    return readings.find(r => r.vital_type === type);
  };

  const getReadingsByType = (typePrefix: string) => {
    return readings.filter(r => r.vital_type.startsWith(typePrefix));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
      <MedicineHeroHeader
        title="Track Vitals"
        subtitle="Monitor your health metrics"
        gradient="vitals"
        rightAction={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-white/20 text-white hover:bg-white/30">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Vital</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Vital Type</Label>
                  <Select
                    value={newReading.vital_type}
                    onValueChange={(value) => setNewReading({ ...newReading, vital_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vitalTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={newReading.value}
                    onChange={(e) => setNewReading({ ...newReading, value: e.target.value })}
                    placeholder={`Enter ${vitalTypes.find(v => v.id === newReading.vital_type)?.unit || ''}`}
                  />
                </div>
                <div>
                  <Label>Reading Time</Label>
                  <Select
                    value={newReading.reading_time}
                    onValueChange={(value) => setNewReading({ ...newReading, reading_time: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fasting">Fasting</SelectItem>
                      <SelectItem value="post_meal">Post Meal</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (Optional)</Label>
                  <Input
                    value={newReading.notes}
                    onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
                    placeholder="Any additional notes"
                  />
                </div>
                <Button className="w-full" onClick={addReading}>
                  Save Reading
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: 'blood_sugar_fasting', label: 'Blood Sugar' },
            { type: 'bp_systolic', label: 'Blood Pressure' },
            { type: 'weight', label: 'Weight' },
            { type: 'tsh', label: 'TSH' }
          ].map(({ type, label }, idx) => {
            const reading = getLatestReading(type);
            const config = vitalTypes.find(v => v.id === type);
            const status = reading ? getVitalStatus(type, reading.value) : null;
            const Icon = config?.icon || Activity;

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${config?.color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {reading ? (
                    <>
                      <p className="text-2xl font-bold">
                        {reading.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          {config?.unit}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {status === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            High
                          </Badge>
                        )}
                        {status === 'low' && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Low
                          </Badge>
                        )}
                        {status === 'normal' && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            <Minus className="h-3 w-3 mr-1" />
                            Normal
                          </Badge>
                        )}
                      </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(reading.recorded_at), 'dd MMM, h:mm a')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No readings yet</p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          );
          })}
        </div>

        {/* History Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full">
            <TabsTrigger value="blood_sugar" className="flex-1">Sugar</TabsTrigger>
            <TabsTrigger value="bp" className="flex-1">BP</TabsTrigger>
            <TabsTrigger value="weight" className="flex-1">Weight</TabsTrigger>
            <TabsTrigger value="tsh" className="flex-1">TSH</TabsTrigger>
          </TabsList>

          <TabsContent value="blood_sugar" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Blood Sugar History</CardTitle>
              </CardHeader>
              <CardContent>
                {getReadingsByType('blood_sugar').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No readings yet</p>
                ) : (
                  <div className="space-y-3">
                    {getReadingsByType('blood_sugar').slice(0, 10).map((reading) => (
                      <div key={reading.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{reading.value} {reading.unit}</p>
                          <p className="text-xs text-muted-foreground">
                            {reading.reading_time === 'fasting' ? 'Fasting' : 'Post Meal'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={getVitalStatus(reading.vital_type, reading.value) === 'normal' ? 'secondary' : 'destructive'} className="text-xs">
                            {getVitalStatus(reading.vital_type, reading.value)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(reading.recorded_at), 'dd MMM, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bp" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Blood Pressure History</CardTitle>
              </CardHeader>
              <CardContent>
                {getReadingsByType('bp').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No readings yet</p>
                ) : (
                  <div className="space-y-3">
                    {getReadingsByType('bp').slice(0, 10).map((reading) => (
                      <div key={reading.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{reading.value} {reading.unit}</p>
                          <p className="text-xs text-muted-foreground">
                            {reading.vital_type === 'bp_systolic' ? 'Systolic' : 'Diastolic'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reading.recorded_at), 'dd MMM, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weight" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weight History</CardTitle>
              </CardHeader>
              <CardContent>
                {getReadingsByType('weight').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No readings yet</p>
                ) : (
                  <div className="space-y-3">
                    {getReadingsByType('weight').slice(0, 10).map((reading) => (
                      <div key={reading.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <p className="font-medium">{reading.value} {reading.unit}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reading.recorded_at), 'dd MMM, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tsh" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">TSH History</CardTitle>
              </CardHeader>
              <CardContent>
                {getReadingsByType('tsh').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No readings yet</p>
                ) : (
                  <div className="space-y-3">
                    {getReadingsByType('tsh').slice(0, 10).map((reading) => (
                      <div key={reading.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <p className="font-medium">{reading.value} {reading.unit}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reading.recorded_at), 'dd MMM, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Charts */}
        <VitalsChart 
          vitalType="blood_sugar_fasting" 
          title="Blood Sugar Trend" 
          unit="mg/dL" 
          normalRange={{ min: 70, max: 100 }}
          color="#3b82f6"
        />
        
        <VitalsChart 
          vitalType="bp_systolic" 
          title="Blood Pressure Trend" 
          unit="mmHg" 
          normalRange={{ min: 90, max: 120 }}
          color="#ef4444"
        />
      </div>
      
      <MedicineBottomNav />
    </div>
  );
};

export default MedicineVitals;
