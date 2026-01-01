import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Bell, 
  Pill, 
  Syringe, 
  Calendar,
  Clock,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Repeat,
  Stethoscope,
  Droplet
} from 'lucide-react';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  reminder_type: string;
  title: string;
  description?: string;
  reminder_time: string;
  repeat_pattern: string;
  is_active: boolean;
  last_triggered_at?: string;
}

const REMINDER_TYPES = [
  { value: 'medication', label: 'Medication', icon: Pill, color: 'text-blue-500' },
  { value: 'vaccination', label: 'Vaccination', icon: Syringe, color: 'text-green-500' },
  { value: 'appointment', label: 'Appointment', icon: Stethoscope, color: 'text-purple-500' },
  { value: 'checkup', label: 'Health Checkup', icon: Calendar, color: 'text-orange-500' },
  { value: 'hydration', label: 'Drink Water', icon: Droplet, color: 'text-cyan-500' },
  { value: 'custom', label: 'Custom', icon: Bell, color: 'text-gray-500' }
];

const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Days' }
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HealthReminders() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const [formData, setFormData] = useState({
    type: 'medication',
    title: '',
    description: '',
    time: '09:00',
    frequency: 'daily',
    days: [] as string[]
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
    loadReminders(user.id);
  };

  const loadReminders = async (userId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('health_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('reminder_time', { ascending: true });
      
      if (data) setReminders(data as unknown as Reminder[]);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReminder = async () => {
    if (!formData.title || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const reminderData = {
        user_id: user.id,
        reminder_type: formData.type,
        title: formData.title,
        description: formData.description || null,
        reminder_time: formData.time,
        repeat_pattern: formData.frequency,
        is_active: true
      };

      if (editingReminder) {
        await supabase
          .from('health_reminders')
          .update(reminderData)
          .eq('id', editingReminder.id);
        toast.success('Reminder updated!');
      } else {
        await supabase
          .from('health_reminders')
          .insert(reminderData);
        toast.success('Reminder created!');
      }

      setDialogOpen(false);
      resetForm();
      loadReminders(user.id);
    } catch (error) {
      toast.error('Failed to save reminder');
    }
  };

  const toggleReminder = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('health_reminders')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      loadReminders(user.id);
      toast.success(isActive ? 'Reminder paused' : 'Reminder activated');
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await supabase
        .from('health_reminders')
        .delete()
        .eq('id', id);
      
      loadReminders(user.id);
      toast.success('Reminder deleted');
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };

  const editReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      type: reminder.reminder_type,
      title: reminder.title,
      description: reminder.description || '',
      time: reminder.reminder_time,
      frequency: reminder.repeat_pattern,
      days: []
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingReminder(null);
    setFormData({
      type: 'medication',
      title: '',
      description: '',
      time: '09:00',
      frequency: 'daily',
      days: []
    });
  };

  const getTypeConfig = (type: string) => {
    return REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[5];
  };

  const activeReminders = reminders.filter(r => r.is_active);
  const pausedReminders = reminders.filter(r => !r.is_active);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
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
                <h1 className="text-xl font-bold">Health Reminders</h1>
                <p className="text-sm text-amber-100">Never miss important health tasks</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="icon" className="bg-white/20 hover:bg-white/30">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Reminder Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`h-4 w-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="e.g., Take vitamin D"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      placeholder="Additional notes..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time *</Label>
                      <Input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.frequency === 'custom' && (
                    <div className="space-y-2">
                      <Label>Select Days</Label>
                      <div className="flex gap-2">
                        {DAYS.map((day) => (
                          <Button
                            key={day}
                            type="button"
                            size="sm"
                            variant={formData.days.includes(day) ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => {
                              const newDays = formData.days.includes(day)
                                ? formData.days.filter(d => d !== day)
                                : [...formData.days, day];
                              setFormData({ ...formData, days: newDays });
                            }}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={saveReminder} className="w-full bg-amber-600 hover:bg-amber-700">
                    {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Quick Add Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {REMINDER_TYPES.slice(0, 3).map((type) => (
              <Button
                key={type.value}
                variant="outline"
                className="h-auto py-3 flex-col"
                onClick={() => {
                  setFormData({ ...formData, type: type.value });
                  setDialogOpen(true);
                }}
              >
                <type.icon className={`h-5 w-5 mb-1 ${type.color}`} />
                <span className="text-xs">{type.label}</span>
              </Button>
            ))}
          </div>

          {/* Active Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Active Reminders
                {activeReminders.length > 0 && (
                  <Badge className="ml-2">{activeReminders.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeReminders.length > 0 ? (
                <div className="space-y-3">
                  {activeReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onToggle={toggleReminder}
                      onEdit={editReminder}
                      onDelete={deleteReminder}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No active reminders</p>
                  <p className="text-sm">Tap + to create one</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paused Reminders */}
          {pausedReminders.length > 0 && (
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Paused Reminders ({pausedReminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pausedReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onToggle={toggleReminder}
                      onEdit={editReminder}
                      onDelete={deleteReminder}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Pro Tips</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    <li>• Set medication reminders at consistent times</li>
                    <li>• Add water reminders throughout the day</li>
                    <li>• Schedule annual checkups in advance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function ReminderCard({ 
  reminder, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  reminder: Reminder; 
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}) {
  const typeConfig = REMINDER_TYPES.find(t => t.value === reminder.reminder_type) || REMINDER_TYPES[5];
  const Icon = typeConfig.icon;

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${!reminder.is_active && 'opacity-60'}`}>
      <div className={`p-2 rounded-lg ${reminder.is_active ? 'bg-amber-100' : 'bg-gray-100'}`}>
        <Icon className={`h-5 w-5 ${typeConfig.color}`} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{reminder.title}</p>
            {reminder.description && (
              <p className="text-sm text-muted-foreground">{reminder.description}</p>
            )}
          </div>
          <Switch
            checked={reminder.is_active}
            onCheckedChange={() => onToggle(reminder.id, reminder.is_active)}
          />
        </div>
        
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {reminder.reminder_time}
          </span>
          <span className="flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            {reminder.repeat_pattern}
          </span>
          {reminder.days_of_week && reminder.days_of_week.length > 0 && (
            <span>{reminder.days_of_week.join(', ')}</span>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onEdit(reminder)}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs text-destructive" 
            onClick={() => onDelete(reminder.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
