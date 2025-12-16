import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Check, X, Eye, Store, MapPin, Phone, Mail, FileText, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KycDocument {
  type: string;
  url: string;
}

interface SellerApplication {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string | null;
  logo_url: string | null;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  approval_status: string | null;
  kyc_status: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
  gstin: string | null;
  kyc_documents: KycDocument[] | null;
  created_at: string | null;
}

export default function SellerApprovals() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<SellerApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSellers();
  }, [statusFilter]);

  const loadSellers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_plus_sellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSellers((data || []) as unknown as SellerApplication[]);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Failed to load seller applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (seller: SellerApplication) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('chatr_plus_sellers')
        .update({
          approval_status: 'approved',
          kyc_status: 'verified',
          is_active: true,
          is_verified: true,
          subscription_status: 'active',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', seller.id);

      if (error) throw error;

      toast.success(`${seller.business_name} has been approved!`);
      setSelectedSeller(null);
      loadSellers();
    } catch (error) {
      console.error('Error approving seller:', error);
      toast.error('Failed to approve seller');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (seller: SellerApplication) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('chatr_plus_sellers')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', seller.id);

      if (error) throw error;

      toast.success(`${seller.business_name} has been rejected`);
      setSelectedSeller(null);
      setRejectionReason('');
      loadSellers();
    } catch (error) {
      console.error('Error rejecting seller:', error);
      toast.error('Failed to reject seller');
    } finally {
      setProcessing(false);
    }
  };

  const filteredSellers = sellers.filter(s => 
    s.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Seller Approvals</h1>
              <p className="text-sm text-muted-foreground">Review and approve seller registrations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredSellers.length === 0 ? (
          <Card className="p-12 text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No sellers found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'pending' ? 'No pending applications to review' : 'No sellers match your criteria'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSellers.map((seller) => (
              <Card key={seller.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden">
                    {seller.logo_url ? (
                      <img src={seller.logo_url} alt={seller.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{seller.business_name}</h3>
                      {getStatusBadge(seller.approval_status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{seller.business_type}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{seller.city}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{seller.phone_number}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{seller.email}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSeller(seller)}>
                    <Eye className="w-4 h-4 mr-1" /> Review
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedSeller} onOpenChange={() => { setSelectedSeller(null); setRejectionReason(''); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Seller Application</DialogTitle>
            <DialogDescription>Review the business details and KYC documents</DialogDescription>
          </DialogHeader>
          
          {selectedSeller && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden">
                  {selectedSeller.logo_url ? (
                    <img src={selectedSeller.logo_url} alt={selectedSeller.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Store className="w-10 h-10 text-muted-foreground" /></div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedSeller.business_name}</h3>
                  <p className="text-muted-foreground">{selectedSeller.business_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {selectedSeller.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedSeller.phone_number}</div>
                <div><span className="text-muted-foreground">City:</span> {selectedSeller.city}, {selectedSeller.state}</div>
                <div><span className="text-muted-foreground">Pincode:</span> {selectedSeller.pincode}</div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> KYC Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                  <div><span className="text-muted-foreground">PAN:</span> {selectedSeller.pan_number}</div>
                  <div><span className="text-muted-foreground">Aadhar:</span> {selectedSeller.aadhar_number}</div>
                  {selectedSeller.gstin && <div><span className="text-muted-foreground">GSTIN:</span> {selectedSeller.gstin}</div>}
                </div>
              </div>

              {selectedSeller.kyc_documents?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Documents</h4>
                  <div className="flex gap-2">
                    {selectedSeller.kyc_documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80">
                        View {doc.type.toUpperCase()}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedSeller.approval_status === 'pending' && (
                <>
                  <Textarea
                    placeholder="Rejection reason (required for rejection)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => handleApprove(selectedSeller)} disabled={processing}>
                      <Check className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleReject(selectedSeller)} disabled={processing}>
                      <X className="w-4 h-4 mr-2" /> Reject
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
