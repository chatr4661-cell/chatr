import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, ExternalLink, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AppSubmission {
  id: string;
  app_name: string;
  app_url: string;
  description: string | null;
  category_id: string | null;
  icon_url: string | null;
  submission_status: string | null;
  developer_id: string | null;
  submitted_at: string | null;
  created_at: string | null;
  developer_name?: string;
  rejection_reason?: string | null;
}

export default function AppApprovals() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<AppSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revenueShare, setRevenueShare] = useState(7.5);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('app_submissions')
        .select(`
          *,
          developer_profiles!app_submissions_developer_id_fkey (
            developer_name
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(item => ({
        ...item,
        developer_name: (item as any).developer_profiles?.developer_name || 'Unknown'
      })) || [];

      setSubmissions(formatted);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: AppSubmission) => {
    try {
      // Create the mini app
      const { error: appError } = await supabase
        .from('mini_apps')
        .insert({
          app_name: submission.app_name,
          app_url: submission.app_url,
          description: submission.description,
          category_id: submission.category_id,
          icon_url: submission.icon_url,
          developer_id: submission.developer_id,
          is_verified: true,
          is_active: true,
          rating_average: 5.0,
          revenue_share_percent: revenueShare
        });

      if (appError) throw appError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('app_submissions')
        .update({
          submission_status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success(`${submission.app_name} approved and published!`);
      setSelectedApp(null);
      loadSubmissions();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve app');
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('app_submissions')
        .update({
          submission_status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('App submission rejected');
      setSelectedApp(null);
      setRejectionReason('');
      loadSubmissions();
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject app');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingApps = submissions.filter(s => s.submission_status === 'pending');
  const approvedApps = submissions.filter(s => s.submission_status === 'approved');
  const rejectedApps = submissions.filter(s => s.submission_status === 'rejected');

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">App Approvals</h1>
          <p className="text-muted-foreground">Review and approve mini-app submissions</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Back to Admin
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingApps.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedApps.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedApps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingApps.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No pending submissions</p>
            </Card>
          ) : (
            pendingApps.map(app => (
              <Card key={app.id} className="p-4">
                <div className="flex items-start gap-4">
                  <img 
                    src={app.icon_url} 
                    alt={app.app_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{app.app_name}</h3>
                      {getStatusBadge(app.submission_status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{app.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>By: {app.developer_name}</span>
                      <span>Category: {app.category}</span>
                      <span>Revenue Share: {app.revenue_share_percent}%</span>
                      <a 
                        href={app.app_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Preview <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedApp(app);
                        setRevenueShare(app.revenue_share_percent);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedApps.map(app => (
            <Card key={app.id} className="p-4 opacity-75">
              <div className="flex items-start gap-4">
                <img 
                  src={app.icon_url} 
                  alt={app.app_name}
                  className="w-12 h-12 rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{app.app_name}</h3>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedApps.map(app => (
            <Card key={app.id} className="p-4 opacity-75">
              <div className="flex items-start gap-4">
                <img 
                  src={app.icon_url} 
                  alt={app.app_name}
                  className="w-12 h-12 rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{app.app_name}</h3>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                  {app.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Reason: {app.rejection_reason}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review: {selectedApp.app_name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <img 
                  src={selectedApp.icon_url} 
                  alt={selectedApp.app_name}
                  className="w-20 h-20 rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedApp.app_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedApp.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Developer: {selectedApp.developer_name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>App URL</Label>
                <div className="flex gap-2">
                  <Input value={selectedApp.app_url} readOnly />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(selectedApp.app_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Revenue Share (Chatr.Chat earns)
                </Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.5"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Developer earns: {(100 - revenueShare).toFixed(1)}%
                </p>
              </div>

              <div className="space-y-2">
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  placeholder="Provide feedback to the developer..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 gap-2" 
                  onClick={() => handleApprove(selectedApp)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve & Publish
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 gap-2"
                  onClick={() => handleReject(selectedApp.id)}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
