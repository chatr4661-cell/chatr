import { MapPin, Globe } from 'lucide-react';
import { formatLocationString, getLastSeenText } from '@/utils/locationService';

interface LocationPresenceBadgeProps {
  city?: string;
  country?: string;
  lastSeenAt?: string;
  locationSharingEnabled?: boolean;
  locationPrecision?: 'exact' | 'city' | 'off';
  showLastSeen?: boolean;
  compact?: boolean;
  className?: string;
}

export const LocationPresenceBadge = ({
  city,
  country,
  lastSeenAt,
  locationSharingEnabled = true,
  locationPrecision = 'city',
  showLastSeen = true,
  compact = false,
  className = ''
}: LocationPresenceBadgeProps) => {
  if (!locationSharingEnabled || locationPrecision === 'off') {
    if (showLastSeen && lastSeenAt) {
      return (
        <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
          <Globe className="h-3 w-3" />
          <span>{getLastSeenText(lastSeenAt)}</span>
        </div>
      );
    }
    return null;
  }

  const locationText = formatLocationString(city, country, locationPrecision);
  const lastSeenText = showLastSeen ? getLastSeenText(lastSeenAt) : '';

  if (!locationText && !lastSeenText) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        {locationText && (
          <>
            <MapPin className="h-3 w-3" />
            <span>{locationText}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {locationText && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>📍 {locationText}</span>
        </div>
      )}
      {showLastSeen && lastSeenText && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          <span>{lastSeenText}</span>
        </div>
      )}
    </div>
  );
};