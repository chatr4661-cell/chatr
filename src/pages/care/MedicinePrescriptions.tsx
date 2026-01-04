import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, FileText, Check, X, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Prescription {
  id: string;
  image_url: string;
  doctor_name: string | null;
  hospital_name: string | null;
  prescription_date: string | null;
  status: string;
  ocr_parsed_data: any;
  created_at: string;
}

const MedicinePrescriptions = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prescription_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      // Create prescription record
      const { data: prescription, error: dbError } = await supabase
        .from('prescription_uploads')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Prescription uploaded! Processing with AI...');
      setPrescriptions(prev => [prescription, ...prev]);

      // Trigger OCR processing
      processWithOCR(prescription.id, publicUrl);
    } catch (error) {
      console.error('Error uploading prescription:', error);
      toast.error('Failed to upload prescription');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processWithOCR = async (prescriptionId: string, imageUrl: string) => {
    setProcessing(prescriptionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('parse-prescription', {
        body: { prescriptionId, imageUrl }
      });

      if (response.error) throw response.error;

      // Reload prescriptions to get updated data
      loadPrescriptions();
      toast.success('Prescription processed successfully!');
    } catch (error) {
      console.error('Error processing prescription:', error);
      toast.error('Failed to process prescription');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'processed': return <Badge className="bg-green-500">Processed</Badge>;
      case 'verified': return <Badge className="bg-blue-500">Verified</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const addMedicinesFromPrescription = (prescription: Prescription) => {
    if (!prescription.ocr_parsed_data?.medicines) {
      toast.error('No medicines found in this prescription');
      return;
    }
    // Navigate to subscribe with pre-filled medicines
    navigate('/care/medicines/subscribe', { 
      state: { medicines: prescription.ocr_parsed_data.medicines } 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Prescriptions</h1>
            <p className="text-sm text-muted-foreground">Upload & manage prescriptions</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Upload Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">AI-Powered Prescription Scanner</h3>
              <p className="text-sm opacity-90 mb-4">
                Upload your prescription and our AI will automatically detect medicines
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex gap-3 justify-center">
                <Button 
                  className="bg-white text-purple-600 hover:bg-white/90"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  className="border-white text-white hover:bg-white/20"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions List */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Your Prescriptions</h2>
          
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading prescriptions...</p>
              </CardContent>
            </Card>
          ) : prescriptions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Prescriptions Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your first prescription to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {prescription.image_url ? (
                          <img 
                            src={prescription.image_url} 
                            alt="Prescription"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          {getStatusBadge(prescription.status)}
                          {processing === prescription.id && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Processing...
                            </div>
                          )}
                        </div>

                        {prescription.doctor_name && (
                          <p className="text-sm font-medium">{prescription.doctor_name}</p>
                        )}
                        {prescription.hospital_name && (
                          <p className="text-xs text-muted-foreground">{prescription.hospital_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploaded: {format(new Date(prescription.created_at), 'dd MMM yyyy')}
                        </p>

                        {/* Parsed Medicines */}
                        {prescription.ocr_parsed_data?.medicines && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Detected Medicines:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {prescription.ocr_parsed_data.medicines.slice(0, 3).map((med: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {med.name}
                                </Badge>
                              ))}
                              {prescription.ocr_parsed_data.medicines.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{prescription.ocr_parsed_data.medicines.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {prescription.status === 'processed' && prescription.ocr_parsed_data?.medicines && (
                          <Button 
                            size="sm" 
                            className="mt-3"
                            onClick={() => addMedicinesFromPrescription(prescription)}
                          >
                            Add to Subscription
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicinePrescriptions;
