import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Search, Star, MapPin, Phone, Video, Filter, 
  SlidersHorizontal, CheckCircle, Navigation, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProviderCard, HealthcareProvider } from './ProviderCard';

const specialtyFilters = [
  { id: 'all', label: 'All' },
  { id: 'Cardiology', label: 'Heart' },
  { id: 'Endocrinology', label: 'Diabetes' },
  { id: 'Orthopedics', label: 'Bone' },
  { id: 'Psychiatry', label: 'Mental' },
  { id: 'Pediatrics', label: 'Kids' },
  { id: 'Dermatology', label: 'Skin' },
  { id: 'Ophthalmology', label: 'Eye' },
];

interface DoctorSearchProps {
  onSelectProvider?: (provider: HealthcareProvider) => void;
  initialSpecialty?: string;
  maxResults?: number;
  showFilters?: boolean;
}

export function DoctorSearch({ 
  onSelectProvider, 
  initialSpecialty = 'all',
  maxResults = 20,
  showFilters = true
}: DoctorSearchProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgRating: 0 });

  useEffect(() => {
    loadProviders();
  }, [selectedSpecialty, searchQuery]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_active', true);

      if (selectedSpecialty !== 'all') {
        query = query.eq('specialty', selectedSpecialty);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,specialty.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .order('rating_average', { ascending: false })
        .limit(maxResults);

      if (error) throw error;
      setProviders(data || []);

      if (data && data.length > 0) {
        const avgRating = data.reduce((acc, p) => acc + (p.rating_average || 0), 0) / data.length;
        setStats({ total: data.length, avgRating: parseFloat(avgRating.toFixed(1)) });
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (provider: HealthcareProvider) => {
    if (provider.phone) {
      window.location.href = `tel:${provider.phone}`;
    }
  };

  const handleVideoCall = (provider: HealthcareProvider) => {
    navigate(`/teleconsultation?provider=${provider.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search doctors, specialties, cities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {specialtyFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={selectedSpecialty === filter.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSpecialty(filter.id)}
                className="whitespace-nowrap"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{stats.total} providers found</span>
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {stats.avgRating} avg rating
        </span>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))
        ) : providers.length > 0 ? (
          providers.map((provider, idx) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onBook={onSelectProvider}
              onCall={handleCall}
              onVideoCall={handleVideoCall}
              delay={idx * 0.05}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No providers found</p>
            <p className="text-sm">Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
