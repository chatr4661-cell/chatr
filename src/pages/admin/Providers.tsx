import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Check, X, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminProviders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [formData, setFormData] = useState({
    business_name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: ""
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin permissions',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    loadProviders();
  };

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingProvider) {
        const { error } = await supabase
          .from("service_providers")
          .update({
            business_name: formData.business_name,
            description: formData.description,
            address: formData.address,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          })
          .eq("id", editingProvider.id);

        if (error) throw error;
        toast({ title: "Provider updated successfully" });
      } else {
        const { error } = await supabase
          .from("service_providers")
          .insert({
            user_id: user.id,
            business_name: formData.business_name,
            description: formData.description,
            address: formData.address,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          });

        if (error) throw error;
        toast({ title: "Provider added successfully" });
      }

      setFormData({ business_name: "", description: "", address: "", latitude: "", longitude: "" });
      setEditingProvider(null);
      setIsDialogOpen(false);
      loadProviders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleVerification = async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("service_providers")
        .update({ is_verified: !currentStatus })
        .eq("id", providerId);

      if (error) throw error;
      toast({ title: currentStatus ? "Provider unverified" : "Provider verified" });
      loadProviders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (provider: any) => {
    setEditingProvider(provider);
    setFormData({
      business_name: provider.business_name,
      description: provider.description || "",
      address: provider.address || "",
      latitude: provider.latitude?.toString() || "",
      longitude: provider.longitude?.toString() || ""
    });
    setIsDialogOpen(true);
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="h-6 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h1 className="text-sm font-bold">Manage Providers</h1>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 mb-3 text-xs" onClick={() => {
              setEditingProvider(null);
              setFormData({ business_name: "", description: "", address: "", latitude: "", longitude: "" });
            }}>
              <Plus className="h-3 w-3 mr-1" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-background/95 border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingProvider ? "Edit Provider" : "Add New Provider"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Business Name</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="h-7 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-xs min-h-[60px]"
                />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="h-7 text-xs w-full">
                {editingProvider ? "Update" : "Add"} Provider
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {providers.map((provider) => (
            <Card key={provider.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-semibold truncate">{provider.business_name}</h3>
                    {provider.is_verified && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        <Check className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                  {provider.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1">{provider.description}</p>
                  )}
                  {provider.address && (
                    <p className="text-[10px] text-muted-foreground truncate">{provider.address}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">Rating: {provider.rating}/5</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">{provider.total_reviews} reviews</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(provider)}
                    className="h-6 px-2"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={provider.is_verified ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleVerification(provider.id, provider.is_verified)}
                    className="h-6 px-2"
                  >
                    {provider.is_verified ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}