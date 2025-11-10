import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
}

interface PricingTierFormProps {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
}

export function PricingTierForm({ tiers, onChange }: PricingTierFormProps) {
  const addTier = () => {
    onChange([
      ...tiers,
      {
        id: Date.now().toString(),
        name: '',
        description: '',
        price: 0,
        features: [''],
      },
    ]);
  };

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof PricingTier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addFeature = (tierIndex: number) => {
    const updated = [...tiers];
    updated[tierIndex].features.push('');
    onChange(updated);
  };

  const updateFeature = (tierIndex: number, featureIndex: number, value: string) => {
    const updated = [...tiers];
    updated[tierIndex].features[featureIndex] = value;
    onChange(updated);
  };

  const removeFeature = (tierIndex: number, featureIndex: number) => {
    const updated = [...tiers];
    updated[tierIndex].features = updated[tierIndex].features.filter((_, i) => i !== featureIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Pricing Tiers</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTier}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {tiers.map((tier, tierIndex) => (
        <Card key={tier.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Tier {tierIndex + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeTier(tierIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tier Name</Label>
              <Input
                value={tier.name}
                onChange={(e) => updateTier(tierIndex, 'name', e.target.value)}
                placeholder="e.g., Basic, Premium"
              />
            </div>
            <div>
              <Label>Price (₹)</Label>
              <Input
                type="number"
                value={tier.price}
                onChange={(e) => updateTier(tierIndex, 'price', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={tier.description}
              onChange={(e) => updateTier(tierIndex, 'description', e.target.value)}
              placeholder="Brief description of this tier"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addFeature(tierIndex)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Feature
              </Button>
            </div>
            {tier.features.map((feature, featureIndex) => (
              <div key={featureIndex} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateFeature(tierIndex, featureIndex, e.target.value)}
                  placeholder="Feature description"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFeature(tierIndex, featureIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
