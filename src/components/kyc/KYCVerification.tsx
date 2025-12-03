import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, CheckCircle, XCircle, Clock, FileText, Shield } from 'lucide-react';

interface KYCDocument {
  id: string;
  document_type: string;
  document_number: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card', description: 'Government ID proof' },
  { value: 'pan', label: 'PAN Card', description: 'Tax identification' },
  { value: 'gst', label: 'GST Certificate', description: 'For registered businesses' },
  { value: 'bank_statement', label: 'Bank Statement', description: 'Last 3 months' },
  { value: 'business_proof', label: 'Business Proof', description: 'Shop license or registration' },
];

export default function KYCVerification() {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading KYC documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedType || !selectedFile) {
      toast.error('Please select document type and file');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${selectedType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, selectedFile);

      if (uploadError) {
        // Create bucket if doesn't exist
        if (uploadError.message.includes('not found')) {
          toast.error('Storage not configured. Contact support.');
          return;
        }
        throw uploadError;
      }

      // Save document record
      const { error: insertError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: user.id,
          document_type: selectedType,
          document_url: fileName,
          document_number: documentNumber || null,
        });

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully! Under review.');
      setSelectedType('');
      setDocumentNumber('');
      setSelectedFile(null);
      loadDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getVerificationStatus = () => {
    if (documents.length === 0) return 'not_started';
    const approved = documents.filter(d => d.status === 'approved').length;
    if (approved >= 2) return 'verified';
    if (documents.some(d => d.status === 'pending')) return 'pending';
    return 'incomplete';
  };

  const status = getVerificationStatus();

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Status Card */}
      <Card className={`border-2 ${
        status === 'verified' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
        status === 'pending' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
        'border-border'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            KYC Verification Status
          </CardTitle>
          <CardDescription>
            {status === 'verified' ? 'Your account is fully verified!' :
             status === 'pending' ? 'Documents under review (24-48 hours)' :
             'Complete verification to unlock Seller Mode features'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status === 'verified' ? (
              <Badge className="bg-green-600 text-lg py-1 px-3">
                <CheckCircle className="w-4 h-4 mr-2" /> Verified Seller
              </Badge>
            ) : (
              <Badge variant="outline" className="text-lg py-1 px-3">
                {documents.filter(d => d.status === 'approved').length}/2 Documents Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      {status !== 'verified' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>Submit at least 2 documents for verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              {DOCUMENT_TYPES.map((type) => {
                const isUploaded = documents.some(d => d.document_type === type.value);
                return (
                  <button
                    key={type.value}
                    onClick={() => !isUploaded && setSelectedType(type.value)}
                    disabled={isUploaded}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedType === type.value ? 'border-primary bg-primary/5' :
                      isUploaded ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                      'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{type.label}</span>
                      {isUploaded && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                );
              })}
            </div>

            {selectedType && (
              <>
                {/* Document Number */}
                <div>
                  <Label>Document Number (Optional)</Label>
                  <Input
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder={`Enter ${DOCUMENT_TYPES.find(t => t.value === selectedType)?.label} number`}
                  />
                </div>

                {/* File Upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-6 h-6 text-primary" />
                      <span className="font-medium">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm">Click to upload document</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Submit Document'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submitted Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label}
                  </p>
                  {doc.document_number && (
                    <p className="text-sm text-muted-foreground">{doc.document_number}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(doc.status)}
                  {doc.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1">{doc.rejection_reason}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
