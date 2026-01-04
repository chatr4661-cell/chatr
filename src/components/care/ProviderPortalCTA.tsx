import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, Users, TrendingUp, Calendar, CheckCircle, 
  ArrowRight, Stethoscope, HeartPulse
} from 'lucide-react';

interface ProviderPortalCTAProps {
  variant?: 'default' | 'compact';
}

export function ProviderPortalCTA({ variant = 'default' }: ProviderPortalCTAProps) {
  const navigate = useNavigate();

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
      >
        <Card 
          className="border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/provider-register')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Are you a Doctor?</h3>
              <p className="text-xs text-muted-foreground">Join 500+ providers on Chatr</p>
            </div>
            <ArrowRight className="h-5 w-5 text-teal-600" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">For Healthcare Providers</h3>
                <p className="text-sm text-white/80">Build lasting patient relationships</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-4 space-y-3">
            {[
              { icon: Users, text: 'Long-term care relationships', metric: '89% retention' },
              { icon: TrendingUp, text: 'Predictable income', metric: '3x earnings' },
              { icon: Calendar, text: 'Fewer no-shows', metric: '95% attendance' },
              { icon: CheckCircle, text: 'Better follow-up compliance', metric: '92% followups' },
            ].map((benefit, idx) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <benefit.icon className="h-4 w-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{benefit.text}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-700">
                  {benefit.metric}
                </Badge>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="p-4 pt-0">
            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700" 
              onClick={() => navigate('/provider-register')}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Join Provider Network
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Already registered? <button className="text-teal-600 hover:underline" onClick={() => navigate('/provider-portal')}>Sign in</button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
