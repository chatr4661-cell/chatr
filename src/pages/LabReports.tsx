import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface LabReport {
  id: string;
  report_name: string;
  file_url: string;
  file_type: string;
  category: string;
  test_date: string;
  notes: string;
  created_at: string;
}

export default function LabReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: '',
    testDate: '',
    notes: '',
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading reports',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadForm({ ...uploadForm, name: file.name });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lab-reports')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lab-reports')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('lab_reports')
        .insert({
          user_id: user.id,
          report_name: uploadForm.name,
          file_url: publicUrl,
          file_type: selectedFile.type,
          category: uploadForm.category,
          test_date: uploadForm.testDate,
          notes: uploadForm.notes,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Lab report uploaded successfully',
      });

      setSelectedFile(null);
      setUploadForm({ name: '', category: '', testDate: '', notes: '' });
      loadReports();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (report: LabReport) => {
    try {
      const { error } = await supabase
        .from('lab_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });

      loadReports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lab Reports</h1>
          <p className="text-muted-foreground">Upload and manage your medical test results</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Lab Report</DialogTitle>
              <DialogDescription>Add a new medical test result or lab report</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File (PDF or Image)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </div>

              <div>
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Blood Test Results"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={uploadForm.category} onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood-test">Blood Test</SelectItem>
                    <SelectItem value="x-ray">X-Ray</SelectItem>
                    <SelectItem value="mri">MRI</SelectItem>
                    <SelectItem value="ct-scan">CT Scan</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-date">Test Date</Label>
                <Input
                  id="test-date"
                  type="date"
                  value={uploadForm.testDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, testDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Any additional information..."
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Report'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No lab reports uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start justify-between">
                  <span className="line-clamp-2">{report.report_name}</span>
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                </CardTitle>
                <CardDescription>
                  {report.category && <span className="capitalize">{report.category.replace('-', ' ')}</span>}
                  {report.test_date && (
                    <span className="block text-xs mt-1">
                      {format(new Date(report.test_date), 'MMM dd, yyyy')}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.notes && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{report.notes}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(report.file_url, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(report.file_url, '_blank')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(report)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}