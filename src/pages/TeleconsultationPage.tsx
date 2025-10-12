import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Video, Phone, Calendar, Clock, User, Star } from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

export default function TeleconsultationPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data } = await supabase
        .from('service_providers')
        .select('*')
        .eq('is_verified', true)
        .limit(10);

      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTeleconsultation = async (providerId: string, type: 'video' | 'audio') => {
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
          provider_id: providerId,
          appointment_date: new Date().toISOString(),
          status: 'pending',
          notes: `${type} consultation requested`
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Consultation request sent!');
      
      // Navigate to chat with provider
      navigate('/chat');
    } catch (error: any) {
      console.error('Error booking consultation:', error);
      toast.error('Failed to book consultation');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Chatr" className="h-8 cursor-pointer" onClick={() => navigate('/')} />
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/care')}>
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Teleconsultation</h1>
          <p className="text-blue-100">Connect with doctors via video or audio call</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle>Instant Consultation</CardTitle>
            <CardDescription>Connect with available doctors now</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button className="h-20 flex-col gap-2 bg-blue-600">
              <Video className="w-6 h-6" />
              <span>Video Call</span>
            </Button>
            <Button className="h-20 flex-col gap-2 bg-green-600">
              <Phone className="w-6 h-6" />
              <span>Audio Call</span>
            </Button>
          </CardContent>
        </Card>

        {/* Available Doctors */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Doctors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <p>Loading doctors...</p>
            ) : providers.length > 0 ? (
              providers.map((provider) => (
                <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                          {provider.business_name?.[0] || 'D'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{provider.business_name}</CardTitle>
                        <CardDescription>{provider.specialization || 'General Practitioner'}</CardDescription>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{provider.rating?.toFixed(1) || '4.5'}</span>
                          <span className="text-xs text-muted-foreground">
                            ({provider.total_reviews || 0} reviews)
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-green-600">Online</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {provider.description || 'Experienced healthcare professional ready to help you.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        className="bg-blue-600"
                        onClick={() => startTeleconsultation(provider.id, 'video')}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startTeleconsultation(provider.id, 'audio')}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Audio
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-2">
                <CardContent className="text-center py-8">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No doctors available right now</p>
                  <Button className="mt-4" onClick={() => navigate('/booking')}>
                    Schedule Appointment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Teleconsultation Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold mb-1">Choose Doctor</h4>
                <p className="text-sm text-muted-foreground">Select from available doctors</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-purple-600">2</span>
                </div>
                <h4 className="font-semibold mb-1">Start Call</h4>
                <p className="text-sm text-muted-foreground">Video or audio consultation</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-green-600">3</span>
                </div>
                <h4 className="font-semibold mb-1">Get Care</h4>
                <p className="text-sm text-muted-foreground">Receive prescription & advice</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}