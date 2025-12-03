import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Search, Check, X, Eye, Download, User, FileText, Clock, AlertCircle } from 'lucide-react';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_number: string;
  document_url: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export default function KYCApprovals() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('kyc_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch profiles separately for each document
      const docsWithProfiles = await Promise.all(
        (data || []).map(async (doc) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', doc.user_id)
            .single();
          
          return {
            ...doc,
            profiles: profile || undefined
          };
        })
      );
      
      setDocuments(docsWithProfiles as KYCDocument[]);
    } catch (error) {
      console.error('Error loading KYC documents:', error);
      toast.error('Failed to load KYC documents');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc: KYCDocument) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', doc.id);

      if (error) throw error;

      // Update user's verification status (column may not exist yet)
      try {
        await supabase
          .from('profiles')
          .update({ kyc_verified: true } as any)
          .eq('id', doc.user_id);
      } catch (e) {
        console.log('KYC verified column not found, skipping profile update');
      }

      toast.success('Document approved successfully');
      loadDocuments();
      setSelectedDoc(null);
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Failed to approve document');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (doc: KYCDocument) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectionReason
        })
        .eq('id', doc.id);

      if (error) throw error;

      // Send notification to user
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: doc.user_id,
          title: 'KYC Document Rejected',
          body: `Your ${doc.document_type} was rejected. Reason: ${rejectionReason}`,
          notificationType: 'update'
        }
      });

      toast.success('Document rejected');
      loadDocuments();
      setSelectedDoc(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Failed to reject document');
    } finally {
      setProcessing(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const profile = doc.profiles as any;
    return (
      profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const stats = {
    pending: documents.filter(d => d.status === 'pending').length,
    approved: documents.filter(d => d.status === 'approved').length,
    rejected: documents.filter(d => d.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">KYC Approvals</h1>
            <p className="text-xs text-muted-foreground">Review identity verification documents</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
          <Card className="p-4 text-center">
            <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </Card>
          <Card className="p-4 text-center">
            <X className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or document number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'pending' ? 'No pending KYC documents to review' : 'No documents match your criteria'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => {
              const profile = doc.profiles as any;
              return (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{profile?.full_name || profile?.username || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_type} • {doc.document_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      {doc.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(doc)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review KYC Document</DialogTitle>
            <DialogDescription>
              Verify the document details and approve or reject
            </DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Document Type</label>
                  <p className="font-medium">{selectedDoc.document_type}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Document Number</label>
                  <p className="font-medium">{selectedDoc.document_number}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Submitted</label>
                  <p className="font-medium">{new Date(selectedDoc.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <Badge className={getStatusColor(selectedDoc.status)}>
                    {selectedDoc.status}
                  </Badge>
                </div>
              </div>

              {/* Document Preview */}
              <div className="border rounded-lg p-4">
                <label className="text-sm text-muted-foreground block mb-2">Document Image</label>
                <img
                  src={selectedDoc.document_url}
                  alt="Document"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open(selectedDoc.document_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  View Full Size
                </Button>
              </div>

              {selectedDoc.rejection_reason && (
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <p className="font-medium">Rejection Reason</p>
                  </div>
                  <p className="text-sm mt-1">{selectedDoc.rejection_reason}</p>
                </div>
              )}

              {selectedDoc.status === 'pending' && (
                <>
                  <Textarea
                    placeholder="Enter rejection reason (required for rejection)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedDoc(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedDoc)}
                      disabled={processing}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedDoc)}
                      disabled={processing}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
