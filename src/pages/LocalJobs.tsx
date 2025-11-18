import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, MapPin, Navigation, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocationStatus } from '@/hooks/useLocationStatus';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  job_type: string;
  category: string;
  description: string;
  salary_range?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  is_remote: boolean;
  is_featured: boolean;
  view_count: number;
}

export default function LocalJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>();
  const [radiusKm, setRadiusKm] = useState(10);
  const { status } = useLocationStatus(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (status.latitude && status.longitude) {
      fetchAndLoadJobs(status.latitude, status.longitude);
    }
  }, [status.latitude, status.longitude, radiusKm]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery]);

  const fetchAndLoadJobs = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      console.log('Fetching jobs near:', latitude, longitude, 'radius:', radiusKm);
      
      // Call edge function to fetch and populate jobs based on GPS location
      const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('fetch-jobs', {
        body: { latitude, longitude, radius: radiusKm }
      });

      if (edgeFunctionError) {
        console.error('Edge function error:', edgeFunctionError);
        toast({
          title: 'Error',
          description: 'Failed to fetch jobs',
          variant: 'destructive'
        });
        return;
      }

      console.log('Edge function response:', edgeFunctionData);

      // Load jobs from master table
      const { data, error } = await supabase
        .from('jobs_clean_master')
        .select('*')
        .order('distance', { ascending: true })
        .order('is_featured', { ascending: false });

      if (error) throw error;
      
      // Filter by radius on client side as well
      const jobsInRadius = (data || []).filter((job: Job) => 
        !job.distance || job.distance <= radiusKm
      );
      
      setJobs(jobsInRadius);
      toast({
        title: 'Jobs Loaded',
        description: `Found ${jobsInRadius.length} opportunities within ${radiusKm}km. Start applying now!`
      });
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
    let filtered = [...jobs];

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
            action_type: 'view'
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
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Briefcase className="h-6 w-6" />
                Discover Local Jobs Near You
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Explore thousands of job opportunities in your area — from part-time gigs to full-time careers
              </p>
            </div>
            {status.city && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4 text-primary" />
                <span>{status.city}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-semibold">How it works:</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Enter your location or pincode to see jobs in your neighbourhood</li>
              <li>• Filter by job type, industry, experience level, and salary range</li>
              <li>• Tap a job to view the full description and apply instantly via CHATR</li>
              <li>• Enable job alerts to get notified when new nearby jobs match your profile</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Distance Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Within</span>
          </div>
          <div className="flex gap-2">
            {[5, 10, 20].map(km => (
              <Button
                key={km}
                size="sm"
                variant={radiusKm === km ? 'default' : 'outline'}
                onClick={() => setRadiusKm(km)}
              >
                {km} km
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search jobs, companies, categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Loading / Error States */}
        {status.isLoading || loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Finding jobs near you...</p>
          </div>
        ) : !status.latitude ? (
          <div className="text-center py-8 space-y-4">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground mb-2">Enable location to find jobs near you</p>
              <p className="text-xs text-muted-foreground">Grant location permission in your browser</p>
            </div>
            <Button variant="default" className="mt-4">
              Browse Local Jobs →
            </Button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground mb-2">No jobs found within {radiusKm}km</p>
              <p className="text-xs text-muted-foreground">Try increasing the radius or check back later</p>
            </div>
            <Button variant="default" className="mt-4">
              Start Applying Now!
            </Button>
          </div>
        ) : (
          <>
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
              <h2 className="font-semibold">All Jobs ({filteredJobs.length})</h2>
              {filteredJobs
                .filter(job => !job.is_featured)
                .map(job => (
                  <JobCard key={job.id} job={job} onView={trackJobView} />
                ))}
            </div>
          </>
        )}
      </div>
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
        <div className="flex flex-col items-end gap-1">
          {job.is_featured && (
            <Badge className="bg-yellow-500/10 text-yellow-600">Featured</Badge>
          )}
          {job.distance !== undefined && (
            <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
              {job.distance} km
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {job.job_type}
        </Badge>
        <Badge variant="outline">{job.category}</Badge>
        {job.is_remote && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            Remote
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {job.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {job.salary_range && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <DollarSign className="h-4 w-4" />
              {job.salary_range}
            </span>
          )}
        </div>
        <Button size="sm">Apply Now</Button>
      </div>
    </Card>
  );
}