import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Building2, Upload, Save, Users, 
  Bell, CreditCard, Shield, Trash2, Mail, Phone,
  MapPin, Clock, Globe, Check
} from 'lucide-react';

interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  description: string | null;
  logo_url: string | null;
  verified: boolean;
  business_phone: string | null;
  business_email: string | null;
  location: any;
  business_hours: any;
  contact_info: any;
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  monthly_price: number;
  next_billing_date: string | null;
  features: any;
}

export default function BusinessSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Form states
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [newLeadAlerts, setNewLeadAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load business profile
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        navigate('/business/onboard');
        return;
      }

      setBusinessProfile(profile);
      setBusinessName(profile.business_name);
      setDescription(profile.description || '');
      setBusinessPhone(profile.business_phone || '');
      setBusinessEmail(profile.business_email || '');
      
      // Safely parse location and contact_info
      const location = profile.location as any;
      const contactInfo = profile.contact_info as any;
      setAddress(location?.address || '');
      setWebsite(contactInfo?.website || '');

      // Load subscription
      const { data: subData } = await supabase
        .from('business_subscriptions')
        .select('*')
        .eq('business_id', profile.id)
        .single();

      if (subData) {
        setSubscription(subData);
      }

      // Load team members
      const { data: teamData } = await supabase
        .from('business_team_members')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('business_id', profile.id);

      if (teamData) {
        setTeamMembers(teamData);
      }

    } catch (error) {
      console.error('Error loading business data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!businessProfile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          business_name: businessName,
          description: description,
          business_phone: businessPhone,
          business_email: businessEmail,
          location: { address },
          contact_info: { website }
        })
        .eq('id', businessProfile.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Business profile updated successfully'
      });

      loadBusinessData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('business_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team member removed successfully'
      });

      loadBusinessData();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b glass-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/business')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Business Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your business profile and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Update your business details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={businessProfile?.logo_url || ''} />
                    <AvatarFallback className="bg-gradient-hero">
                      <Building2 className="h-10 w-10 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label>Business Logo</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a logo for your business
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !businessProfile) return;

                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${businessProfile.id}-${Date.now()}.${fileExt}`;
                          const { error: uploadError } = await supabase.storage
                            .from('social-media')
                            .upload(fileName, file);

                          if (uploadError) throw uploadError;

                          const { data } = supabase.storage
                            .from('social-media')
                            .getPublicUrl(fileName);

                          const { error: updateError } = await supabase
                            .from('business_profiles')
                            .update({ logo_url: data.publicUrl })
                            .eq('id', businessProfile.id);

                          if (updateError) throw updateError;

                          toast({ title: 'Success', description: 'Logo uploaded successfully' });
                          loadBusinessData();
                        } catch (error) {
                          console.error('Error uploading logo:', error);
                          toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
                        }
                      }}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" type="button" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </span>
                      </Button>
                    </Label>
                  </div>
                  {businessProfile?.verified && (
                    <Badge className="bg-gradient-hero">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your business"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Business Phone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Business Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={businessEmail}
                        onChange={(e) => setBusinessEmail(e.target.value)}
                        placeholder="contact@business.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Business Address
                    </Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter business address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourbusiness.com"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                  className="w-full bg-gradient-hero"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Members
                    </CardTitle>
                    <CardDescription>
                      Manage team access and permissions
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profiles?.avatar_url || ''} />
                          <AvatarFallback>
                            {member.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.profiles?.username || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.profiles?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTeamMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription Plan
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription && (
                  <>
                    <div className="p-4 rounded-lg border bg-gradient-hero/5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold capitalize">
                            {subscription.plan_type} Plan
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {subscription.status === 'active' ? 'Active' : subscription.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            ₹{subscription.monthly_price}
                          </p>
                          <p className="text-sm text-muted-foreground">per month</p>
                        </div>
                      </div>

                      {subscription.next_billing_date && (
                        <p className="text-sm text-muted-foreground">
                          Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className="font-medium mb-3">Plan Features</h4>
                      <div className="grid gap-2">
                        {subscription.features && Object.entries(subscription.features).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-sm capitalize">
                              {key.replace(/_/g, ' ')}: {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        Change Plan
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Billing History
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via SMS
                      </p>
                    </div>
                    <Switch
                      checked={smsNotifications}
                      onCheckedChange={setSmsNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Lead Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when new leads come in
                      </p>
                    </div>
                    <Switch
                      checked={newLeadAlerts}
                      onCheckedChange={setNewLeadAlerts}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Daily Digest</p>
                      <p className="text-sm text-muted-foreground">
                        Receive a daily summary of activity
                      </p>
                    </div>
                    <Switch
                      checked={dailyDigest}
                      onCheckedChange={setDailyDigest}
                    />
                  </div>
                </div>

                <Button className="w-full bg-gradient-hero">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
