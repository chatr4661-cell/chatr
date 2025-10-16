import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, IndianRupee } from 'lucide-react';

interface PaymentMessageProps {
  data: {
    amount: number;
    currency: string;
    reason?: string;
  };
}

export const PaymentMessage: React.FC<PaymentMessageProps> = ({ data }) => {
  const CurrencyIcon = data.currency === 'INR' ? IndianRupee : DollarSign;

  return (
    <Card className="p-4 bg-card border max-w-[280px]">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <CurrencyIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Payment Request</p>
            <div className="flex items-baseline gap-1 mt-1">
              <CurrencyIcon className="w-5 h-5 text-foreground" />
              <span className="text-2xl font-bold text-foreground">
                {data.amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {data.reason && (
          <p className="text-sm text-muted-foreground px-1">
            {data.reason}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            Decline
          </Button>
          <Button size="sm" className="flex-1">
            Pay Now
          </Button>
        </div>
      </div>
    </Card>
  );
};
