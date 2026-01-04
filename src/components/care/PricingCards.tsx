import { motion } from 'framer-motion';
import { Check, Star, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  features: string[];
  badge?: string;
  popular?: boolean;
  gradient: string;
}

interface PricingCardsProps {
  plans: PricingPlan[];
  selectedPlan: string;
  onSelectPlan: (planId: string) => void;
}

export const PricingCards = ({ plans, selectedPlan, onSelectPlan }: PricingCardsProps) => {
  return (
    <div className="space-y-3">
      {plans.map((plan, idx) => {
        const isSelected = selectedPlan === plan.id;
        
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card 
              className={`overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-xl' 
                  : 'hover:shadow-lg'
              } ${plan.popular ? 'relative' : ''}`}
              onClick={() => onSelectPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -right-8 top-4 rotate-45">
                  <div className={`bg-gradient-to-r ${plan.gradient} text-white text-[10px] font-bold px-8 py-1`}>
                    POPULAR
                  </div>
                </div>
              )}
              
              <CardContent className="p-0">
                <div className="flex">
                  {/* Accent Bar */}
                  <motion.div 
                    className={`w-1.5 bg-gradient-to-b ${plan.gradient}`}
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  />
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Plan Header */}
                        <div className="flex items-center gap-2 mb-1">
                          {plan.badge && (
                            <Badge className={`bg-gradient-to-r ${plan.gradient} text-white border-0 text-[10px]`}>
                              {plan.badge}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                        
                        {/* Features */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {plan.features.map((feature, i) => (
                            <motion.div
                              key={feature}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2 + (i * 0.05) }}
                            >
                              <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                                <Check className="h-2.5 w-2.5 text-green-500" />
                                {feature}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right ml-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">₹{plan.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">/month</p>
                        {plan.originalPrice && (
                          <p className="text-xs text-green-600 mt-1">
                            Save ₹{plan.originalPrice - plan.price}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <motion.div 
                        className="mt-3 pt-3 border-t flex items-center justify-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-medium text-primary">Selected</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
