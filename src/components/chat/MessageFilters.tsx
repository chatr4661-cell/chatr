import React from 'react';
import { Filter, Image, Video, FileText, Link2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type MessageFilterType = 'all' | 'media' | 'links' | 'documents' | 'location';

interface MessageFiltersProps {
  activeFilter: MessageFilterType;
  onFilterChange: (filter: MessageFilterType) => void;
  counts?: {
    media: number;
    links: number;
    documents: number;
    location: number;
  };
}

export const MessageFilters = ({ 
  activeFilter, 
  onFilterChange,
  counts = { media: 0, links: 0, documents: 0, location: 0 }
}: MessageFiltersProps) => {
  const filters = [
    { 
      type: 'all' as MessageFilterType, 
      label: 'All Messages', 
      icon: Filter,
      count: null
    },
    { 
      type: 'media' as MessageFilterType, 
      label: 'Photos & Videos', 
      icon: Image,
      count: counts.media
    },
    { 
      type: 'links' as MessageFilterType, 
      label: 'Links', 
      icon: Link2,
      count: counts.links
    },
    { 
      type: 'documents' as MessageFilterType, 
      label: 'Documents', 
      icon: FileText,
      count: counts.documents
    },
    { 
      type: 'location' as MessageFilterType, 
      label: 'Locations', 
      icon: MapPin,
      count: counts.location
    },
  ];

  const activeFilterData = filters.find(f => f.type === activeFilter);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-2"
        >
          {activeFilterData && <activeFilterData.icon className="h-3.5 w-3.5" />}
          <span className="text-xs">
            {activeFilterData?.label || 'Filter'}
          </span>
          {activeFilter !== 'all' && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {activeFilterData?.count || 0}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter Messages
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filters.map((filter) => (
          <DropdownMenuItem
            key={filter.type}
            onClick={() => onFilterChange(filter.type)}
            className={`cursor-pointer ${
              activeFilter === filter.type ? 'bg-accent' : ''
            }`}
          >
            <filter.icon className="h-4 w-4 mr-2" />
            <span className="flex-1">{filter.label}</span>
            {filter.count !== null && filter.count > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                {filter.count}
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
