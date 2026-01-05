import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Building, MapPin, FileText, 
  CreditCard, Bell, Clock, Shield, HelpCircle,
  ChevronRight, Save, LogOut, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Vendor {
  id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  description: string;
  logo_url: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_account_holder: string;
  is_verified: boolean;
}

interface RestaurantDetails {
  is_accepting_orders: boolean;
  opening_time: string;
  closing_time: string;
  min_order_amount: number;
  delivery_charge: number;
  packaging_charge: number;
}

export default function VendorSettings() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [restaurantDetails, setRestaurantDetails] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadVendorSettings();
  }, []);

  const loadVendorSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!vendorData) {
        navigate('/vendor/register');
        return;
      }

      setVendor(vendorData);

      // Load restaurant details if applicable
      if (vendorData.vendor_type === 'restaurant') {
        const { data: restDetails } = await supabase
          .from('restaurant_details')
          .select('*')
          .eq('vendor_id', vendorData.id)
          .single();

        if (restDetails) {
          setRestaurantDetails(restDetails);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveVendorSettings = async () => {
    if (!vendor) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          business_name: vendor.business_name,
          business_email: vendor.business_email,
          business_phone: vendor.business_phone,
          description: vendor.description,
          address: vendor.address,
          city: vendor.city,
          state: vendor.state,
          pincode: vendor.pincode,
          bank_account_number: vendor.bank_account_number,
          bank_ifsc: vendor.bank_ifsc,
          bank_account_holder: vendor.bank_account_holder,
        })
        .eq('id', vendor.id);

      if (error) throw error;

      // Save restaurant details if applicable
      if (restaurantDetails) {
        await supabase
          .from('restaurant_details')
          .update({
            is_accepting_orders: restaurantDetails.is_accepting_orders,
            opening_time: restaurantDetails.opening_time,
            closing_time: restaurantDetails.closing_time,
            min_order_amount: restaurantDetails.min_order_amount,
            delivery_charge: restaurantDetails.delivery_charge,
            packaging_charge: restaurantDetails.packaging_charge,
          })
          .eq('vendor_id', vendor.id);
      }

      toast.success('Settings saved');
      setActiveSection(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/vendor/login');
  };

  const settingsSections = [
    { id: 'business', icon: Building, title: 'Business Details', description: 'Name, contact, description' },
    { id: 'address', icon: MapPin, title: 'Address', description: 'Business location' },
    { id: 'documents', icon: FileText, title: 'Documents', description: 'GST, PAN, FSSAI' },
    { id: 'bank', icon: CreditCard, title: 'Bank Details', description: 'Settlement account' },
    ...(restaurantDetails ? [
      { id: 'hours', icon: Clock, title: 'Business Hours', description: 'Opening & closing times' },
      { id: 'delivery', icon: Building, title: 'Delivery Settings', description: 'Charges & minimum order' },
    ] : []),
    { id: 'notifications', icon: Bell, title: 'Notifications', description: 'Order & update alerts' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => activeSection ? setActiveSection(null) : navigate('/vendor/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">
            {activeSection ? settingsSections.find(s => s.id === activeSection)?.title : 'Settings'}
          </h1>
        </div>
      </div>

      {!activeSection ? (
        <div className="p-4 space-y-4">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={vendor.logo_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {vendor.business_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-bold text-lg">{vendor.business_name}</h2>
                  <p className="text-sm text-muted-foreground">{vendor.business_email}</p>
                  {vendor.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 mt-1">
                      <Clock className="w-3 h-3" />
                      Verification Pending
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Quick Toggle */}
          {restaurantDetails && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Accepting Orders</h3>
                    <p className="text-sm text-muted-foreground">
                      {restaurantDetails.is_accepting_orders ? 'Your restaurant is open' : 'Your restaurant is closed'}
                    </p>
                  </div>
                  <Switch 
                    checked={restaurantDetails.is_accepting_orders}
                    onCheckedChange={async (checked) => {
                      setRestaurantDetails({ ...restaurantDetails, is_accepting_orders: checked });
                      await supabase
                        .from('restaurant_details')
                        .update({ is_accepting_orders: checked })
                        .eq('vendor_id', vendor.id);
                      toast.success(checked ? 'Now accepting orders' : 'Not accepting orders');
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Sections */}
          <div className="space-y-2">
            {settingsSections.map((section) => (
              <motion.div
                key={section.id}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setActiveSection(section.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <section.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{section.title}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Help & Support */}
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Help & Support</h3>
                  <p className="text-sm text-muted-foreground">FAQs, contact support</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>

          {/* Delete Account */}
          <Button 
            variant="ghost" 
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Business Details Section */}
          {activeSection === 'business' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input 
                  id="businessName"
                  value={vendor.business_name}
                  onChange={(e) => setVendor({ ...vendor, business_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="businessPhone">Business Phone</Label>
                <Input 
                  id="businessPhone"
                  value={vendor.business_phone}
                  onChange={(e) => setVendor({ ...vendor, business_phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input 
                  id="businessEmail"
                  type="email"
                  value={vendor.business_email}
                  onChange={(e) => setVendor({ ...vendor, business_email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={vendor.description || ''}
                  onChange={(e) => setVendor({ ...vendor, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Address Section */}
          {activeSection === 'address' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea 
                  id="address"
                  value={vendor.address || ''}
                  onChange={(e) => setVendor({ ...vendor, address: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city"
                    value={vendor.city || ''}
                    onChange={(e) => setVendor({ ...vendor, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state"
                    value={vendor.state || ''}
                    onChange={(e) => setVendor({ ...vendor, state: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pincode">PIN Code</Label>
                <Input 
                  id="pincode"
                  value={vendor.pincode || ''}
                  onChange={(e) => setVendor({ ...vendor, pincode: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pan">PAN Number</Label>
                <Input 
                  id="pan"
                  value={vendor.pan_number || ''}
                  disabled
                  className="mt-1 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Contact support to update</p>
              </div>
              <div>
                <Label htmlFor="gst">GST Number</Label>
                <Input 
                  id="gst"
                  value={vendor.gst_number || ''}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>
          )}

          {/* Bank Details Section */}
          {activeSection === 'bank' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="accountHolder">Account Holder Name</Label>
                <Input 
                  id="accountHolder"
                  value={vendor.bank_account_holder || ''}
                  onChange={(e) => setVendor({ ...vendor, bank_account_holder: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input 
                  id="accountNumber"
                  value={vendor.bank_account_number || ''}
                  onChange={(e) => setVendor({ ...vendor, bank_account_number: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input 
                  id="ifsc"
                  value={vendor.bank_ifsc || ''}
                  onChange={(e) => setVendor({ ...vendor, bank_ifsc: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Business Hours Section */}
          {activeSection === 'hours' && restaurantDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openTime">Opening Time</Label>
                  <Input 
                    id="openTime"
                    type="time"
                    value={restaurantDetails.opening_time || '09:00'}
                    onChange={(e) => setRestaurantDetails({ ...restaurantDetails, opening_time: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="closeTime">Closing Time</Label>
                  <Input 
                    id="closeTime"
                    type="time"
                    value={restaurantDetails.closing_time || '22:00'}
                    onChange={(e) => setRestaurantDetails({ ...restaurantDetails, closing_time: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Settings Section */}
          {activeSection === 'delivery' && restaurantDetails && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="minOrder">Minimum Order Amount (₹)</Label>
                <Input 
                  id="minOrder"
                  type="number"
                  value={restaurantDetails.min_order_amount || 0}
                  onChange={(e) => setRestaurantDetails({ ...restaurantDetails, min_order_amount: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="deliveryCharge">Delivery Charge (₹)</Label>
                <Input 
                  id="deliveryCharge"
                  type="number"
                  value={restaurantDetails.delivery_charge || 0}
                  onChange={(e) => setRestaurantDetails({ ...restaurantDetails, delivery_charge: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="packagingCharge">Packaging Charge (₹)</Label>
                <Input 
                  id="packagingCharge"
                  type="number"
                  value={restaurantDetails.packaging_charge || 0}
                  onChange={(e) => setRestaurantDetails({ ...restaurantDetails, packaging_charge: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button 
            className="w-full"
            onClick={saveVendorSettings}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete your vendor account? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive">Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
