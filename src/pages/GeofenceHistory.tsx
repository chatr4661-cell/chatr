import React, { useEffect, useState } from 'react';
import { History, MapPin, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GeofenceEvent {
  id: string;
  geofence_id: string;
  event_type: 'enter' | 'exit';
  timestamp: string;
  lat: number;
  lng: number;
  geofence?: {
    name: string;
    type: string;
  };
}

interface EventPair {
  geofenceId: string;
  geofenceName: string;
  geofenceType: string;
  enterEvent: GeofenceEvent;
  exitEvent?: GeofenceEvent;
  duration?: number; // in minutes
}

const GeofenceHistory = () => {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [eventPairs, setEventPairs] = useState<EventPair[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch events
  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('geofence_events')
        .select(`
          *,
          geofence:geofences(name, type)
        `)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(200);

      if (!error && data) {
        setEvents(data as any);
      }
    };

    fetchEvents();

    // Subscribe to changes
    const channel = supabase
      .channel('geofence-events-history')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'geofence_events',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Process events into pairs
  useEffect(() => {
    const pairs: EventPair[] = [];
    const geofenceMap = new Map<string, GeofenceEvent[]>();

    // Group events by geofence
    events.forEach(event => {
      const key = event.geofence_id;
      if (!geofenceMap.has(key)) {
        geofenceMap.set(key, []);
      }
      geofenceMap.get(key)!.push(event);
    });

    // Match enter/exit pairs for each geofence
    geofenceMap.forEach((geofenceEvents, geofenceId) => {
      // Sort by timestamp (oldest first for pairing)
      const sorted = [...geofenceEvents].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let pendingEnter: GeofenceEvent | null = null;

      sorted.forEach(event => {
        if (event.event_type === 'enter') {
          // If there's already a pending enter, close it first (unpaired)
          if (pendingEnter) {
            pairs.push({
              geofenceId,
              geofenceName: pendingEnter.geofence?.name || 'Unknown',
              geofenceType: pendingEnter.geofence?.type || 'custom',
              enterEvent: pendingEnter,
            });
          }
          pendingEnter = event;
        } else if (event.event_type === 'exit' && pendingEnter) {
          // Match with pending enter
          const duration = differenceInMinutes(
            new Date(event.timestamp),
            new Date(pendingEnter.timestamp)
          );
          pairs.push({
            geofenceId,
            geofenceName: pendingEnter.geofence?.name || 'Unknown',
            geofenceType: pendingEnter.geofence?.type || 'custom',
            enterEvent: pendingEnter,
            exitEvent: event,
            duration,
          });
          pendingEnter = null;
        }
      });

      // Add any remaining unpaired enter event
      if (pendingEnter) {
        pairs.push({
          geofenceId,
          geofenceName: pendingEnter.geofence?.name || 'Unknown',
          geofenceType: pendingEnter.geofence?.type || 'custom',
          enterEvent: pendingEnter,
        });
      }
    });

    // Sort pairs by most recent enter time
    pairs.sort((a, b) => 
      new Date(b.enterEvent.timestamp).getTime() - new Date(a.enterEvent.timestamp).getTime()
    );

    setEventPairs(pairs);
  }, [events]);

  const getTypeIcon = (type: string) => {
    return type === 'hospital' ? '🏥' : type === 'job' ? '💼' : type === 'event' ? '🎉' : '🏘️';
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Still inside';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Apply filters
  const filteredPairs = eventPairs.filter(pair => {
    const typeMatch = typeFilter === 'all' || pair.geofenceType === typeFilter;
    
    let timeMatch = true;
    if (timeFilter !== 'all') {
      const enterTime = new Date(pair.enterEvent.timestamp);
      const now = new Date();
      const daysDiff = (now.getTime() - enterTime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (timeFilter === 'today') timeMatch = daysDiff < 1;
      else if (timeFilter === 'week') timeMatch = daysDiff < 7;
      else if (timeFilter === 'month') timeMatch = daysDiff < 30;
    }
    
    return typeMatch && timeMatch;
  });

  // Calculate total time per zone
  const zoneStats = eventPairs.reduce((acc, pair) => {
    if (pair.duration) {
      if (!acc[pair.geofenceName]) {
        acc[pair.geofenceName] = { total: 0, visits: 0, type: pair.geofenceType };
      }
      acc[pair.geofenceName].total += pair.duration;
      acc[pair.geofenceName].visits += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; visits: number; type: string }>);

  const topZones = Object.entries(zoneStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Geofence History
          </h1>
          <p className="text-muted-foreground mt-1">
            Your location-based zone activity
          </p>
        </div>

        {/* Stats Cards */}
        {topZones.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {topZones.map(([name, stats]) => (
              <Card key={name}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(stats.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-2xl font-bold">{formatDuration(stats.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.visits} visit{stats.visits > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="job">Job Site</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Event History */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          {filteredPairs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No geofence events yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Visit monitored zones to see your activity here
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPairs.map((pair, index) => (
              <Card key={`${pair.geofenceId}-${index}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getTypeIcon(pair.geofenceType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold">{pair.geofenceName}</h3>
                          <Badge variant="secondary" className="capitalize text-xs mt-1">
                            {pair.geofenceType}
                          </Badge>
                        </div>
                        <Badge variant={pair.exitEvent ? 'outline' : 'default'}>
                          {formatDuration(pair.duration)}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-foreground">Entered:</span>
                          <span>{format(new Date(pair.enterEvent.timestamp), 'PPp')}</span>
                          <span className="text-xs">
                            ({formatDistanceToNow(new Date(pair.enterEvent.timestamp), { addSuffix: true })})
                          </span>
                        </div>

                        {pair.exitEvent ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-foreground">Exited:</span>
                            <span>{format(new Date(pair.exitEvent.timestamp), 'PPp')}</span>
                            <span className="text-xs">
                              ({formatDistanceToNow(new Date(pair.exitEvent.timestamp), { addSuffix: true })})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-primary">
                            <Clock className="h-4 w-4 animate-pulse" />
                            <span className="font-medium">Currently inside this zone</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GeofenceHistory;