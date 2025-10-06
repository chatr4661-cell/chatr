import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Pill, Plus, Trash2, Bell, Clock, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface Medication {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  time_slots: string[];
  start_date: string;
  end_date: string | null;
  notes: string;
  is_active: boolean;
}

export default function MedicineReminders() {
  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'daily',
    time_slots: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading medications',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const timeSlots = formData.time_slots.split(',').map(t => t.trim());

      const { error } = await supabase
        .from('medication_reminders')
        .insert({
          user_id: user.id,
          medicine_name: formData.medicine_name,
          dosage: formData.dosage,
          frequency: formData.frequency,
          time_slots: timeSlots,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          notes: formData.notes,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Medication reminder added',
      });

      setFormData({
        medicine_name: '',
        dosage: '',
        frequency: 'daily',
        time_slots: '',
        start_date: '',
        end_date: '',
        notes: '',
      });
      setDialogOpen(false);
      loadMedications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('medication_reminders')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Reminder ${!currentStatus ? 'activated' : 'paused'}`,
      });

      loadMedications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medication_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Medication reminder deleted',
      });

      loadMedications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto space-y-4 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Pill className="w-8 h-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Medicine Reminders
              </h1>
            </div>
            <p className="text-lg text-muted-foreground font-medium">
              Because your health deserves perfect timing.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Never miss a dose again — we'll gently remind you exactly when it's time for your medication.
              Stay consistent, stay healthy, and let us handle the remembering.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Stats Cards */}
        {medications.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Reminders</p>
                    <p className="text-3xl font-bold text-primary">
                      {medications.filter(m => m.is_active).length}
                    </p>
                  </div>
                  <Bell className="w-10 h-10 text-primary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Medications</p>
                    <p className="text-3xl font-bold text-primary">{medications.length}</p>
                  </div>
                  <Pill className="w-10 h-10 text-primary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Daily Doses</p>
                    <p className="text-3xl font-bold text-primary">
                      {medications.reduce((sum, m) => sum + (m.is_active ? m.time_slots.length : 0), 0)}
                    </p>
                  </div>
                  <Clock className="w-10 h-10 text-primary/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Button */}
        <div className="flex justify-center mb-8">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg hover-scale">
                <Plus className="w-5 h-5" />
                Add Reminder
                <Sparkles className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Medication Reminder</DialogTitle>
              <DialogDescription>Set up a new medication schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="medicine-name">Medicine Name</Label>
                <Input
                  id="medicine-name"
                  value={formData.medicine_name}
                  onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                  placeholder="e.g., Aspirin"
                />
              </div>

              <div>
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g., 100mg"
                />
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice-daily">Twice Daily</SelectItem>
                    <SelectItem value="three-times-daily">Three Times Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="as-needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time-slots">Time Slots (comma-separated)</Label>
                <Input
                  id="time-slots"
                  value={formData.time_slots}
                  onChange={(e) => setFormData({ ...formData, time_slots: e.target.value })}
                  placeholder="e.g., 08:00, 14:00, 20:00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g., Take with food"
                />
              </div>

              <Button onClick={handleAdd} className="w-full">
                Add Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        {loading ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-medium">Loading medications...</p>
            </div>
          </div>
        ) : medications.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background animate-fade-in">
            <CardContent className="text-center py-16">
              <div className="max-w-md mx-auto space-y-4">
                <div className="relative inline-block">
                  <Pill className="w-16 h-16 text-primary/30" />
                  <Sparkles className="w-6 h-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">No reminders yet.</h3>
                  <p className="text-muted-foreground">
                    ✨ Start by adding your first medication reminder — and let us take care of the rest.
                  </p>
                </div>
                <p className="text-sm text-primary font-medium italic">
                  Set it once. Stay on track always.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
            {medications.map((med, index) => (
              <Card 
                key={med.id} 
                className={`group hover-scale transition-all duration-300 border-primary/20 ${
                  !med.is_active ? 'opacity-60 grayscale' : 'shadow-lg hover:shadow-xl'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${med.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Pill className={`w-5 h-5 ${med.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span>{med.medicine_name}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-base">
                        <Badge variant="outline" className="font-medium">
                          {med.dosage}
                        </Badge>
                        <span>•</span>
                        <span className="capitalize">{med.frequency.replace('-', ' ')}</span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Switch
                        checked={med.is_active}
                        onCheckedChange={() => handleToggle(med.id, med.is_active)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {med.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Time Slots */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Daily Schedule</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {med.time_slots.map((time, index) => (
                        <Badge 
                          key={index} 
                          className={`px-3 py-1 ${
                            med.is_active 
                              ? 'bg-primary/10 text-primary border-primary/20' 
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Started:</span>
                      <span className="text-muted-foreground">
                        {format(new Date(med.start_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {med.end_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Ends:</span>
                        <span className="text-muted-foreground">
                          {format(new Date(med.end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {med.notes && (
                    <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <AlertCircle className="w-4 h-4" />
                        <span>Important Notes</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {med.notes}
                      </p>
                    </div>
                  )}

                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(med.id)}
                    className="w-full gap-2 mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Reminder
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}