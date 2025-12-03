import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Store, MessageSquare, Megaphone, BarChart3, Clock, Plus, X, 
  LayoutDashboard, Inbox, Users, Package, Settings, UserPlus,
  Calendar, Star, CreditCard, Wallet, ChevronRight, Briefcase,
  TrendingUp, PieChart, Send, UsersRound, ShoppingBag
} from 'lucide-react';

interface SellerSettings {
  business_name: string;
  business_category: string;
  quick_replies: string[];
  auto_response_enabled: boolean;
  auto_response_message: string;
  away_message: string;
  broadcast_enabled: boolean;
}

interface ToolItem {
  title: string;
  url: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

interface ToolCategory {
  title: string;
  icon: React.ElementType;
  items: ToolItem[];
}

const sellerToolCategories: ToolCategory[] = [
  {
    title: 'Dashboard & Analytics',
    icon: LayoutDashboard,
    items: [
      { title: 'Seller Dashboard', url: '/seller-portal', icon: LayoutDashboard, description: 'Overview of your business' },
      { title: 'Business Dashboard', url: '/business/dashboard', icon: Briefcase, description: 'B2B business hub' },
      { title: 'Seller Analytics', url: '/seller-analytics', icon: TrendingUp, description: 'Performance metrics' },
      { title: 'Business Analytics', url: '/business/analytics', icon: PieChart, description: 'Business insights' },
    ]
  },
  {
    title: 'Communication',
    icon: MessageSquare,
    items: [
      { title: 'Business Inbox', url: '/business/inbox', icon: Inbox, description: 'Customer messages' },
      { title: 'Seller Messages', url: '/seller-messages', icon: MessageSquare, description: 'Direct messages' },
      { title: 'Broadcasts', url: '/business/broadcasts', icon: Send, description: 'Mass messaging' },
    ]
  },
  {
    title: 'Services & Products',
    icon: Package,
    items: [
      { title: 'My Services', url: '/seller-services', icon: Package, description: 'Manage your services' },
      { title: 'Product Catalog', url: '/business/catalog', icon: ShoppingBag, description: 'Products & inventory' },
    ]
  },
  {
    title: 'Bookings & Orders',
    icon: Calendar,
    items: [
      { title: 'Bookings', url: '/seller-bookings', icon: Calendar, description: 'Manage appointments' },
      { title: 'Reviews', url: '/seller-reviews', icon: Star, description: 'Customer feedback' },
    ]
  },
  {
    title: 'Finance & Payments',
    icon: Wallet,
    items: [
      { title: 'Payouts', url: '/seller-payouts', icon: CreditCard, description: 'Earnings & withdrawals' },
      { title: 'Subscription', url: '/seller-subscription', icon: Wallet, description: 'Plan & billing' },
    ]
  },
  {
    title: 'Team & CRM',
    icon: Users,
    items: [
      { title: 'CRM', url: '/business/crm', icon: UsersRound, description: 'Customer management' },
      { title: 'Team', url: '/business/team', icon: Users, description: 'Team members' },
      { title: 'Groups', url: '/business/groups', icon: UserPlus, description: 'Business groups' },
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Seller Settings', url: '/seller-settings', icon: Settings, description: 'Account preferences' },
      { title: 'Business Settings', url: '/business/settings', icon: Settings, description: 'Business config' },
    ]
  },
];

export const SellerModePanel = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SellerSettings>({
    business_name: '',
    business_category: '',
    quick_replies: [],
    auto_response_enabled: false,
    auto_response_message: '',
    away_message: '',
    broadcast_enabled: true
  });
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTools, setShowTools] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('seller_mode_settings' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        business_name: (data as any).business_name || '',
        business_category: (data as any).business_category || '',
        quick_replies: (data as any).quick_replies || [],
        auto_response_enabled: (data as any).auto_response_enabled || false,
        auto_response_message: (data as any).auto_response_message || '',
        away_message: (data as any).away_message || '',
        broadcast_enabled: (data as any).broadcast_enabled ?? true
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('seller_mode_settings' as any)
      .upsert({
        user_id: user.id,
        ...settings
      }, { onConflict: 'user_id' });

    setSaving(false);
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
  };

  const addQuickReply = () => {
    if (newReply.trim() && settings.quick_replies.length < 10) {
      setSettings(prev => ({
        ...prev,
        quick_replies: [...prev.quick_replies, newReply.trim()]
      }));
      setNewReply('');
    }
  };

  const removeQuickReply = (index: number) => {
    setSettings(prev => ({
      ...prev,
      quick_replies: prev.quick_replies.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      {/* Seller Tools Navigation */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-primary" />
              Seller Tools
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowTools(!showTools)}
            >
              {showTools ? 'Hide' : 'Show'}
            </Button>
          </div>
          <CardDescription>Quick access to all business features</CardDescription>
        </CardHeader>
        
        {showTools && (
          <CardContent className="pt-2">
            <div className="space-y-4">
              {sellerToolCategories.map((category) => (
                <div key={category.title} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <category.icon className="h-4 w-4" />
                    {category.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map((item) => (
                      <button
                        key={item.url}
                        onClick={() => navigate(item.url)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-accent border border-border/50 hover:border-primary/30 transition-all text-left group"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/chatr-studio')}>
              <Package className="h-4 w-4 mr-1" />
              Design Studio
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/chatr-plus-seller-registration')}>
              <UserPlus className="h-4 w-4 mr-1" />
              Register as Seller
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/local-deals')}>
              <Store className="h-4 w-4 mr-1" />
              Nexgenn Services
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Business Name</Label>
            <Input
              value={settings.business_name}
              onChange={(e) => setSettings(prev => ({ ...prev, business_name: e.target.value }))}
              placeholder="Your business name"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={settings.business_category}
              onChange={(e) => setSettings(prev => ({ ...prev, business_category: e.target.value }))}
              placeholder="e.g., Retail, Services, Food"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Replies
          </CardTitle>
          <CardDescription>Pre-saved responses for faster replies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Add a quick reply..."
              onKeyDown={(e) => e.key === 'Enter' && addQuickReply()}
            />
            <Button onClick={addQuickReply} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.quick_replies.map((reply, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {reply}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeQuickReply(i)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto Responses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Response</Label>
              <p className="text-sm text-muted-foreground">Automatically reply to new messages</p>
            </div>
            <Switch
              checked={settings.auto_response_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_response_enabled: checked }))}
            />
          </div>
          {settings.auto_response_enabled && (
            <div>
              <Label>Auto Response Message</Label>
              <Textarea
                value={settings.auto_response_message}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_response_message: e.target.value }))}
                placeholder="Thanks for reaching out! We'll get back to you shortly."
                rows={3}
              />
            </div>
          )}
          <div>
            <Label>Away Message</Label>
            <Textarea
              value={settings.away_message}
              onChange={(e) => setSettings(prev => ({ ...prev, away_message: e.target.value }))}
              placeholder="We're currently away. Business hours: 9AM - 6PM"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Broadcast Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Broadcasts</Label>
              <p className="text-sm text-muted-foreground">Send messages to multiple customers</p>
            </div>
            <Switch
              checked={settings.broadcast_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, broadcast_enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
};
