import { Package, Truck, Home, Check, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DeliveryTrackerProps {
  status: 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';
  orderDate: string;
  expectedDate: string;
  trackingId?: string;
}

const steps = [
  { id: 'processing', label: 'Processing', icon: Package },
  { id: 'packed', label: 'Packed', icon: Package },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { id: 'delivered', label: 'Delivered', icon: Home },
];

export const DeliveryTracker = ({ status, orderDate, expectedDate, trackingId }: DeliveryTrackerProps) => {
  const currentStep = steps.findIndex(s => s.id === status);
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm opacity-90">Next Delivery</p>
            <p className="text-lg font-bold">{expectedDate}</p>
          </div>
          <Badge className="bg-white/20 text-white">
            {status.replace('_', ' ')}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 bg-white/30" />
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center mb-1
                  ${isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
                  ${isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                `}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-[10px] text-center ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {trackingId && (
          <div className="mt-4 pt-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Tracking ID: <span className="font-mono">{trackingId}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
