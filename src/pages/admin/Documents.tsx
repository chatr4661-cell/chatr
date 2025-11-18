import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDocuments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
    loadDocuments();
  };

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, business_name")
        .order("business_name");

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

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from("provider-certificates")
        .list();

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedProvider) {
      toast({
        title: "Error",
        description: "Please select a provider and file",
        variant: "destructive"
      });
      return;
    }

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedProvider}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("provider-certificates")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update provider's document_urls
      const { data: provider } = await supabase
        .from("service_providers")
        .select("other_documents")
        .eq("id", selectedProvider)
        .single();

      const currentDocs = (provider?.other_documents as string[]) || [];
      const { data: { publicUrl } } = supabase.storage
        .from("provider-certificates")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("service_providers")
        .update({
          other_documents: [...currentDocs, publicUrl]
        })
        .eq("id", selectedProvider);

      if (updateError) throw updateError;

      toast({ title: "Document uploaded successfully" });
      loadDocuments();
      e.target.value = "";
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from("provider-certificates")
        .remove([path]);

      if (error) throw error;

      toast({ title: "Document deleted" });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
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
            onClick={() => navigate("/admin")}
            className="h-6 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h1 className="text-sm font-bold">Upload Documents</h1>
        </div>

        <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10 mb-3">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Select Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Choose provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Upload Certificate/Document</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={!selectedProvider || uploading}
                  className="h-7 text-xs"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {uploading && (
                  <span className="text-xs text-muted-foreground">Uploading...</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Accepted formats: PDF, JPG, PNG
              </p>
            </div>
          </div>
        </Card>

        <h2 className="text-xs font-semibold mb-2">Uploaded Documents</h2>
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(doc.metadata?.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(doc.name)}
                  className="h-6 px-2"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
          {documents.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No documents uploaded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}