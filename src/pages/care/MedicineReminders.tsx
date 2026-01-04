import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Plus, Clock, Trash2, Volume2, MessageCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';

interface Reminder {
  id: string;
  medicine_name: string;
  scheduled_time: string;
  days_of_week: number[];
  reminder_type: string;
  is_active: boolean;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MedicineReminders = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReminder, setNewReminder] = useState({
    medicine_name: '',
    scheduled_time: '08:00',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    reminder_type: 'push'
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medicine_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_time');

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const addReminder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('medicine_reminders')
        .insert({
          user_id: user.id,
          medicine_name: newReminder.medicine_name,
          scheduled_time: newReminder.scheduled_time,
          days_of_week: newReminder.days_of_week,
          reminder_type: newReminder.reminder_type,
          is_active: true
        });

      if (error) throw error;
      
      toast.success('Reminder added');
      setShowAddDialog(false);
      setNewReminder({ medicine_name: '', scheduled_time: '08:00', days_of_week: [0, 1, 2, 3, 4, 5, 6], reminder_type: 'push' });
      loadReminders();
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast.error('Failed to add reminder');
    }
  };

  const toggleReminder = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('medicine_reminders')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      
      setReminders(reminders.map(r => 
        r.id === id ? { ...r, is_active: !isActive } : r
      ));
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medicine_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setReminders(reminders.filter(r => r.id !== id));
      toast.success('Reminder deleted');
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };

  const toggleDay = (day: number) => {
    if (newReminder.days_of_week.includes(day)) {
      setNewReminder({ 
        ...newReminder, 
        days_of_week: newReminder.days_of_week.filter(d => d !== day) 
      });
    } else {
      setNewReminder({ 
        ...newReminder, 
        days_of_week: [...newReminder.days_of_week, day].sort() 
      });
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'push': return <Smartphone className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'sms': return <MessageCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Group reminders by time
  const groupedReminders = reminders.reduce((acc, reminder) => {
    const time = reminder.scheduled_time;
    if (!acc[time]) acc[time] = [];
    acc[time].push(reminder);
    return acc;
  }, {} as Record<string, Reminder[]>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/care/medicines')} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Reminders</h1>
              <p className="text-sm opacity-90">Never miss a dose</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-white/20 text-white hover:bg-white/30">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Medicine Name</Label>
                  <Input
                    value={newReminder.medicine_name}
                    onChange={(e) => setNewReminder({ ...newReminder, medicine_name: e.target.value })}
                    placeholder="Enter medicine name"
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newReminder.scheduled_time}
                    onChange={(e) => setNewReminder({ ...newReminder, scheduled_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Days</Label>
                  <div className="flex gap-2 mt-2">
                    {dayNames.map((day, idx) => (
                      <Button
                        key={day}
                        variant={newReminder.days_of_week.includes(idx) ? 'default' : 'outline'}
                        size="sm"
                        className="w-10 h-10 p-0"
                        onClick={() => toggleDay(idx)}
                      >
                        {day.charAt(0)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Reminder Type</Label>
                  <Select
                    value={newReminder.reminder_type}
                    onValueChange={(value) => setNewReminder({ ...newReminder, reminder_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push Notification</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={addReminder}>
                  Save Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Settings */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Sound Alerts</p>
                  <p className="text-xs text-muted-foreground">Play sound for reminders</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Reminders by Time */}
        {Object.keys(groupedReminders).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Reminders Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add reminders to never miss your medicines
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Reminder
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedReminders).sort().map(([time, timeReminders]) => (
            <Card key={time}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(time)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeReminders.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${!reminder.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        {getReminderIcon(reminder.reminder_type)}
                      </div>
                      <div>
                        <p className="font-medium">{reminder.medicine_name}</p>
                        <div className="flex gap-1 mt-1">
                          {reminder.days_of_week.map((day) => (
                            <Badge key={day} variant="secondary" className="text-xs px-1">
                              {dayNames[day].charAt(0)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.is_active}
                        onCheckedChange={() => toggleReminder(reminder.id, reminder.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReminder(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}

        {/* Tips */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">💡 Tips for Better Adherence</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Set reminders at consistent times daily</li>
              <li>• Take medicines with meals for better habit formation</li>
              <li>• Keep a 7-day pill organizer handy</li>
              <li>• Enable WhatsApp reminders for family members</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <MedicineBottomNav />
    </div>
  );
};

export default MedicineReminders;
