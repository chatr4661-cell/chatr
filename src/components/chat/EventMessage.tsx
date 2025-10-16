import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface EventMessageProps {
  data: {
    title: string;
    date: string;
    time: string;
    location?: string;
    description?: string;
  };
}

export const EventMessage: React.FC<EventMessageProps> = ({ data }) => {
  return (
    <Card className="p-4 bg-card border max-w-[320px]">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">{data.title}</h4>
            {data.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {data.description}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 pl-1">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{format(new Date(data.date), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{data.time}</span>
          </div>
          {data.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{data.location}</span>
            </div>
          )}
        </div>

        <Button size="sm" className="w-full">
          Add to Calendar
        </Button>
      </div>
    </Card>
  );
};
