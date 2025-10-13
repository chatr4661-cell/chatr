import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, Building2, Heart, Newspaper } from 'lucide-react';
import { toast } from 'sonner';

interface OfficialAccount {
  id: string;
  account_name: string;
  account_type: 'service' | 'subscription' | 'community';
  description: string;
  logo_url: string;
  is_verified: boolean;
  follower_count: number;
  category: string;
}

const OfficialAccountsManager = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<OfficialAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OfficialAccount | null>(null);
  const [formData, setFormData] = useState<{
    account_name: string;
    account_type: 'service' | 'subscription' | 'community';
    description: string;
    logo_url: string;
    is_verified: boolean;
    category: string;
  }>({
    account_name: '',
    account_type: 'service',
    description: '',
    logo_url: '',
    is_verified: true,
    category: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('official_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAccounts(data as OfficialAccount[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    
    if (editingAccount) {
      const { error } = await supabase
        .from('official_accounts')
        .update(formData)
        .eq('id', editingAccount.id);
      
      if (error) {
        toast.error('Failed to update account');
        return;
      }
      toast.success('Account updated successfully');
    } else {
      const { error } = await supabase
        .from('official_accounts')
        .insert([{ ...formData, user_id: user.id }]);
      
      if (error) {
        toast.error('Failed to create account');
        return;
      }
      toast.success('Account created successfully');
    }
    
    setIsDialogOpen(false);
    setEditingAccount(null);
    resetForm();
    loadAccounts();
  };

  const handleEdit = (account: OfficialAccount) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type,
      description: account.description,
      logo_url: account.logo_url || '',
      is_verified: account.is_verified,
      category: account.category,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    const { error } = await supabase
      .from('official_accounts')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete account');
      return;
    }
    
    toast.success('Account deleted');
    loadAccounts();
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      account_type: 'service',
      description: '',
      logo_url: '',
      is_verified: true,
      category: '',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service': return <Building2 className="w-4 h-4" />;
      case 'subscription': return <Newspaper className="w-4 h-4" />;
      case 'community': return <Heart className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Manage Official Accounts</h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Edit' : 'Create'} Official Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Account Name</Label>
                  <Input
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value: any) => setFormData({ ...formData, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Technology, Professional, News"
                    required
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
                
                <div>
                  <Label>Logo URL (optional)</Label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={formData.is_verified}
                    onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="verified">Verified Account</Label>
                </div>
                
                <Button type="submit" className="w-full">
                  {editingAccount ? 'Update' : 'Create'} Account
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    {account.logo_url ? (
                      <img src={account.logo_url} alt={account.account_name} className="w-10 h-10 rounded-full" />
                    ) : (
                      getTypeIcon(account.account_type)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold">{account.account_name}</h3>
                      {account.is_verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getTypeIcon(account.account_type)}
                      <span className="ml-1 capitalize">{account.account_type}</span>
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(account)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{account.description}</p>
              <div className="text-xs text-muted-foreground">
                Category: {account.category} • {account.follower_count} followers
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfficialAccountsManager;
