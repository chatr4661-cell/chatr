import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Bell, BellOff, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGeofencing } from '@/hooks/useGeofencing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Geofence {
  id: string;
  name: string;
  type: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  trigger_on_enter: boolean;
  trigger_on_exit: boolean;
  notification_title: string | null;
  notification_body: string | null;
  active: boolean;
  created_at: string;
}

const Geofences = () => {
  const [user, setUser] = useState<any>(null);
  const [allGeofences, setAllGeofences] = useState<Geofence[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { geofences, activeZones, isMonitoring, refetchGeofences } = useGeofencing(user?.id);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch all geofences
  useEffect(() => {
    const fetchAllGeofences = async () => {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllGeofences(data);
      }
    };

    fetchAllGeofences();

    // Subscribe to changes
    const channel = supabase
      .channel('all-geofences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'geofences' }, () => {
        fetchAllGeofences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      hospital: 'bg-red-500',
      job: 'bg-blue-500',
      event: 'bg-purple-500',
      community: 'bg-green-500',
      custom: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getTypeIcon = (type: string) => {
    return type === 'hospital' ? '🏥' : type === 'job' ? '💼' : type === 'event' ? '🎉' : '🏘️';
  };

  const deleteGeofence = async (id: string) => {
    try {
      const { error } = await supabase.from('geofences').delete().eq('id', id);
      if (error) throw error;
      toast.success('Geofence deleted');
      refetchGeofences();
    } catch (error) {
      toast.error('Failed to delete geofence');
    }
  };

  // Filter geofences
  const filteredGeofences = allGeofences.filter((geofence) => {
    const typeMatch = typeFilter === 'all' || geofence.type === typeFilter;
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'active' && geofence.active) || 
      (statusFilter === 'inactive' && !geofence.active);
    return typeMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-8 w-8 text-primary" />
              Geofences
            </h1>
            <p className="text-muted-foreground mt-1">
              Location-based notifications for zones nearby
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Geofence Zone</DialogTitle>
                <DialogDescription>
                  Set up a location-based notification zone
                </DialogDescription>
              </DialogHeader>
              <CreateGeofenceForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  refetchGeofences();
                }}
                userId={user?.id}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Monitoring Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-medium">
                    {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeZones.length > 0
                      ? `Currently inside ${activeZones.length} zone${activeZones.length > 1 ? 's' : ''}`
                      : 'Not in any zones'}
                  </p>
                </div>
              </div>
              <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                {geofences.length} Active Zones
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Zones */}
        {activeZones.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                You're Inside These Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {geofences
                .filter((g) => activeZones.includes(g.id))
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg"
                  >
                    <span className="text-2xl">{getTypeIcon(zone.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium">{zone.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{zone.type}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* All Geofences */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">All Zones</h2>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="job">Job Site</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredGeofences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No geofences yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first zone to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredGeofences.map((geofence) => (
              <Card key={geofence.id} className={activeZones.includes(geofence.id) ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getTypeIcon(geofence.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold flex items-center gap-2">
                            {geofence.name}
                            {activeZones.includes(geofence.id) && (
                              <Badge variant="default" className="text-xs">
                                Inside
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {geofence.description}
                          </p>
                        </div>
                        {user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGeofence(geofence.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="capitalize">
                          {geofence.type}
                        </Badge>
                        <Badge variant="outline">{geofence.radius_meters}m radius</Badge>
                        {geofence.trigger_on_enter && (
                          <Badge variant="outline" className="text-green-600">
                            <Bell className="h-3 w-3 mr-1" />
                            On Enter
                          </Badge>
                        )}
                        {geofence.trigger_on_exit && (
                          <Badge variant="outline" className="text-orange-600">
                            <BellOff className="h-3 w-3 mr-1" />
                            On Exit
                          </Badge>
                        )}
                      </div>

                      {geofence.notification_title && (
                        <div className="mt-3 p-2 bg-muted rounded text-sm">
                          <p className="font-medium">{geofence.notification_title}</p>
                          <p className="text-muted-foreground text-xs">
                            {geofence.notification_body}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Create Geofence Form Component
const CreateGeofenceForm = ({ onSuccess, userId }: { onSuccess: () => void; userId?: string }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    description: '',
    center_lat: '',
    center_lng: '',
    radius_meters: '500',
    trigger_on_enter: true,
    trigger_on_exit: false,
    notification_title: '',
    notification_body: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('geofences').insert({
        ...formData,
        center_lat: parseFloat(formData.center_lat),
        center_lng: parseFloat(formData.center_lng),
        radius_meters: parseInt(formData.radius_meters),
        created_by: userId,
      });

      if (error) throw error;

      toast.success('Geofence created successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create geofence');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Zone Name</Label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., City Hospital"
        />
      </div>

      <div>
        <Label>Type</Label>
        <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hospital">Hospital</SelectItem>
            <SelectItem value="job">Job Site</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="community">Community</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Latitude</Label>
          <Input
            required
            type="number"
            step="any"
            value={formData.center_lat}
            onChange={(e) => setFormData({ ...formData, center_lat: e.target.value })}
            placeholder="28.6139"
          />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input
            required
            type="number"
            step="any"
            value={formData.center_lng}
            onChange={(e) => setFormData({ ...formData, center_lng: e.target.value })}
            placeholder="77.2090"
          />
        </div>
      </div>

      <div>
        <Label>Radius (meters)</Label>
        <Input
          required
          type="number"
          value={formData.radius_meters}
          onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Notify on Enter</Label>
        <Switch
          checked={formData.trigger_on_enter}
          onCheckedChange={(val) => setFormData({ ...formData, trigger_on_enter: val })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Notify on Exit</Label>
        <Switch
          checked={formData.trigger_on_exit}
          onCheckedChange={(val) => setFormData({ ...formData, trigger_on_exit: val })}
        />
      </div>

      <div>
        <Label>Notification Title</Label>
        <Input
          value={formData.notification_title}
          onChange={(e) => setFormData({ ...formData, notification_title: e.target.value })}
          placeholder="e.g., Near Hospital"
        />
      </div>

      <div>
        <Label>Notification Message</Label>
        <Textarea
          value={formData.notification_body}
          onChange={(e) => setFormData({ ...formData, notification_body: e.target.value })}
          placeholder="e.g., You are near the hospital..."
        />
      </div>

      <Button type="submit" className="w-full">
        Create Geofence
      </Button>
    </form>
  );
};

export default Geofences;
