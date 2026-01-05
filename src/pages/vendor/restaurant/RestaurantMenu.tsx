import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Search, Edit2, Trash2, 
  MoreVertical, Image, Leaf, Flame, Clock,
  GripVertical, Check, X, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discounted_price: number | null;
  image_url: string | null;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  preparation_time: number;
  category_id: string | null;
  spice_level: number;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
}

export default function RestaurantMenu() {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    discounted_price: '',
    is_veg: true,
    is_bestseller: false,
    preparation_time: '15',
    spice_level: 1,
    category_id: '',
  });

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/vendor/login');
        return;
      }

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vendor) {
        navigate('/vendor/register');
        return;
      }

      setVendorId(vendor.id);

      // Load categories
      const { data: cats } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('display_order');

      setCategories(cats || []);

      // Load menu items
      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('display_order');

      setMenuItems(items || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !vendorId) return;

    try {
      const { error } = await supabase
        .from('menu_categories')
        .insert({
          vendor_id: vendorId,
          name: newCategoryName.trim(),
          display_order: categories.length,
        });

      if (error) throw error;

      toast.success('Category added');
      setNewCategoryName('');
      setShowAddCategory(false);
      loadMenuData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add category');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !newItem.price || !vendorId) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .insert({
          vendor_id: vendorId,
          name: newItem.name.trim(),
          description: newItem.description.trim(),
          price: parseFloat(newItem.price),
          discounted_price: newItem.discounted_price ? parseFloat(newItem.discounted_price) : null,
          is_veg: newItem.is_veg,
          is_bestseller: newItem.is_bestseller,
          preparation_time: parseInt(newItem.preparation_time),
          spice_level: newItem.spice_level,
          category_id: newItem.category_id || null,
        });

      if (error) throw error;

      toast.success('Item added');
      setShowAddItem(false);
      setNewItem({
        name: '',
        description: '',
        price: '',
        discounted_price: '',
        is_veg: true,
        is_bestseller: false,
        preparation_time: '15',
        spice_level: 1,
        category_id: '',
      });
      loadMenuData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;

      setMenuItems(prev => 
        prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i)
      );
      toast.success(item.is_available ? 'Item marked unavailable' : 'Item marked available');
    } catch (error: any) {
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setMenuItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Item deleted');
    } catch (error: any) {
      toast.error('Failed to delete item');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/vendor/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Menu Management</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input 
            placeholder="Search menu items..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Categories</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddCategory(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge 
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSelectedCategory(null)}
          >
            All Items ({menuItems.length})
          </Badge>
          {categories.map(cat => (
            <Badge 
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name} ({menuItems.filter(i => i.category_id === cat.id).length})
            </Badge>
          ))}
        </div>
      </div>

      {/* Add Item Button */}
      <div className="p-4">
        <Button 
          className="w-full"
          onClick={() => setShowAddItem(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        <AnimatePresence>
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!item.is_available ? 'opacity-60' : ''}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 border-2 ${item.is_veg ? 'border-green-500' : 'border-red-500'} flex items-center justify-center`}>
                            <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                          <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                          {item.is_bestseller && (
                            <Badge variant="secondary" className="text-xs">★ Bestseller</Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingItem(item)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleItemAvailability(item)}>
                              {item.is_available ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Mark Unavailable
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark Available
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-500"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          {item.discounted_price ? (
                            <>
                              <span className="font-bold text-green-600">₹{item.discounted_price}</span>
                              <span className="text-xs text-muted-foreground line-through">₹{item.price}</span>
                            </>
                          ) : (
                            <span className="font-bold">₹{item.price}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {item.preparation_time} min
                        </div>
                        {item.spice_level > 1 && (
                          <div className="flex items-center gap-1">
                            {[...Array(item.spice_level)].map((_, i) => (
                              <Flame key={i} className="w-3 h-3 text-red-500" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No menu items found</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => setShowAddItem(true)}
            >
              Add your first item
            </Button>
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="categoryName">Category Name</Label>
            <Input 
              id="categoryName"
              placeholder="e.g., Starters, Main Course, Beverages"
              className="mt-2"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <Input 
                id="itemName"
                placeholder="Enter item name"
                className="mt-1"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="itemDesc">Description</Label>
              <Textarea 
                id="itemDesc"
                placeholder="Describe the item..."
                className="mt-1"
                rows={2}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemPrice">Price (₹) *</Label>
                <Input 
                  id="itemPrice"
                  type="number"
                  placeholder="0"
                  className="mt-1"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="itemDiscount">Discounted Price</Label>
                <Input 
                  id="itemDiscount"
                  type="number"
                  placeholder="Optional"
                  className="mt-1"
                  value={newItem.discounted_price}
                  onChange={(e) => setNewItem({ ...newItem, discounted_price: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <select
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={newItem.category_id}
                onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
              >
                <option value="">No Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-500" />
                <Label>Vegetarian</Label>
              </div>
              <Switch 
                checked={newItem.is_veg}
                onCheckedChange={(checked) => setNewItem({ ...newItem, is_veg: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Mark as Bestseller</Label>
              <Switch 
                checked={newItem.is_bestseller}
                onCheckedChange={(checked) => setNewItem({ ...newItem, is_bestseller: checked })}
              />
            </div>

            <div>
              <Label>Preparation Time: {newItem.preparation_time} mins</Label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={newItem.preparation_time}
                onChange={(e) => setNewItem({ ...newItem, preparation_time: e.target.value })}
                className="w-full mt-2"
              />
            </div>

            <div>
              <Label>Spice Level</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <Button
                    key={level}
                    variant={newItem.spice_level === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewItem({ ...newItem, spice_level: level })}
                  >
                    {[...Array(level)].map((_, i) => (
                      <Flame key={i} className="w-3 h-3" />
                    ))}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
