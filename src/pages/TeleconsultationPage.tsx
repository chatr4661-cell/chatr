import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Video, Phone, Calendar, Clock, User, Star, Search,
  ArrowLeft, MapPin, CheckCircle, Zap, Shield, Heart
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';
import { SEOHead } from '@/components/SEOHead';
import { ProviderCard, HealthcareProvider } from '@/components/care/ProviderCard';

const specialtyFilters = [
  { id: 'all', label: 'All' },
  { id: 'Cardiology', label: 'Cardiology' },
  { id: 'Endocrinology', label: 'Diabetes' },
  { id: 'Psychiatry', label: 'Mental Health' },
  { id: 'Dermatology', label: 'Dermatology' },
  { id: 'Pediatrics', label: 'Pediatrics' },
  { id: 'Orthopedics', label: 'Orthopedics' },
];

export default function TeleconsultationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProviderId = searchParams.get('provider');
  
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProvider | null>(null);
  const [consultationType, setConsultationType] = useState<'video' | 'audio'>('video');
  const [stats, setStats] = useState({ total: 0, online: 0, avgRating: 0 });

  useEffect(() => {
    loadProviders();
  }, [selectedSpecialty, searchQuery]);

  useEffect(() => {
    if (preselectedProviderId && providers.length > 0) {
      const provider = providers.find(p => p.id === preselectedProviderId);
      if (provider) setSelectedProvider(provider);
    }
  }, [preselectedProviderId, providers]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_healthcare')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true);

      if (selectedSpecialty !== 'all') {
        query = query.eq('specialty', selectedSpecialty);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,specialty.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .order('rating_average', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setProviders(data || []);

      if (data && data.length > 0) {
        const avgRating = data.reduce((acc, p) => acc + (p.rating_average || 0), 0) / data.length;
        setStats({
          total: data.length,
          online: Math.floor(data.length * 0.3), // Simulate 30% online
          avgRating: parseFloat(avgRating.toFixed(1))
        });
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const startTeleconsultation = async (provider: HealthcareProvider, type: 'video' | 'audio') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to book consultation');
        navigate('/auth');
        return;
      }

      // Create appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          provider_id: provider.id,
          appointment_date: new Date().toISOString(),
          status: 'pending',
          notes: `${type} consultation requested with ${provider.name}`
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Consultation request sent!', {
        description: `${provider.name} will connect with you shortly`
      });
      
      // Navigate to chat/call page
      navigate('/chat');
    } catch (error: any) {
      console.error('Error booking consultation:', error);
      toast.error('Failed to book consultation');
    }
  };

  const handleVideoCall = (provider: HealthcareProvider) => {
    startTeleconsultation(provider, 'video');
  };

  const handleAudioCall = (provider: HealthcareProvider) => {
    startTeleconsultation(provider, 'audio');
  };

  return (
    <>
      <SEOHead
        title="Teleconsultation - Video & Audio Consult with Doctors | Chatr"
        description={`Connect with ${stats.total}+ verified doctors via video or audio call. Get instant medical consultations from the comfort of your home.`}
        keywords="teleconsultation, video call doctor, online doctor, audio consultation, telemedicine"
      />
      
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(-1)}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Teleconsultation</h1>
                  <p className="text-sm text-blue-100">Connect with doctors instantly</p>
                </div>
              </div>
              <img src={logo} alt="Chatr" className="h-6 cursor-pointer" onClick={() => navigate('/')} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { value: stats.total, label: 'Doctors', icon: User },
                { value: stats.online, label: 'Online Now', icon: Zap },
                { value: `${stats.avgRating}★`, label: 'Avg Rating', icon: Star },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/10 rounded-xl p-3 text-center"
                >
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-blue-100">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setConsultationType('video')}
                className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                  consultationType === 'video' 
                    ? 'bg-white text-blue-600' 
                    : 'bg-white/20 text-white'
                }`}
              >
                <Video className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-semibold">Video Call</p>
                  <p className="text-xs opacity-80">Face-to-face consultation</p>
                </div>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setConsultationType('audio')}
                className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                  consultationType === 'audio' 
                    ? 'bg-white text-green-600' 
                    : 'bg-white/20 text-white'
                }`}
              >
                <Phone className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-semibold">Audio Call</p>
                  <p className="text-xs opacity-80">Voice consultation</p>
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search doctors by name, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Specialty Filters */}
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

          {/* Doctors List */}
          <div className="space-y-3">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
              ))
            ) : providers.length > 0 ? (
              providers.map((provider, idx) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-14 w-14 ring-2 ring-background shadow">
                          <AvatarImage src={provider.image_url} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-bold">
                            {provider.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{provider.name}</h3>
                            {provider.is_verified && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1 text-[10px] py-0">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs font-normal">
                            {provider.specialty}
                          </Badge>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{provider.city}</span>
                            <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{provider.rating_average?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {provider.consultation_fee && (
                            <Badge className="bg-green-100 text-green-700 font-bold">
                              ₹{provider.consultation_fee}
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-green-50 text-green-600 text-[10px]">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                            Available
                          </Badge>
                        </div>
                      </div>

                      {provider.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{provider.description}</p>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleVideoCall(provider)}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Video Call
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAudioCall(provider)}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Audio Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="p-8 text-center">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No doctors found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search</p>
              </Card>
            )}
          </div>

          {/* How It Works */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                How Teleconsultation Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Choose Doctor', desc: 'Select from verified doctors', color: 'bg-blue-100 text-blue-600' },
                  { step: '2', title: 'Connect', desc: 'Video or audio consultation', color: 'bg-purple-100 text-purple-600' },
                  { step: '3', title: 'Get Care', desc: 'Prescription & follow-up', color: 'bg-green-100 text-green-600' },
                ].map((item, idx) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-center"
                  >
                    <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center mx-auto mb-2 font-bold`}>
                      {item.step}
                    </div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
