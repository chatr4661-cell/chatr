import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Download, 
  Filter, 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  MapPin,
  IndianRupee,
  Clock
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  seller_id: string;
  booking_date: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  special_instructions: string | null;
  total_amount: number;
  platform_fee: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  service?: {
    service_name: string;
    category_id: string;
  };
}

export default function SellerBookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, dateFrom, dateTo, searchTerm]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get seller ID
      const { data: sellerData } = await supabase
        .from('chatr_plus_sellers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!sellerData) {
        navigate('/chatr-plus/seller-registration');
        return;
      }

      setSellerId(sellerData.id);

      // Load bookings with service details
      const { data: bookingsData, error } = await supabase
        .from('chatr_plus_bookings')
        .select(`
          *,
          service:chatr_plus_services(service_name, category_id)
        `)
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(b => new Date(b.booking_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(b => new Date(b.booking_date) <= new Date(dateTo));
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.customer_name.toLowerCase().includes(search) ||
        b.customer_phone.includes(search) ||
        b.id.toLowerCase().includes(search)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleAcceptBooking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('chatr_plus_bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Booking accepted successfully',
      });

      loadBookings();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept booking',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('chatr_plus_bookings')
        .update({ 
          status: 'cancelled',
          cancelled_by: 'seller',
          cancellation_reason: 'Rejected by seller',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Booking rejected',
      });

      loadBookings();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject booking',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Booking ID', 'Customer', 'Phone', 'Service', 'Date', 'Amount', 'Status', 'Payment Status'];
    const rows = filteredBookings.map(b => [
      b.id,
      b.customer_name,
      b.customer_phone,
      b.service?.service_name || 'N/A',
      new Date(b.booking_date).toLocaleDateString(),
      `₹${b.total_amount}`,
      b.status,
      b.payment_status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Bookings exported successfully',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending', variant: 'outline' },
      confirmed: { label: 'Confirmed', variant: 'default' },
      completed: { label: 'Completed', variant: 'secondary' },
      cancelled: { label: 'Cancelled', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      paid: { variant: 'secondary' },
      pending: { variant: 'outline' },
      failed: { variant: 'destructive' },
    };

    return <Badge variant={config[status]?.variant || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/seller')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Bookings Management</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {(statusFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>

        {/* Bookings Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">
                        {booking.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{booking.customer_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.service?.service_name}</div>
                          <div className="text-sm text-muted-foreground">{booking.service?.category_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(booking.booking_date).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{booking.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(booking.payment_status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Booking Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Booking ID: {selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Status and Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <div className="mt-1">{getPaymentStatusBadge(selectedBooking.payment_status)}</div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Name:</span>
                    <span>{selectedBooking.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedBooking.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <span>{selectedBooking.customer_address}</span>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h3 className="font-semibold mb-3">Service Details</h3>
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <span className="font-medium">Service:</span> {selectedBooking.service?.service_name}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {selectedBooking.service?.category_id}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(selectedBooking.booking_date).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {selectedBooking.special_instructions && (
                <div>
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="bg-muted/50 p-4 rounded-lg text-sm">
                    {selectedBooking.special_instructions}
                  </p>
                </div>
              )}

              {/* Payment Details */}
              <div>
                <h3 className="font-semibold mb-3">Payment Details</h3>
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Service Amount:</span>
                    <span>₹{(selectedBooking.total_amount - selectedBooking.platform_fee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform Fee (5%):</span>
                    <span>₹{selectedBooking.platform_fee.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-primary">₹{selectedBooking.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment Method:</span>
                    <span className="capitalize">{selectedBooking.payment_method}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedBooking?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleRejectBooking(selectedBooking.id)}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleAcceptBooking(selectedBooking.id)}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Booking
                </Button>
              </>
            )}
            {selectedBooking?.status !== 'pending' && (
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
