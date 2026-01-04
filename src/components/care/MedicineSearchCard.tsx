import { motion } from 'framer-motion';
import { Pill, Plus, Minus, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  strength: string | null;
  form: string | null;
  mrp: number;
  discounted_price: number | null;
  requires_prescription: boolean;
  pack_size: number | null;
}

interface MedicineSearchCardProps {
  medicine: Medicine;
  inCart: boolean;
  cartQuantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  delay?: number;
}

export const MedicineSearchCard = ({
  medicine,
  inCart,
  cartQuantity,
  onAdd,
  onIncrement,
  onDecrement,
  delay = 0
}: MedicineSearchCardProps) => {
  const savings = medicine.mrp - (medicine.discounted_price || medicine.mrp);
  const savingsPercent = Math.round((savings / medicine.mrp) * 100);
  const price = medicine.discounted_price || medicine.mrp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
        {/* Prescription Badge */}
        {medicine.requires_prescription && (
          <div className="bg-amber-50 px-3 py-1.5 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">Prescription Required</span>
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Medicine Info */}
            <div className="flex gap-3 flex-1">
              <motion.div 
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <Pill className="h-6 w-6 text-primary" />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight">{medicine.name}</h3>
                {medicine.generic_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {medicine.generic_name}
                  </p>
                )}
                {medicine.manufacturer && (
                  <p className="text-[10px] text-muted-foreground">
                    by {medicine.manufacturer}
                  </p>
                )}
                
                {/* Price */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold text-primary">₹{price}</span>
                  {savings > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground line-through">₹{medicine.mrp}</span>
                      <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5">
                        {savingsPercent}% off
                      </Badge>
                    </>
                  )}
                </div>
                
                {/* Pack Info */}
                {medicine.pack_size && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Pack of {medicine.pack_size} {medicine.form || 'units'}
                  </p>
                )}
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex-shrink-0">
              {inCart ? (
                <motion.div 
                  className="flex items-center gap-1 bg-primary/10 rounded-full p-1"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/20"
                    onClick={onDecrement}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{cartQuantity}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/20"
                    onClick={onIncrement}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="sm" 
                    className="rounded-full shadow-md gap-1 h-9 px-4"
                    onClick={onAdd}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
