import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function ProviderServices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: ""
  });

  useEffect(() => {
    loadServices();

    // Real-time subscription
    const channel = supabase
      .channel('services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        () => {
          loadServices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: provider } = await supabase
        .from("service_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!provider) {
        navigate("/");
        return;
      }

      setProviderId(provider.id);

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
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
      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : null,
            duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          })
          .eq("id", editingService.id);

        if (error) throw error;
        toast({ title: "Service updated successfully" });
      } else {
        const { error } = await supabase
          .from("services")
          .insert({
            provider_id: providerId,
            name: formData.name,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : null,
            duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          });

        if (error) throw error;
        toast({ title: "Service added successfully" });
      }

      setFormData({ name: "", description: "", price: "", duration_minutes: "" });
      setEditingService(null);
      setIsDialogOpen(false);
      loadServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !currentStatus })
        .eq("id", serviceId);

      if (error) throw error;
      toast({ title: currentStatus ? "Service deactivated" : "Service activated" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;
      toast({ title: "Service deleted" });
      loadServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price?.toString() || "",
      duration_minutes: service.duration_minutes?.toString() || ""
    });
    setIsDialogOpen(true);
  };

  if (loading) {
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
            onClick={() => navigate("/provider-portal")}
            className="h-6 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h1 className="text-sm font-bold">Manage Services</h1>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 mb-3 text-xs" onClick={() => {
              setEditingService(null);
              setFormData({ name: "", description: "", price: "", duration_minutes: "" });
            }}>
              <Plus className="h-3 w-3 mr-1" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-background/95 border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Service Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (mins)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="h-7 text-xs w-full">
                {editingService ? "Update" : "Add"} Service
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {services.map((service) => (
            <Card key={service.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold mb-1">{service.name}</h3>
                  {service.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1">{service.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {service.price && (
                      <span className="text-[10px] font-semibold">₹{service.price}</span>
                    )}
                    {service.duration_minutes && (
                      <>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">{service.duration_minutes} mins</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">Active:</span>
                    <Switch
                      checked={service.is_active}
                      onCheckedChange={() => toggleActive(service.id, service.is_active)}
                      className="scale-75"
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(service)}
                    className="h-6 px-2"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteService(service.id)}
                    className="h-6 px-2"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {services.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No services added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}