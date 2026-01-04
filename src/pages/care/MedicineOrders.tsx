import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';
import { OrderCard } from '@/components/care/OrderCard';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  items: any;
  expected_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
}

const MedicineOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medicine_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => 
    !['delivered', 'cancelled'].includes(o.status)
  );
  const completedOrders = orders.filter(o => 
    ['delivered', 'cancelled'].includes(o.status)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
      <MedicineHeroHeader
        title="My Orders"
        subtitle={`${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''}`}
        gradient="primary"
        rightAction={
          <Button 
            onClick={() => navigate('/care/medicines/subscribe')} 
            size="sm"
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Order
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-11 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="active" className="flex-1 rounded-lg data-[state=active]:shadow-sm">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 rounded-lg data-[state=active]:shadow-sm">
              Past ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <motion.div 
                  className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Package className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-lg font-bold mb-2">No Active Orders</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Subscribe to medicines and track your deliveries here
                </p>
                <Button onClick={() => navigate('/care/medicines/subscribe')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Subscription
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <OrderCard 
                      order={order}
                      onClick={() => navigate(`/care/medicines/orders/${order.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-4">
            {completedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No past orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedOrders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <OrderCard 
                      order={order}
                      onClick={() => navigate(`/care/medicines/orders/${order.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <MedicineBottomNav />
    </div>
  );
};

export default MedicineOrders;
