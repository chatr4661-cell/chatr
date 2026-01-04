import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Star, ArrowRight, Heart, Zap, Users, Activity, Brain, 
  Bone, Eye, Baby, Stethoscope, Award, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProviderCard, HealthcareProvider } from './ProviderCard';

interface OutcomeCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  specialty: string;
  metric: string;
  color: string;
}

const outcomeCategories: OutcomeCategory[] = [
  { id: 'diabetes', name: 'Diabetes Control', icon: Activity, specialty: 'Endocrinology', metric: '89% HbA1c improvement', color: 'from-purple-500 to-violet-600' },
  { id: 'cardiac', name: 'Cardiac Care', icon: Heart, specialty: 'Cardiology', metric: '95% recovery rate', color: 'from-red-500 to-rose-600' },
  { id: 'ortho', name: 'Joint & Bone', icon: Bone, specialty: 'Orthopedics', metric: '92% mobility restored', color: 'from-blue-500 to-indigo-600' },
  { id: 'mental', name: 'Mental Health', icon: Brain, specialty: 'Psychiatry', metric: '87% symptom reduction', color: 'from-indigo-500 to-purple-600' },
  { id: 'eye', name: 'Eye Care', icon: Eye, specialty: 'Ophthalmology', metric: '98% vision preserved', color: 'from-cyan-500 to-blue-600' },
  { id: 'pediatric', name: 'Child Care', icon: Baby, specialty: 'Pediatrics', metric: '96% parent satisfaction', color: 'from-green-500 to-emerald-600' },
];

interface OutcomeProvidersProps {
  onBookProvider?: (provider: HealthcareProvider) => void;
}

export function OutcomeProviders({ onBookProvider }: OutcomeProvidersProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('diabetes');
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    avgRating: 0,
    topCities: [] as string[]
  });

  useEffect(() => {
    loadProviders();
  }, [selectedCategory]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const category = outcomeCategories.find(c => c.id === selectedCategory);
      if (!category) return;

      const { data, error } = await supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('specialty', category.specialty)
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProviders(data || []);

      // Calculate stats
      if (data && data.length > 0) {
        const avgRating = data.reduce((acc, p) => acc + (p.rating_average || 0), 0) / data.length;
        const cities = [...new Set(data.map(p => p.city))].slice(0, 3);
        setStats({
          totalDoctors: data.length,
          avgRating: parseFloat(avgRating.toFixed(1)),
          topCities: cities
        });
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = outcomeCategories.find(c => c.id === selectedCategory);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Outcome-Based Providers
            </CardTitle>
            <CardDescription className="text-xs">
              Doctors ranked by patient outcomes, not just ratings
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/local-healthcare')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Category Tabs */}
        <ScrollArea className="w-full px-4">
          <div className="flex gap-2 py-3">
            {outcomeCategories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                    : 'bg-muted hover:bg-muted/80'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <category.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{category.name}</span>
              </motion.button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Category Stats */}
        {currentCategory && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-4 mb-4 p-3 rounded-xl bg-gradient-to-r ${currentCategory.color} text-white`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <currentCategory.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{currentCategory.name}</p>
                  <p className="text-xs text-white/80">{currentCategory.metric}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.totalDoctors}</p>
                <p className="text-xs text-white/80">Specialists</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Providers List */}
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))
          ) : providers.length > 0 ? (
            providers.slice(0, 3).map((provider, idx) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onBook={onBookProvider}
                delay={idx * 0.1}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No providers found for this specialty</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
