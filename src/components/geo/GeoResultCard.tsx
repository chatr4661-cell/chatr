import { Phone, Navigation, Star, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GeoResultCardProps {
  result: {
    id: string;
    name: string;
    type: string;
    address: string;
    distance: number;
    rating?: number;
    phone?: string;
    isOpen?: boolean;
    latitude: number;
    longitude: number;
    source: string;
  };
}

export function GeoResultCard({ result }: GeoResultCardProps) {
  const handleCall = () => {
    if (result.phone) {
      window.location.href = `tel:${result.phone}`;
    }
  };

  const handleNavigate = () => {
    // Open in Google Maps
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Name and Type */}
          <div className="flex items-start gap-2 mb-2">
            <h3 className="font-semibold text-base line-clamp-1">{result.name}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {result.type}
            </Badge>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="line-clamp-2">{result.address}</p>
          </div>

          {/* Distance and Rating */}
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-primary">
              {result.distance < 1 
                ? `${(result.distance * 1000).toFixed(0)}m` 
                : `${result.distance.toFixed(1)}km`}
            </span>
            
            {result.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{result.rating.toFixed(1)}</span>
              </div>
            )}

            {result.isOpen !== undefined && (
              <Badge variant={result.isOpen ? 'default' : 'destructive'} className="text-xs">
                {result.isOpen ? 'Open' : 'Closed'}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          {result.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCall}
              className="w-10 h-10 p-0"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="default"
            onClick={handleNavigate}
            className="w-10 h-10 p-0"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Source Badge */}
      <div className="mt-3 pt-3 border-t">
        <Badge variant="outline" className="text-xs">
          Source: {result.source.toUpperCase()}
        </Badge>
      </div>
    </Card>
  );
}
