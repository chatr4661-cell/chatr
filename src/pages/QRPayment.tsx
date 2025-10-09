import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Scan, Wallet, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function QRPayment() {
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState("");
  const [username, setUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scannedToken, setScannedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [paymentId, setPaymentId] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('qr_code_token, username')
      .eq('id', user.id)
      .single();

    const { data: points } = await supabase
      .from('user_points')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setQrToken(profile.qr_code_token || '');
      setUsername(profile.username);
    }
    if (points) {
      setBalance(points.balance);
    }
  };

  const copyQRCode = () => {
    navigator.clipboard.writeText(qrToken);
    setCopied(true);
    toast.success("QR code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScanSubmit = async () => {
    if (!scannedToken || !amount) {
      toast.error("Please enter receiver code and amount");
      return;
    }

    const amountNum = parseInt(amount);
    if (amountNum <= 0 || amountNum > balance) {
      toast.error("Invalid amount");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('qr-payment', {
        body: {
          action: 'initiate',
          receiverToken: scannedToken,
          amount: amountNum,
          description: 'QR Payment'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      setReceiverName(data.receiverName);
      setPaymentId(data.payment.id);
      setShowConfirm(true);
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    }
  };

  const confirmPayment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('qr-payment', {
        body: {
          action: 'confirm',
          paymentId
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      toast.success("Payment successful!");
      setShowConfirm(false);
      setScannedToken("");
      setAmount("");
      loadUserData();
    } catch (error: any) {
      toast.error(error.message || "Payment confirmation failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">QR Payments</h1>
            <p className="text-sm text-muted-foreground">Pay with Chatr Points</p>
          </div>
        </div>

        {/* Balance Display */}
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <div className="text-2xl font-bold">{balance.toLocaleString()} pts</div>
          </div>
        </Card>

        <Tabs defaultValue="receive" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receive">Receive</TabsTrigger>
            <TabsTrigger value="pay">Pay</TabsTrigger>
          </TabsList>

          {/* Receive Tab */}
          <TabsContent value="receive" className="space-y-4">
            <Card className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-1">Your QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Share this with others to receive points
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <div className="p-6 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG 
                    value={qrToken} 
                    size={240}
                    level="H"
                    includeMargin
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex-1 font-mono text-sm truncate">
                    {qrToken}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyQRCode}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-lg font-semibold">{username}</p>
                  <p className="text-sm text-muted-foreground">Scan to pay</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Pay Tab */}
          <TabsContent value="pay" className="space-y-4">
            <Card className="p-6">
              <div className="text-center mb-6">
                <Scan className="h-12 w-12 mx-auto mb-2 text-primary" />
                <h3 className="text-lg font-semibold mb-1">Scan & Pay</h3>
                <p className="text-sm text-muted-foreground">
                  Enter receiver's QR code to send points
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Receiver QR Code
                  </label>
                  <Input
                    placeholder="Paste QR code here"
                    value={scannedToken}
                    onChange={(e) => setScannedToken(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Amount (Points)
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={balance}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {balance.toLocaleString()} points
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleScanSubmit}
                  disabled={!scannedToken || !amount}
                >
                  Continue to Payment
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-semibold">{receiverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-lg">{amount} points</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Balance:</span>
                <span className="font-semibold">{(balance - parseInt(amount)).toLocaleString()} points</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={confirmPayment}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}