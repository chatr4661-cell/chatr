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
import { Pill, Plus, Trash2, Bell, Clock } from 'lucide-react';
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
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Medicine Reminders</h1>
          <p className="text-muted-foreground">Never miss your medication schedule</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading medications...</p>
        </div>
      ) : medications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Pill className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No medication reminders set up yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {medications.map((med) => (
            <Card key={med.id} className={!med.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="w-5 h-5 text-primary" />
                      {med.medicine_name}
                    </CardTitle>
                    <CardDescription>
                      {med.dosage} • {med.frequency.replace('-', ' ')}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={med.is_active}
                    onCheckedChange={() => handleToggle(med.id, med.is_active)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="flex gap-1 flex-wrap">
                      {med.time_slots.map((time, index) => (
                        <Badge key={index} variant="secondary">{time}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>Started: {format(new Date(med.start_date), 'MMM dd, yyyy')}</p>
                    {med.end_date && (
                      <p>Ends: {format(new Date(med.end_date), 'MMM dd, yyyy')}</p>
                    )}
                  </div>

                  {med.notes && (
                    <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                      {med.notes}
                    </p>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(med.id)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}