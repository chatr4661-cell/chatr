import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, MapPin, Navigation, Clock, TrendingUp, DollarSign, Filter, Building2, GraduationCap, Sparkles, ExternalLink } from 'lucide-react';
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
  experience_level?: string;
  skills_required?: string[];
  apply_url?: string;
  source?: string;
  posted_date?: string;
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
  const [sortBy, setSortBy] = useState<'latest' | 'distance' | 'salary'>('distance');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterExperience, setFilterExperience] = useState<string>('all');
  const [expandedFilters, setExpandedFilters] = useState(false);

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
        body: { 
          latitude, 
          longitude, 
          radius: radiusKm,
          city: status.city,
          state: status.country,
          district: status.city,
          pincode: ''
        }
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
        title: '🎉 Jobs Loaded Successfully',
        description: `Found ${jobsInRadius.length} opportunities within ${radiusKm}km from ${edgeFunctionData?.location || 'your location'}`
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

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Job type filter
    if (filterJobType !== 'all') {
      if (filterJobType === 'remote') {
        filtered = filtered.filter(job => job.is_remote);
      } else {
        filtered = filtered.filter(job => 
          job.job_type.toLowerCase() === filterJobType.toLowerCase()
        );
      }
    }

    // Experience filter
    if (filterExperience !== 'all') {
      filtered = filtered.filter(job => 
        job.experience_level?.toLowerCase().includes(filterExperience.toLowerCase())
      );
    }

    // Sorting
    if (sortBy === 'distance' && filtered.every(j => j.distance !== undefined)) {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (sortBy === 'latest' && filtered.some(j => j.posted_date)) {
      filtered.sort((a, b) => {
        const dateA = a.posted_date ? new Date(a.posted_date).getTime() : 0;
        const dateB = b.posted_date ? new Date(b.posted_date).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'salary') {
      filtered.sort((a, b) => {
        const getSalaryValue = (range?: string) => {
          if (!range) return 0;
          const match = range.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        return getSalaryValue(b.salary_range) - getSalaryValue(a.salary_range);
      });
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

        {/* Info Banner */}
          <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-lg p-4 space-y-2 text-sm border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">AI-Powered Job Discovery</h3>
                <p className="text-muted-foreground mt-1">
                  We aggregate jobs from Indeed, Naukri, LinkedIn, Glassdoor, company career pages, government portals, and more — all based on your exact location!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <Input
          type="text"
          placeholder="🔍 Search jobs, companies, skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Filters Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="flex-shrink-0"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          
          <div className="flex gap-2">
            {[5, 10, 20, 50].map(km => (
              <Button
                key={km}
                size="sm"
                variant={radiusKm === km ? 'default' : 'outline'}
                onClick={() => setRadiusKm(km)}
                className="flex-shrink-0"
              >
                {km} km
              </Button>
            ))}
          </div>
        </div>

        {/* Expanded Filters */}
        {expandedFilters && (
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'distance', label: '📍 Closest' },
                  { value: 'latest', label: '⏰ Latest' },
                  { value: 'salary', label: '💰 Highest Salary' }
                ].map(option => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={sortBy === option.value ? 'default' : 'outline'}
                    onClick={() => setSortBy(option.value as any)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Job Type</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'full-time', label: 'Full-time' },
                  { value: 'part-time', label: 'Part-time' },
                  { value: 'remote', label: '🏠 Remote' },
                  { value: 'internship', label: '🎓 Internship' }
                ].map(option => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={filterJobType === option.value ? 'default' : 'outline'}
                    onClick={() => setFilterJobType(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Experience Level</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'fresher', label: 'Fresher' },
                  { value: '0-2', label: '0-2 Years' },
                  { value: '2-5', label: '2-5 Years' },
                  { value: '5+', label: '5+ Years' }
                ].map(option => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={filterExperience === option.value ? 'default' : 'outline'}
                    onClick={() => setFilterExperience(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}

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
          <div className="text-center py-12 space-y-4">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <div>
              <p className="font-semibold text-lg">⚠️ No jobs found in your exact area</p>
              <p className="text-muted-foreground mt-2">Expanding search radius...</p>
              <p className="text-xs text-muted-foreground mt-1">Try increasing the radius to 20km or 50km</p>
            </div>
            <Button 
              variant="default" 
              className="mt-4"
              onClick={() => setRadiusKm(20)}
            >
              Expand to 20km
            </Button>
          </div>
        ) : (
          <>
            {/* Jobs Near You - Top Section */}
            {filteredJobs.slice(0, 5).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg">🔍 Jobs Near You</h2>
                  <Badge variant="secondary" className="ml-auto">
                    Top {Math.min(5, filteredJobs.length)} closest
                  </Badge>
                </div>
                {filteredJobs.slice(0, 5).map(job => (
                  <JobCard key={job.id} job={job} onView={trackJobView} priority />
                ))}
              </div>
            )}

            {/* Trending Jobs */}
            {filteredJobs.filter(j => j.is_featured).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <h2 className="font-bold text-lg">🔥 Trending Jobs in {status.city || 'Your City'}</h2>
                </div>
                {filteredJobs
                  .filter(job => job.is_featured)
                  .slice(0, 10)
                  .map(job => (
                    <JobCard key={job.id} job={job} onView={trackJobView} />
                  ))}
              </div>
            )}

            {/* Companies Hiring Now */}
            {filteredJobs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  <h2 className="font-bold text-lg">🏢 Companies Hiring Now</h2>
                </div>
                {filteredJobs
                  .filter(job => !job.is_featured)
                  .slice(0, 15)
                  .map(job => (
                    <JobCard key={job.id} job={job} onView={trackJobView} />
                  ))}
              </div>
            )}

            {/* Freshers & Internships */}
            {filteredJobs.filter(j => 
              j.job_type?.toLowerCase().includes('internship') || 
              j.experience_level?.toLowerCase().includes('fresher')
            ).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-500" />
                  <h2 className="font-bold text-lg">🎓 Freshers & Internships</h2>
                </div>
                {filteredJobs
                  .filter(job => 
                    job.job_type?.toLowerCase().includes('internship') || 
                    job.experience_level?.toLowerCase().includes('fresher')
                  )
                  .map(job => (
                    <JobCard key={job.id} job={job} onView={trackJobView} />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, onView, priority = false }: { job: Job; onView: (id: string) => void; priority?: boolean }) {
  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all ${priority ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}
      onClick={() => onView(job.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{job.job_title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{job.company_name}</span>
            {job.distance !== undefined && (
              <>
                <span>•</span>
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-medium">{job.distance} km</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {job.is_featured && (
            <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 border-yellow-500/30">
              ⭐ Featured
            </Badge>
          )}
          {priority && (
            <Badge className="bg-primary/10 text-primary">
              Nearest
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
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            🏠 Remote
          </Badge>
        )}
        {job.experience_level && (
          <Badge variant="outline" className="text-xs">
            {job.experience_level}
          </Badge>
        )}
      </div>

      {job.skills_required && job.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.skills_required.slice(0, 4).map((skill, idx) => (
            <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
              {skill}
            </span>
          ))}
          {job.skills_required.length > 4 && (
            <span className="text-xs text-muted-foreground px-2">
              +{job.skills_required.length - 4} more
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {job.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-3">
          {job.salary_range && (
            <span className="flex items-center gap-1 text-primary font-semibold text-sm">
              <DollarSign className="h-4 w-4" />
              {job.salary_range}
            </span>
          )}
          {job.source && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {job.source}
            </span>
          )}
        </div>
        <Button 
          size="sm" 
          className="gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (job.apply_url) {
              window.open(job.apply_url, '_blank');
            }
          }}
        >
          Apply Now
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}