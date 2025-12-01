import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Percent, Hammer, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { chatrLocalSearch } from '@/lib/chatrClient';
import { Skeleton } from '@/components/ui/skeleton';

export function LocalServices() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'jobs' | 'deals' | 'services'>('jobs');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { location, loading: locationLoading } = useChatrLocation();

  useEffect(() => {
    if (location?.lat && location?.lon) {
      loadJobs();
    }
  }, [location?.lat, location?.lon]);

  const loadJobs = async () => {
    if (!location?.lat || !location?.lon) return;
    
    setLoading(true);
    try {
      const results = await chatrLocalSearch('jobs hiring employment', location.lat, location.lon);
      
      if (results && results.length > 0) {
        const mappedJobs = results.slice(0, 10).map((item: any) => ({
          id: item.id || Math.random().toString(),
          title: item.name,
          company: item.description || 'Local Company',
          location: item.city || 'Near You',
          salary: item.price ? `₹${item.price}/month` : '₹50k-80k/month',
          type: item.category || 'Full-time',
        }));
        setJobs(mappedJobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'deals', label: 'Deals', icon: Percent },
    { id: 'services', label: 'Services', icon: Hammer },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Jobs"
            className="pl-10 bg-muted border-0"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {locationLoading || loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-border">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-3" />
                  <div className="flex gap-4 mb-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No jobs found near you within 10km</p>
              </div>
            ) : jobs.map((job) => (
              <div 
                key={job.id} 
                className="bg-white rounded-xl p-4 shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/job/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-sm text-primary font-medium">{job.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {job.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{job.salary}</span>
                  <Button size="sm" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/job/${job.id}`);
                  }}>View Details</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="text-center py-12 text-muted-foreground">
            <Percent className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No deals available right now</p>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="text-center py-12 text-muted-foreground">
            <Hammer className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Services coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
