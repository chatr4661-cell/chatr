import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import jsPDF from "jspdf";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  status: string;
  description: string;
  created_at: string;
  service_id?: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  rejection_reason?: string;
  bank_account_last4?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  period_start: string;
  period_end: string;
  issued_at: string;
  status: string;
}

interface EarningsStats {
  totalEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
  thisMonthEarnings: number;
}

export default function SellerPayouts() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingWithdrawals: 0,
    thisMonthEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [withdrawalDialog, setWithdrawalDialog] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  useEffect(() => {
    if (providerId) {
      fetchAllData();
    }
  }, [providerId, selectedPeriod]);

  const fetchProviderProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from("home_service_providers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (provider) {
      setProviderId(provider.id);
    }
  };

  const fetchAllData = async () => {
    if (!providerId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchTransactions(),
        fetchWithdrawals(),
        fetchInvoices(),
      ]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!providerId) return;

    let query = supabase
      .from("seller_transactions")
      .select("*")
      .eq("seller_id", providerId)
      .order("created_at", { ascending: false });

    if (selectedPeriod !== "all") {
      const date = new Date();
      if (selectedPeriod === "week") {
        date.setDate(date.getDate() - 7);
      } else if (selectedPeriod === "month") {
        date.setMonth(date.getMonth() - 1);
      } else if (selectedPeriod === "year") {
        date.setFullYear(date.getFullYear() - 1);
      }
      query = query.gte("created_at", date.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    setTransactions(data || []);
    calculateStats(data || []);
  };

  const fetchWithdrawals = async () => {
    if (!providerId) return;

    const { data, error } = await supabase
      .from("seller_withdrawal_requests")
      .select("*")
      .eq("seller_id", providerId)
      .order("requested_at", { ascending: false });

    if (error) throw error;

    setWithdrawals(data || []);
  };

  const fetchInvoices = async () => {
    if (!providerId) return;

    const { data, error } = await supabase
      .from("seller_invoices")
      .select("*")
      .eq("seller_id", providerId)
      .order("issued_at", { ascending: false });

    if (error) throw error;

    setInvoices(data || []);
  };

  const calculateStats = (transactionsData: Transaction[]) => {
    const earnings = transactionsData
      .filter(t => t.transaction_type === "earning" && t.status === "completed")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const withdrawals = transactionsData
      .filter(t => t.transaction_type === "withdrawal" && t.status === "completed")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const pendingWithdrawals = transactionsData
      .filter(t => t.transaction_type === "withdrawal" && t.status === "pending")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = transactionsData
      .filter(
        t =>
          t.transaction_type === "earning" &&
          t.status === "completed" &&
          new Date(t.created_at) >= thisMonth
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalEarnings: earnings,
      availableBalance: earnings - withdrawals - pendingWithdrawals,
      pendingWithdrawals,
      thisMonthEarnings,
    });
  };

  const handleWithdrawalRequest = async () => {
    if (!providerId || !withdrawalAmount) return;

    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > stats.availableBalance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount within your available balance",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("seller_withdrawal_requests")
        .insert({
          seller_id: providerId,
          amount,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      });

      setWithdrawalDialog(false);
      setWithdrawalAmount("");
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("INVOICE", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, 40);
    doc.text(`Issued: ${new Date(invoice.issued_at).toLocaleDateString()}`, 20, 47);
    doc.text(
      `Period: ${new Date(invoice.period_start).toLocaleDateString()} - ${new Date(
        invoice.period_end
      ).toLocaleDateString()}`,
      20,
      54
    );

    doc.text("Amount:", 20, 75);
    doc.text(`$${invoice.amount.toFixed(2)}`, 150, 75);

    doc.text("Tax:", 20, 82);
    doc.text(`$${invoice.tax_amount.toFixed(2)}`, 150, 82);

    doc.setFontSize(12);
    doc.text("Total:", 20, 95);
    doc.text(`$${invoice.total_amount.toFixed(2)}`, 150, 95);

    doc.save(`invoice-${invoice.invoice_number}.pdf`);

    toast({
      title: "Success",
      description: "Invoice downloaded successfully",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: "default", icon: CheckCircle },
      pending: { variant: "secondary", icon: Clock },
      failed: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "outline", icon: XCircle },
      approved: { variant: "default", icon: CheckCircle },
      processing: { variant: "secondary", icon: Clock },
      rejected: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || { variant: "outline", icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payouts & Earnings</h1>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setWithdrawalDialog(true)}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.availableBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${stats.pendingWithdrawals.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.thisMonthEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{transaction.description || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.transaction_type.charAt(0).toUpperCase() +
                              transaction.transaction_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            transaction.transaction_type === "earning"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.transaction_type === "earning" ? "+" : "-"}$
                          {Number(transaction.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No withdrawal requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    withdrawals.map(withdrawal => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          {new Date(withdrawal.requested_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${Number(withdrawal.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell>
                          {withdrawal.bank_account_last4
                            ? `****${withdrawal.bank_account_last4}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {withdrawal.completed_at
                            ? new Date(withdrawal.completed_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {new Date(invoice.period_start).toLocaleDateString()} -{" "}
                          {new Date(invoice.period_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.issued_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(invoice.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialog} onOpenChange={setWithdrawalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Available balance: ${stats.availableBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                min="0"
                max={stats.availableBalance}
                step="0.01"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Withdrawals are typically processed within 3-5 business days
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdrawalRequest} disabled={!withdrawalAmount}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
