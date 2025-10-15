import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Mail, Phone, Award, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DoctorApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  qualification: string;
  experience_years: number;
  registration_number: string;
  hospital_affiliation: string | null;
  consultation_fee: number | null;
  preferred_language: string | null;
  bio: string | null;
  certifications: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export default function DoctorApplications() {
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<DoctorApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as DoctorApplication[]);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('doctor_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Application approved successfully");
      fetchApplications();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast.error("Failed to approve application");
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      const { error } = await supabase
        .from('doctor_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedApp.id);

      if (error) throw error;
      
      toast.success("Application rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedApp(null);
      fetchApplications();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast.error("Failed to reject application");
    }
  };

  const openRejectDialog = (app: DoctorApplication) => {
    setSelectedApp(app);
    setShowRejectDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Doctor Applications</h1>
        <p className="text-muted-foreground">Review and manage healthcare provider applications</p>
      </div>

      <div className="grid gap-4">
        {applications.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{app.full_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {app.specialty} • {app.experience_years} years experience
                  </CardDescription>
                </div>
                {getStatusBadge(app.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{app.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{app.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span>{app.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{app.hospital_affiliation || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Registration No:</span>
                    <span className="ml-2 font-medium">{app.registration_number}</span>
                  </div>
                  {app.consultation_fee && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Consultation Fee:</span>
                      <span className="ml-2 font-medium">₹{app.consultation_fee}</span>
                    </div>
                  )}
                  {app.preferred_language && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Language:</span>
                      <span className="ml-2">{app.preferred_language}</span>
                    </div>
                  )}
                  {app.certifications && app.certifications.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Certifications:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {app.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {app.bio && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{app.bio}</p>
                </div>
              )}

              {app.rejection_reason && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                  <p className="text-sm text-muted-foreground mt-1">{app.rejection_reason}</p>
                </div>
              )}

              {app.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleApprove(app.id)} className="flex-1">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button onClick={() => openRejectDialog(app)} variant="destructive" className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Applied: {new Date(app.created_at).toLocaleDateString()}
                {app.reviewed_at && ` • Reviewed: ${new Date(app.reviewed_at).toLocaleDateString()}`}
              </div>
            </CardContent>
          </Card>
        ))}

        {applications.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No doctor applications yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedApp?.full_name}'s application
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
              setSelectedApp(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
