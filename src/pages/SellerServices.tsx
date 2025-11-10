import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Upload,
  X,
  IndianRupee,
  Clock,
  Eye,
  EyeOff,
  Download,
  Copy,
  CheckSquare
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import logo from '@/assets/chatr-logo.png';

interface Service {
  id: string;
  seller_id: string;
  category_id: string;
  service_name: string;
  description: string;
  price_type: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  images: any;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: 'home-services', name: 'Home Services' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness' },
  { id: 'repairs', name: 'Repairs' },
  { id: 'cleaning', name: 'Cleaning' },
  { id: 'education', name: 'Education' },
  { id: 'health', name: 'Health' },
  { id: 'other', name: 'Other' },
];

export default function SellerServices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  
  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    service_name: '',
    category_id: '',
    description: '',
    price_type: 'fixed',
    price: '',
    duration_minutes: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: sellerData } = await supabase
        .from('chatr_plus_sellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sellerData) {
        navigate('/chatr-plus/seller-registration');
        return;
      }

      setSellerId(sellerData.id);

      const { data: servicesData, error } = await supabase
        .from('chatr_plus_services')
        .select('*')
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setServices(servicesData || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 5) {
      toast({
        title: 'Too many images',
        description: 'You can upload maximum 5 images',
        variant: 'destructive',
      });
      return;
    }

    setImageFiles(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `service-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleAddService = async () => {
    if (!sellerId) return;

    if (!formData.service_name || !formData.category_id || !formData.price || !formData.duration_minutes) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const imageUrls = await uploadImages();

      const { error } = await supabase
        .from('chatr_plus_services')
        .insert({
          seller_id: sellerId,
          service_name: formData.service_name,
          category_id: formData.category_id,
          description: formData.description,
          price_type: formData.price_type,
          price: parseInt(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          image_url: imageUrls[0] || null,
          images: imageUrls.length > 0 ? imageUrls : null,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service added successfully',
      });

      resetForm();
      setAddOpen(false);
      loadServices();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: 'Error',
        description: 'Failed to add service',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditService = async () => {
    if (!selectedService) return;

    setUploading(true);
    try {
      const imageUrls = imageFiles.length > 0 ? await uploadImages() : [];
      const existingImages = selectedService.images || [];
      const allImages = [...existingImages, ...imageUrls];

      const { error } = await supabase
        .from('chatr_plus_services')
        .update({
          service_name: formData.service_name,
          category_id: formData.category_id,
          description: formData.description,
          price_type: formData.price_type,
          price: parseInt(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          image_url: allImages[0] || null,
          images: allImages.length > 0 ? allImages : null,
        })
        .eq('id', selectedService.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service updated successfully',
      });

      resetForm();
      setEditOpen(false);
      loadServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('chatr_plus_services')
        .update({ is_active: !currentStatus })
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Service ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    try {
      const { error } = await supabase
        .from('chatr_plus_services')
        .delete()
        .eq('id', selectedService.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service deleted successfully',
      });

      setDeleteOpen(false);
      setSelectedService(null);
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({
      service_name: service.service_name,
      category_id: service.category_id,
      description: service.description || '',
      price_type: service.price_type,
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
    });
    setEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      category_id: '',
      description: '',
      price_type: 'fixed',
      price: '',
      duration_minutes: '',
    });
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedService(null);
  };

  const getCategoryName = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === services.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(services.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('chatr_plus_services')
        .update({ is_active: true })
        .in('id', selectedIds);

      if (error) throw error;

      toast({ title: 'Success', description: `${selectedIds.length} services activated` });
      setSelectedIds([]);
      loadServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to activate services', variant: 'destructive' });
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('chatr_plus_services')
        .update({ is_active: false })
        .in('id', selectedIds);

      if (error) throw error;

      toast({ title: 'Success', description: `${selectedIds.length} services deactivated` });
      setSelectedIds([]);
      loadServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to deactivate services', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('chatr_plus_services')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({ title: 'Success', description: `${selectedIds.length} services deleted` });
      setSelectedIds([]);
      setBulkActionOpen(false);
      loadServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete services', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('chatr_plus_services')
        .insert({
          seller_id: service.seller_id,
          service_name: `${service.service_name} (Copy)`,
          category_id: service.category_id,
          description: service.description,
          price_type: service.price_type,
          price: service.price,
          duration_minutes: service.duration_minutes,
          image_url: service.image_url,
          images: service.images,
          is_active: false,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Service duplicated successfully' });
      loadServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to duplicate service', variant: 'destructive' });
    }
  };

  const exportToCSV = () => {
    const selectedServices = services.filter(s => selectedIds.includes(s.id));
    const csvData = selectedServices.map(s => ({
      Name: s.service_name,
      Category: getCategoryName(s.category_id),
      Price: s.price,
      PriceType: s.price_type,
      Duration: s.duration_minutes,
      Status: s.is_active ? 'Active' : 'Inactive',
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `services_${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/seller')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Services Management</h1>
                <p className="text-sm text-muted-foreground">
                  {services.length} service{services.length !== 1 ? 's' : ''} 
                  {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleBulkActivate}>
                    <Eye className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setBulkActionOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {services.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No services yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by adding your first service to attract customers
              </p>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {services.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === services.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select all services
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="overflow-hidden relative">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedIds.includes(service.id)}
                      onCheckedChange={() => toggleSelect(service.id)}
                    />
                  </div>
                  {/* Service Image */}
                <div className="relative h-48 bg-muted">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt={service.service_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Service Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{service.service_name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {getCategoryName(service.category_id)}
                  </p>
                  
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {service.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <IndianRupee className="h-4 w-4" />
                        Price
                      </span>
                      <span className="font-semibold">
                        ₹{service.price}
                        {service.price_type === 'hourly' && '/hr'}
                        {service.price_type === 'starting_from' && '+'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Duration
                      </span>
                      <span>{service.duration_minutes} mins</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(service)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(service)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(service.id, service.is_active)}
                    >
                      {service.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedService(service);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Services</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} service{selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="service_name">Service Name *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                placeholder="e.g., Home Cleaning"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your service..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price_type">Pricing Type *</Label>
                <Select value={formData.price_type} onValueChange={(value) => setFormData({ ...formData, price_type: value })}>
                  <SelectTrigger id="price_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="starting_from">Starting From</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="60"
              />
            </div>

            <div>
              <Label>Service Images (Max 5)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload images
                    </p>
                  </div>
                </label>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddService} disabled={uploading}>
              {uploading ? 'Adding...' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Same form fields as Add Service */}
            <div>
              <Label htmlFor="edit_service_name">Service Name *</Label>
              <Input
                id="edit_service_name"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_category">Category *</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger id="edit_category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_price_type">Pricing Type *</Label>
                <Select value={formData.price_type} onValueChange={(value) => setFormData({ ...formData, price_type: value })}>
                  <SelectTrigger id="edit_price_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="starting_from">Starting From</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_price">Price (₹) *</Label>
                <Input
                  id="edit_price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_duration">Duration (minutes) *</Label>
              <Input
                id="edit_duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              />
            </div>

            <div>
              <Label>Add More Images</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label htmlFor="edit-image-upload">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition">
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Upload additional images
                    </p>
                  </div>
                </label>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`New ${index + 1}`} className="w-full h-24 object-cover rounded" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditService} disabled={uploading}>
              {uploading ? 'Updating...' : 'Update Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedService?.service_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
