import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Upload, 
  Save,
  Store,
  Clock,
  MapPin,
  CreditCard,
  Bell
} from 'lucide-react';

interface SellerSettings {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  logo_url: string | null;
  banner_url?: string | null;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  operating_hours?: any;
  service_radius_km?: number;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_account_holder?: string;
  notification_email_bookings?: boolean;
  notification_email_messages?: boolean;
  notification_email_reviews?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SellerSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SellerSettings | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [operatingHours, setOperatingHours] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('chatr_plus_sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const settingsData = data as any;
      setSettings(settingsData);
      setOperatingHours(settingsData.operating_hours || {});
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSaveBusinessInfo = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      let logoUrl = settings.logo_url;
      let bannerUrl = settings.banner_url;

      if (logoFile) {
        logoUrl = await uploadImage(logoFile, 'seller-logos');
      }

      if (bannerFile) {
        bannerUrl = await uploadImage(bannerFile, 'seller-banners');
      }

      const { error } = await supabase
        .from('chatr_plus_sellers')
        .update({
          business_name: settings.business_name,
          business_type: settings.business_type,
          description: settings.description,
          logo_url: logoUrl,
          email: settings.email,
          phone_number: settings.phone_number,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          pincode: settings.pincode,
        } as any)
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Business information updated',
      });

      loadSettings();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOperatingHours = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const updateData: any = {
        operating_hours: operatingHours,
      };
      
      const { error } = await supabase
        .from('chatr_plus_sellers')
        .update(updateData)
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Operating hours updated',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save operating hours',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chatr_plus_sellers')
        .update({
          bank_account_number: settings.bank_account_number,
          bank_ifsc_code: settings.bank_ifsc_code,
          bank_account_holder: settings.bank_account_holder,
        } as any)
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bank details updated',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save bank details',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chatr_plus_sellers')
        .update({
          notification_email_bookings: settings.notification_email_bookings,
          notification_email_messages: settings.notification_email_messages,
          notification_email_reviews: settings.notification_email_reviews,
        } as any)
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/seller')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Seller Settings</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="service-area">Service Area</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Business Info */}
          <TabsContent value="business" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Store className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Business Information</h2>
              </div>

              <div className="space-y-4">
                {/* Logo Upload */}
                <div>
                  <Label>Business Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {settings.logo_url && (
                      <img src={settings.logo_url} alt="Logo" className="h-20 w-20 rounded object-cover" />
                    )}
                    <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                {/* Banner Upload */}
                <div>
                  <Label>Banner Image</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {settings.banner_url && (
                      <img src={settings.banner_url} alt="Banner" className="h-20 w-40 rounded object-cover" />
                    )}
                    <Button variant="outline" onClick={() => document.getElementById('banner-upload')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Banner
                    </Button>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Business Type</Label>
                  <Input
                    value={settings.business_type}
                    onChange={(e) => setSettings({ ...settings, business_type: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={settings.phone_number}
                      onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={settings.city}
                      onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={settings.state}
                      onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      value={settings.pincode}
                      onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveBusinessInfo} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Operating Hours */}
          <TabsContent value="hours" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Operating Hours</h2>
              </div>

              <div className="space-y-4">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-32">
                      <Label>{day}</Label>
                    </div>
                    <Input
                      type="time"
                      placeholder="Open"
                      value={operatingHours[day]?.open || ''}
                      onChange={(e) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...operatingHours[day], open: e.target.value }
                      })}
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      placeholder="Close"
                      value={operatingHours[day]?.close || ''}
                      onChange={(e) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...operatingHours[day], close: e.target.value }
                      })}
                      className="w-32"
                    />
                    <Switch
                      checked={operatingHours[day]?.enabled || false}
                      onCheckedChange={(checked) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...operatingHours[day], enabled: checked }
                      })}
                    />
                  </div>
                ))}

                <Button onClick={handleSaveOperatingHours} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Hours
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Service Area */}
          <TabsContent value="service-area" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Service Area</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Service Radius (km)</Label>
                  <Input
                    type="number"
                    value={settings.service_radius_km || 10}
                    onChange={(e) => setSettings({ ...settings, service_radius_km: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum distance you're willing to travel for services
                  </p>
                </div>

                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Interactive map coming soon</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Bank Details */}
          <TabsContent value="bank" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Bank Account Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Account Holder Name</Label>
                  <Input
                    value={settings.bank_account_holder || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_holder: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={settings.bank_account_number || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                  />
                </div>

                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    value={settings.bank_ifsc_code || ''}
                    onChange={(e) => setSettings({ ...settings, bank_ifsc_code: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveBankDetails} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Bank Details
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Email Notifications</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Bookings</Label>
                    <p className="text-sm text-muted-foreground">Receive email when you get a new booking</p>
                  </div>
                  <Switch
                    checked={settings.notification_email_bookings || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, notification_email_bookings: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Messages</Label>
                    <p className="text-sm text-muted-foreground">Receive email for new customer messages</p>
                  </div>
                  <Switch
                    checked={settings.notification_email_messages || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, notification_email_messages: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Reviews</Label>
                    <p className="text-sm text-muted-foreground">Receive email when customers leave reviews</p>
                  </div>
                  <Switch
                    checked={settings.notification_email_reviews || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, notification_email_reviews: checked })}
                  />
                </div>

                <Button onClick={handleSaveNotifications} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
