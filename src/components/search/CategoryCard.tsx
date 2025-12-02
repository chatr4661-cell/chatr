import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Star, Phone, Clock, Navigation, 
  ShoppingBag, Briefcase, GraduationCap, Hotel,
  Utensils, Scissors, Stethoscope, Wrench
} from "lucide-react";
import { ChatrResult } from "@/lib/chatrClient";

interface CategoryCardProps {
  result: ChatrResult;
  onCall?: (phone: string) => void;
  onDirections?: (lat?: number, lon?: number) => void;
  onBook?: () => void;
}

const getCategoryIcon = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('health') || cat.includes('doctor') || cat.includes('hospital')) return Stethoscope;
  if (cat.includes('salon') || cat.includes('beauty') || cat.includes('spa')) return Scissors;
  if (cat.includes('food') || cat.includes('restaurant')) return Utensils;
  if (cat.includes('job') || cat.includes('career')) return Briefcase;
  if (cat.includes('education') || cat.includes('course')) return GraduationCap;
  if (cat.includes('hotel') || cat.includes('travel')) return Hotel;
  if (cat.includes('service') || cat.includes('plumb') || cat.includes('electric')) return Wrench;
  return ShoppingBag;
};

const getCategoryStyle = (category: string) => {
  const cat = category?.toLowerCase() || '';
  
  if (cat.includes('health') || cat.includes('doctor') || cat.includes('hospital')) {
    return {
      accentColor: 'hsl(var(--primary))',
      bgGradient: 'from-blue-50 to-purple-50',
      iconColor: 'text-blue-600',
      badgeVariant: 'secondary' as const
    };
  }
  
  if (cat.includes('salon') || cat.includes('beauty') || cat.includes('spa')) {
    return {
      accentColor: 'hsl(var(--accent))',
      bgGradient: 'from-purple-50 to-pink-50',
      iconColor: 'text-purple-600',
      badgeVariant: 'secondary' as const
    };
  }
  
  if (cat.includes('food') || cat.includes('restaurant')) {
    return {
      accentColor: 'hsl(var(--primary))',
      bgGradient: 'from-orange-50 to-yellow-50',
      iconColor: 'text-orange-600',
      badgeVariant: 'secondary' as const
    };
  }
  
  if (cat.includes('job') || cat.includes('career')) {
    return {
      accentColor: 'hsl(var(--primary))',
      bgGradient: 'from-indigo-50 to-blue-50',
      iconColor: 'text-indigo-600',
      badgeVariant: 'secondary' as const
    };
  }
  
  return {
    accentColor: 'hsl(var(--primary))',
    bgGradient: 'from-muted to-background',
    iconColor: 'text-primary',
    badgeVariant: 'secondary' as const
  };
};

export function CategoryCard({ result, onCall, onDirections, onBook }: CategoryCardProps) {
  const CategoryIcon = getCategoryIcon(result.category || result.detectedType || '');
  const style = getCategoryStyle(result.category || result.detectedType || '');
  
  const renderCategorySpecificContent = () => {
    const cat = (result.category || result.detectedType || '').toLowerCase();
    
    // Healthcare
    if (cat.includes('health') || cat.includes('doctor') || cat.includes('hospital')) {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={`w-4 h-4 flex-shrink-0 ${style.iconColor}`} />
                <h3 className="font-semibold text-foreground text-base line-clamp-1">{result.name}</h3>
              </div>
              {result.verified && (
                <Badge variant="secondary" className="text-xs mb-2">
                  ✓ Verified
                </Badge>
              )}
              {result.specialties && result.specialties.length > 0 && (
                <p className="text-sm text-muted-foreground mb-2">
                  {result.specialties.slice(0, 3).join(' • ')}
                </p>
              )}
              {result.address && (
                <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{result.address}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {result.distance !== undefined && (
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {result.distance.toFixed(1)} km
                </span>
              )}
              {result.rating && (
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="text-xs font-semibold text-foreground">{result.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {result.phone && onCall && (
              <Button size="sm" variant="outline" onClick={() => onCall(result.phone!)} className="flex-1">
                <Phone className="w-3 h-3 mr-1" />
                Call
              </Button>
            )}
            {onDirections && (
              <Button size="sm" onClick={() => onDirections(result.latitude, result.longitude)} className="flex-1">
                <Navigation className="w-3 h-3 mr-1" />
                Directions
              </Button>
            )}
          </div>
        </div>
      );
    }
    
    // Salon/Beauty
    if (cat.includes('salon') || cat.includes('beauty') || cat.includes('spa')) {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={`w-4 h-4 flex-shrink-0 ${style.iconColor}`} />
                <h3 className="font-semibold text-foreground text-base line-clamp-1">{result.name}</h3>
              </div>
              {result.services && result.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {result.services.slice(0, 4).map((service, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              )}
              {result.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {result.description}
                </p>
              )}
              {result.address && (
                <p className="text-xs text-muted-foreground line-clamp-1 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{result.address}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {result.rating && (
                <div className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 fill-accent text-accent" />
                  <span className="text-xs font-semibold">{result.rating.toFixed(1)}</span>
                </div>
              )}
              {result.price && (
                <span className="text-xs font-medium text-muted-foreground">
                  ₹{result.price}+
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onBook && (
              <Button size="sm" variant="default" onClick={onBook} className="flex-1">
                Book Now
              </Button>
            )}
            {result.phone && onCall && (
              <Button size="sm" variant="outline" onClick={() => onCall(result.phone!)}>
                <Phone className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      );
    }
    
    // Food/Restaurant
    if (cat.includes('food') || cat.includes('restaurant')) {
      return (
        <div className="space-y-3">
          {result.image_url && (
            <div className="w-full h-32 rounded-lg overflow-hidden bg-muted">
              <img src={result.image_url} alt={result.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={`w-4 h-4 flex-shrink-0 ${style.iconColor}`} />
                <h3 className="font-semibold text-foreground text-base line-clamp-1">{result.name}</h3>
              </div>
              {result.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {result.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {result.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" />
                    <span>{result.rating.toFixed(1)}</span>
                  </div>
                )}
                {result.price && <span>₹₹</span>}
                {result.distance !== undefined && (
                  <span>{result.distance.toFixed(1)} km</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={onBook} className="flex-1">
              Order on CHATR
            </Button>
            {onDirections && (
              <Button size="sm" variant="outline" onClick={() => onDirections(result.latitude, result.longitude)}>
                <Navigation className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      );
    }
    
    // Jobs
    if (cat.includes('job') || cat.includes('career')) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={`w-4 h-4 flex-shrink-0 ${style.iconColor}`} />
                <h3 className="font-bold text-foreground text-base line-clamp-1">{result.name}</h3>
              </div>
              {result.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                  {result.description.split(' | ')[0]}
                </p>
              )}
              {result.city && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {result.city}
                  </span>
                  {result.price && (
                    <span className="font-medium text-foreground">
                      ₹{result.price.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={onBook} className="flex-1">
              Apply Now
            </Button>
            <Button size="sm" variant="outline">
              Save
            </Button>
          </div>
        </div>
      );
    }
    
    // Local Services (Plumber, Electrician, etc.)
    if (cat.includes('service') || cat.includes('plumb') || cat.includes('electric')) {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={`w-4 h-4 flex-shrink-0 ${style.iconColor}`} />
                <h3 className="font-semibold text-foreground text-base line-clamp-1">{result.name}</h3>
              </div>
              {result.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {result.description}
                </p>
              )}
              {result.rating && (
                <div className="flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="font-medium">{result.rating.toFixed(1)}</span>
                  {result.rating_count && (
                    <span className="text-muted-foreground">({result.rating_count})</span>
                  )}
                </div>
              )}
            </div>
            {result.distance !== undefined && (
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {result.distance.toFixed(1)} km
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {result.phone && onCall && (
              <Button size="sm" variant="default" onClick={() => onCall(result.phone!)} className="flex-1">
                <Phone className="w-3 h-3 mr-1" />
                Call Now
              </Button>
            )}
            {onBook && (
              <Button size="sm" variant="outline" onClick={onBook} className="flex-1">
                Book on CHATR
              </Button>
            )}
          </div>
        </div>
      );
    }
    
    // Default/Generic
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CategoryIcon className={`w-4 h-4 flex-shrink-0 ${style.iconColor}`} />
              <h3 className="font-semibold text-foreground text-base line-clamp-1">{result.name}</h3>
            </div>
            {result.description && (
              <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                {result.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {result.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span>{result.rating.toFixed(1)}</span>
                </div>
              )}
              {result.distance !== undefined && (
                <span>{result.distance.toFixed(1)} km</span>
              )}
            </div>
          </div>
        </div>
        {result.url && (
          <Button size="sm" variant="outline" asChild className="w-full">
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              View Details
            </a>
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className={`p-4 rounded-3xl shadow-sm hover:shadow-md transition-all bg-gradient-to-br ${style.bgGradient}`}>
      {renderCategorySpecificContent()}
    </Card>
  );
}
