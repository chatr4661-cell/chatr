import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Users, Heart, Bell, Calendar, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';

const relationships = [
  { value: 'mother', label: 'Mother', emoji: '👩' },
  { value: 'father', label: 'Father', emoji: '👨' },
  { value: 'spouse', label: 'Spouse', emoji: '💑' },
  { value: 'child', label: 'Child', emoji: '👶' },
  { value: 'sibling', label: 'Sibling', emoji: '👫' },
  { value: 'grandparent', label: 'Grandparent', emoji: '👴' },
  { value: 'other', label: 'Other', emoji: '👤' },
];

export default function AddFamilyMember() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    dateOfBirth: '',
    alertsEnabled: true,
    emergencyContact: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.relationship) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login first');
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('health_family_members')
        .insert({
          caregiver_user_id: user.id,
          member_name: formData.name,
          relationship: formData.relationship,
          member_phone: formData.phone || null,
          date_of_birth: formData.dateOfBirth || null,
          alert_on_missed_dose: formData.alertsEnabled,
          alert_on_abnormal_vitals: formData.alertsEnabled
        });

      if (error) throw error;
      
      toast.success('Family member added successfully!');
      navigate('/care?tab=care');
    } catch (error) {
      console.error('Error adding family member:', error);
      toast.error('Failed to add family member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Add Family Member | Chatr Care"
        description="Add a family member to manage their healthcare with Chatr's family care feature"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Add Family Member</h1>
                <p className="text-sm text-white/80">Manage care for your loved ones</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship *</Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((rel) => (
                        <SelectItem key={rel.value} value={rel.value}>
                          <span className="flex items-center gap-2">
                            <span>{rel.emoji}</span>
                            <span>{rel.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 XXXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Care Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Health Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts about their health activities
                    </p>
                  </div>
                  <Switch
                    checked={formData.alertsEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, alertsEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Emergency Contact</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark as emergency contact for SOS alerts
                    </p>
                  </div>
                  <Switch
                    checked={formData.emergencyContact}
                    onCheckedChange={(checked) => setFormData({ ...formData, emergencyContact: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Care Features Preview */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  What you can manage
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Medicine reminders',
                    'Doctor appointments',
                    'Vital tracking',
                    'Lab reports',
                    'Care paths',
                    'Emergency SOS'
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Family Member'}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
