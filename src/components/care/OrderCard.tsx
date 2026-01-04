import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    total: number;
    items: any;
    expected_delivery: string | null;
    delivered_at: string | null;
    created_at: string;
  };
  onClick?: () => void;
}

export const OrderCard = ({ order, onClick }: OrderCardProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'bg-amber-500', text: 'Order Placed', gradient: 'from-amber-500 to-orange-500' };
      case 'confirmed':
        return { icon: Package, color: 'bg-blue-500', text: 'Confirmed', gradient: 'from-blue-500 to-indigo-500' };
      case 'packed':
        return { icon: Package, color: 'bg-purple-500', text: 'Packed', gradient: 'from-purple-500 to-violet-500' };
      case 'shipped':
        return { icon: Truck, color: 'bg-cyan-500', text: 'On The Way', gradient: 'from-cyan-500 to-teal-500' };
      case 'out_for_delivery':
        return { icon: Truck, color: 'bg-green-500', text: 'Out for Delivery', gradient: 'from-green-500 to-emerald-500' };
      case 'delivered':
        return { icon: CheckCircle2, color: 'bg-green-600', text: 'Delivered', gradient: 'from-green-600 to-green-500' };
      case 'cancelled':
        return { icon: Clock, color: 'bg-red-500', text: 'Cancelled', gradient: 'from-red-500 to-rose-500' };
      default:
        return { icon: Package, color: 'bg-gray-500', text: status, gradient: 'from-gray-500 to-gray-400' };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      <Card className="border-0 shadow-lg overflow-hidden cursor-pointer">
        {/* Status Bar */}
        <div className={`h-1.5 bg-gradient-to-r ${statusConfig.gradient}`} />
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Order #{order.order_number}</p>
              <p className="text-sm font-medium mt-0.5">
                {format(new Date(order.created_at), 'dd MMM yyyy')}
              </p>
            </div>
            <Badge className={`${statusConfig.color} text-white border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.text}
            </Badge>
          </div>

          {/* Items Preview */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {[...Array(Math.min(itemCount, 3))].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-background"
                >
                  <Package className="h-4 w-4 text-primary" />
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Delivery Info */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && order.expected_delivery && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Expected: <span className="font-medium text-foreground">{format(new Date(order.expected_delivery), 'dd MMM')}</span></span>
            </div>
          )}

          {order.status === 'delivered' && order.delivered_at && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">
              <CheckCircle2 className="h-4 w-4" />
              <span>Delivered on {format(new Date(order.delivered_at), 'dd MMM yyyy')}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">₹{order.total}</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              View Details
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
