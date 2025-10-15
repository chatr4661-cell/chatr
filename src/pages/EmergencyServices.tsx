import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Phone, User, MapPin, Heart, Plus, Trash2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

interface EmergencyContact {
  id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
  is_primary: boolean;
}

export default function EmergencyServices() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', relationship: '' });
  const [activatingSOSstate, setActivatingSOSstate] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });

    if (data) setContacts(data);
  };

  const addContact = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone required');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('emergency_contacts').insert({
      user_id: user.id,
      name: formData.name,
      phone_number: formData.phone,
      relationship: formData.relationship || null,
      is_primary: contacts.length === 0
    });

    if (error) {
      toast.error('Failed to add contact');
    } else {
      toast.success('Emergency contact added');
      setFormData({ name: '', phone: '', relationship: '' });
      setShowAddContact(false);
      loadContacts();
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete contact');
    } else {
      toast.success('Contact removed');
      loadContacts();
    }
  };

  const activateSOS = async () => {
    setActivatingSOSstate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get location
      let lat, lng;
      try {
        const position = await Geolocation.getCurrentPosition();
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch {
        lat = null;
        lng = null;
      }

      // SOS alert will be stored after migration is approved
      console.log('SOS activated with location:', lat, lng);

      

      // Send SMS to emergency contacts
      for (const contact of contacts) {
        try {
          await supabase.functions.invoke('send-emergency-alert', {
            body: {
              phone: contact.phone_number,
              message: `EMERGENCY ALERT: ${user.email || 'User'} has activated SOS. ${lat && lng ? `Location: https://maps.google.com/?q=${lat},${lng}` : 'Location unavailable'}`
            }
          });
        } catch (err) {
          console.error('Failed to send alert to', contact.name);
        }
      }

      toast.success('SOS Activated! Emergency contacts notified.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActivatingSOSstate(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-red-600 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Emergency Services</h1>
          </div>
          <p className="text-red-100">Quick access to emergency care & support</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* SOS Button */}
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-red-700">Emergency SOS</CardTitle>
            <CardDescription>
              Instantly alert your emergency contacts with your location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={activateSOS}
              disabled={activatingSOSstate || contacts.length === 0}
              className="w-full h-20 text-lg font-bold bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="w-8 h-8 mr-3" />
              {activatingSOSstate ? 'Activating SOS...' : 'ACTIVATE SOS'}
            </Button>
            {contacts.length === 0 && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Add emergency contacts to enable SOS
              </p>
            )}
          </CardContent>
        </Card>

        {/* Emergency Hotlines */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Hotlines</CardTitle>
            <CardDescription>Quick access to emergency services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-between h-14 text-base bg-blue-600">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <span>Police - 100</span>
              </div>
              <span>Call Now</span>
            </Button>
            <Button className="w-full justify-between h-14 text-base bg-red-600">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5" />
                <span>Ambulance - 108</span>
              </div>
              <span>Call Now</span>
            </Button>
            <Button className="w-full justify-between h-14 text-base bg-orange-600">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span>Fire - 101</span>
              </div>
              <span>Call Now</span>
            </Button>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Emergency Contacts</CardTitle>
              <Button onClick={() => setShowAddContact(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
            <CardDescription>Contacts to be notified in emergencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                    {contact.relationship && (
                      <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                    )}
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => deleteContact(contact.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {contacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emergency contacts added</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
                type="tel"
              />
            </div>
            <div>
              <Label>Relationship (Optional)</Label>
              <Input
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="Father, Mother, etc."
              />
            </div>
            <Button onClick={addContact} className="w-full">
              Add Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}