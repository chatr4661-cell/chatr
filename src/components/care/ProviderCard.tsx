import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, MapPin, Clock, Phone, Video, Calendar, 
  CheckCircle, Navigation, Heart, ExternalLink
} from 'lucide-react';

export interface HealthcareProvider {
  id: string;
  name: string;
  provider_type: string;
  specialty: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  image_url?: string;
  consultation_fee?: number;
  opening_time?: string;
  closing_time?: string;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  distance?: number;
  available_days?: string[];
  accepts_insurance?: boolean;
  offers_teletherapy?: boolean;
}

interface ProviderCardProps {
  provider: HealthcareProvider;
  onBook?: (provider: HealthcareProvider) => void;
  onCall?: (provider: HealthcareProvider) => void;
  onVideoCall?: (provider: HealthcareProvider) => void;
  variant?: 'default' | 'compact' | 'featured';
  delay?: number;
}

const specialtyColors: Record<string, { bg: string; text: string; border: string }> = {
  Cardiology: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Dermatology: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  Orthopedics: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Pediatrics: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Neurology: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Psychiatry: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Endocrinology: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Gastroenterology: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  default: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

function formatDistance(distance?: number): string {
  if (distance === undefined) return '';
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

export function ProviderCard({ 
  provider, 
  onBook, 
  onCall, 
  onVideoCall,
  variant = 'default',
  delay = 0
}: ProviderCardProps) {
  const navigate = useNavigate();
  const colors = specialtyColors[provider.specialty] || specialtyColors.default;
  
  const isOpen = () => {
    if (!provider.opening_time || !provider.closing_time) return null;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return currentTime >= provider.opening_time && currentTime <= provider.closing_time;
  };

  const openStatus = isOpen();

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        whileHover={{ x: 4 }}
      >
        <div 
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
          onClick={() => navigate(`/provider/${provider.id}`)}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={provider.image_url} />
            <AvatarFallback className={`${colors.bg} ${colors.text}`}>
              {provider.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm truncate">{provider.name}</p>
              {provider.is_verified && <CheckCircle className="h-3 w-3 text-blue-500" />}
            </div>
            <p className="text-xs text-muted-foreground">{provider.specialty}</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium">{provider.rating_average?.toFixed(1)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
    >
      <Card className={`overflow-hidden border-l-4 ${colors.border} hover:shadow-lg transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow">
              <AvatarImage src={provider.image_url} />
              <AvatarFallback className={`${colors.bg} ${colors.text} text-lg font-bold`}>
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
              <Badge className={`${colors.bg} ${colors.text} ${colors.border} text-xs font-normal`}>
                {provider.specialty}
              </Badge>
              <p className="text-xs text-muted-foreground capitalize mt-1">{provider.provider_type}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold">{provider.rating_average?.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground">({provider.rating_count})</span>
              </div>
              {provider.consultation_fee && (
                <Badge variant="outline" className="bg-green-50 text-green-700 font-bold">
                  ₹{provider.consultation_fee}
                </Badge>
              )}
            </div>
          </div>

          {provider.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{provider.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{provider.city}</span>
            </div>
            {provider.distance !== undefined && (
              <div className="flex items-center gap-1 text-primary">
                <Navigation className="h-3 w-3" />
                <span className="font-medium">{formatDistance(provider.distance)}</span>
              </div>
            )}
            {provider.opening_time && provider.closing_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{provider.opening_time.slice(0,5)} - {provider.closing_time.slice(0,5)}</span>
                {openStatus !== null && (
                  <Badge variant={openStatus ? 'secondary' : 'outline'} className={`ml-1 text-[10px] py-0 ${openStatus ? 'bg-green-100 text-green-700' : 'text-red-500'}`}>
                    {openStatus ? 'Open' : 'Closed'}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {provider.phone && onCall && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={(e) => { e.stopPropagation(); onCall(provider); }}
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
            )}
            {provider.offers_teletherapy && onVideoCall && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={(e) => { e.stopPropagation(); onVideoCall(provider); }}
              >
                <Video className="h-4 w-4 mr-1" />
                Video
              </Button>
            )}
            <Button 
              size="sm" 
              className="flex-1 bg-primary"
              onClick={(e) => { e.stopPropagation(); onBook ? onBook(provider) : navigate(`/provider/${provider.id}`); }}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Book
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
