import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Home, Building, Phone, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';

export interface DeliveryAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  type: 'home' | 'office' | 'other';
}

interface AddressFormProps {
  onSubmit: (address: DeliveryAddress) => void;
  initialAddress?: Partial<DeliveryAddress>;
  loading?: boolean;
}

export const AddressForm = ({ onSubmit, initialAddress, loading }: AddressFormProps) => {
  const [address, setAddress] = useState<DeliveryAddress>({
    name: initialAddress?.name || '',
    phone: initialAddress?.phone || '',
    addressLine1: initialAddress?.addressLine1 || '',
    addressLine2: initialAddress?.addressLine2 || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    pincode: initialAddress?.pincode || '',
    type: initialAddress?.type || 'home'
  });

  const handleSubmit = () => {
    onSubmit(address);
  };

  const isValid = address.name && address.phone && address.addressLine1 && address.city && address.pincode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 space-y-4">
          {/* Name & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  placeholder="John Doe"
                  className="pl-9 h-11 rounded-xl border-muted"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="9876543210"
                  className="pl-9 h-11 rounded-xl border-muted"
                  type="tel"
                />
              </div>
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <Label className="text-xs text-muted-foreground">Address Line 1</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                placeholder="House/Flat No., Building Name"
                className="pl-9 h-11 rounded-xl border-muted"
              />
            </div>
          </div>

          {/* Address Line 2 */}
          <div>
            <Label className="text-xs text-muted-foreground">Address Line 2</Label>
            <Input
              value={address.addressLine2}
              onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
              placeholder="Street, Area, Landmark"
              className="h-11 rounded-xl border-muted"
            />
          </div>

          {/* City, State, Pincode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="Mumbai"
                className="h-11 rounded-xl border-muted"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                placeholder="Maharashtra"
                className="h-11 rounded-xl border-muted"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pincode</Label>
              <Input
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                placeholder="400001"
                className="h-11 rounded-xl border-muted"
                type="number"
              />
            </div>
          </div>

          {/* Address Type */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Save as</Label>
            <RadioGroup
              value={address.type}
              onValueChange={(value) => setAddress({ ...address, type: value as 'home' | 'office' | 'other' })}
              className="flex gap-2"
            >
              {[
                { value: 'home', label: 'Home', icon: Home },
                { value: 'office', label: 'Office', icon: Building },
                { value: 'other', label: 'Other', icon: MapPin }
              ].map((option) => (
                <motion.div
                  key={option.value}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1"
                >
                  <Label
                    htmlFor={option.value}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      address.type === option.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="hidden" />
                    <option.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </Label>
                </motion.div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          className="w-full h-12 text-base font-semibold rounded-xl"
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? 'Saving...' : 'Save Address & Continue'}
        </Button>
      </motion.div>
    </motion.div>
  );
};
