import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, MapPin, Plus, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LocationFilter } from '@/components/LocationFilter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  job_type: string;
  category: string;
  description: string;
  salary_range?: string;
  city: string;
  pincode?: string;
  is_remote: boolean;
  is_featured: boolean;
  created_at: string;
  view_count: number;
}

export default function LocalJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ city: string; pincode: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, location, searchQuery]);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('local_jobs_db')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Location filter
    if (location?.city) {
      filtered = filtered.filter(job => 
        job.city.toLowerCase().includes(location.city.toLowerCase()) || job.is_remote
      );
    } else if (location?.pincode) {
      filtered = filtered.filter(job => 
        job.pincode === location.pincode || job.is_remote
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const trackJobView = async (jobId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Increment view count
      const { data: currentJob } = await supabase
        .from('local_jobs_db')
        .select('view_count')
        .eq('id', jobId)
        .single();
      
      if (currentJob) {
        await supabase
          .from('local_jobs_db')
          .update({ view_count: (currentJob.view_count || 0) + 1 })
          .eq('id', jobId);
      }

      // Track monetization lead
      if (user) {
        await supabase
          .from('monetization_leads')
          .insert({
            lead_type: 'job',
            listing_id: jobId,
            listing_type: 'local_jobs_db',
            user_id: user.id,
            action_type: 'view',
            location_city: location?.city,
            location_pincode: location?.pincode
          });
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Local Jobs</h1>
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length} opportunities
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Location Filter */}
        <LocationFilter onLocationChange={setLocation} />

        {/* Search */}
        <Input
          type="text"
          placeholder="Search jobs, companies, categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Featured Jobs */}
        {filteredJobs.some(j => j.is_featured) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Featured Jobs</h2>
            </div>
            {filteredJobs
              .filter(job => job.is_featured)
              .map(job => (
                <JobCard key={job.id} job={job} onView={trackJobView} />
              ))}
          </div>
        )}

        {/* All Jobs */}
        <div className="space-y-3">
          <h2 className="font-semibold">All Jobs</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No jobs found in your area</p>
              <Button className="mt-4" onClick={() => navigate('/add-job')}>
                <Plus className="h-4 w-4 mr-2" />
                Post a Job
              </Button>
            </div>
          ) : (
            filteredJobs
              .filter(job => !job.is_featured)
              .map(job => (
                <JobCard key={job.id} job={job} onView={trackJobView} />
              ))
          )}
        </div>
      </div>

      {/* Add Job FAB */}
      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={() => navigate('/add-job')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

function JobCard({ job, onView }: { job: Job; onView: (id: string) => void }) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView(job.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{job.job_title}</h3>
          <p className="text-sm text-muted-foreground">{job.company_name}</p>
        </div>
        {job.is_featured && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs bg-secondary px-2 py-1 rounded">{job.job_type}</span>
        <span className="text-xs bg-secondary px-2 py-1 rounded">{job.category}</span>
        {job.is_remote && (
          <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">
            Remote
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {job.description}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>{job.city}</span>
        </div>
        {job.salary_range && (
          <span className="font-medium text-primary">{job.salary_range}</span>
        )}
      </div>
    </Card>
  );
}
