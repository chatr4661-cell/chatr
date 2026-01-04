import { motion } from 'framer-motion';
import { Package, Truck, Home, Check, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeliveryStep {
  id: string;
  label: string;
  icon: React.ElementType;
  time?: string;
}

interface PremiumDeliveryTrackerProps {
  status: 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';
  orderDate: string;
  expectedDate: string;
  trackingId?: string;
}

const steps: DeliveryStep[] = [
  { id: 'processing', label: 'Processing', icon: Clock },
  { id: 'packed', label: 'Packed', icon: Package },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'out_for_delivery', label: 'On the way', icon: MapPin },
  { id: 'delivered', label: 'Delivered', icon: Home },
];

export const PremiumDeliveryTracker = ({ 
  status, 
  orderDate, 
  expectedDate, 
  trackingId 
}: PremiumDeliveryTrackerProps) => {
  const currentStep = steps.findIndex(s => s.id === status);
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 p-5 text-white">
          <div className="absolute inset-0 opacity-20">
            <motion.div
              className="absolute w-40 h-40 rounded-full bg-white/20 -top-20 -right-20"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="relative flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Next Delivery</p>
              <p className="text-2xl font-bold">{expectedDate}</p>
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              <Truck className="h-3 w-3 mr-1" />
              {status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              animate={{ x: ['-100%', '500%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ left: 0 }}
            />
          </div>
        </div>

        {/* Steps */}
        <CardContent className="p-5">
          <div className="flex justify-between relative">
            {/* Connection Line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted" />
            <motion.div 
              className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, ((currentStep) / (steps.length - 1)) * 100)}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ maxWidth: 'calc(100% - 40px)' }}
            />

            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStep;
              const isCurrent = idx === currentStep;
              const Icon = step.icon;
              
              return (
                <motion.div 
                  key={step.id} 
                  className="flex flex-col items-center relative z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                >
                  <motion.div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg' 
                        : 'bg-muted text-muted-foreground'}
                      ${isCurrent ? 'ring-4 ring-green-500/30' : ''}
                    `}
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </motion.div>
                  <span className={`text-[10px] text-center font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {trackingId && (
            <motion.div 
              className="mt-5 pt-4 border-t text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs text-muted-foreground">
                Tracking ID: <span className="font-mono text-foreground">{trackingId}</span>
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
