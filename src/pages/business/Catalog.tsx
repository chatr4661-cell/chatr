import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Edit, Trash2, Package, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  currency: string;
  is_service: boolean;
  is_active: boolean;
  stock_quantity: number | null;
  images: any;
}

export default function BusinessCatalog() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>('');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [isService, setIsService] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [stockQuantity, setStockQuantity] = useState('');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        navigate('/business/onboard');
        return;
      }

      setBusinessId(profile.id);

      const { data, error } = await supabase
        .from('business_catalog')
        .select('*')
        .eq('business_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast({
        title: 'Error',
        description: 'Failed to load catalog',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setPrice('');
    setIsService(false);
    setIsActive(true);
    setStockQuantity('');
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!name || !category) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const itemData = {
        business_id: businessId,
        name,
        description,
        category,
        price: price ? parseFloat(price) : null,
        is_service: isService,
        is_active: isActive,
        stock_quantity: !isService && stockQuantity ? parseInt(stockQuantity) : null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('business_catalog')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Item updated successfully' });
      } else {
        const { error } = await supabase
          .from('business_catalog')
          .insert([itemData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Item added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      loadCatalog();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setCategory(item.category);
    setPrice(item.price?.toString() || '');
    setIsService(item.is_service);
    setIsActive(item.is_active);
    setStockQuantity(item.stock_quantity?.toString() || '');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('business_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Item deleted successfully' });
      loadCatalog();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
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
      <div className="sticky top-0 z-10 border-b glass-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/business')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Products & Services</h1>
                <p className="text-sm text-muted-foreground">Manage your catalog</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Item description" rows={3} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Electronics" />
                    </div>

                    <div className="space-y-2">
                      <Label>Price (₹)</Label>
                      <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Service</p>
                      <p className="text-sm text-muted-foreground">This is a service, not a physical product</p>
                    </div>
                    <Switch checked={isService} onCheckedChange={setIsService} />
                  </div>

                  {!isService && (
                    <div className="space-y-2">
                      <Label>Stock Quantity</Label>
                      <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Available quantity" />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Active</p>
                      <p className="text-sm text-muted-foreground">Make this item visible to customers</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1 bg-gradient-hero">
                      {editingItem ? 'Update' : 'Add'} Item
                    </Button>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {catalogItems.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No items yet</h3>
              <p className="text-muted-foreground mb-4">Start building your catalog by adding products or services</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-hero">
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogItems.map((item) => (
              <Card key={item.id} className="glass-card hover:shadow-glow transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={item.is_service ? "default" : "secondary"} className="text-xs">
                          {item.is_service ? 'Service' : 'Product'}
                        </Badge>
                        <Badge variant={item.is_active ? "default" : "outline"} className="text-xs">
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description || 'No description'}</p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{item.category}</span>
                  </div>

                  {item.price && (
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <DollarSign className="h-5 w-5 text-primary" />
                      ₹{item.price.toLocaleString()}
                    </div>
                  )}

                  {!item.is_service && item.stock_quantity !== null && (
                    <p className="text-sm text-muted-foreground">
                      Stock: {item.stock_quantity} units
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
