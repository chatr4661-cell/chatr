import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, MapPin, Navigation, Clock, TrendingUp, DollarSign, Filter, Building2, GraduationCap, Sparkles, ExternalLink, Bookmark, Share2, Download, RefreshCw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/contexts/LocationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { location, isLoading: locationLoading, error: locationError } = useLocation();
  const [sortBy, setSortBy] = useState<'latest' | 'distance' | 'salary'>('distance');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterExperience, setFilterExperience] = useState<string>('all');
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeKeywords, setScrapeKeywords] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['all']);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Load saved and applied jobs
        const { data: saved } = await supabase
          .from('saved_jobs')
          .select('job_id')
          .eq('user_id', user.id);
        if (saved) setSavedJobs(saved.map(s => s.job_id));

        const { data: applied } = await supabase
          .from('job_applications')
          .select('job_id')
          .eq('user_id', user.id);
        if (applied) setAppliedJobs(applied.map(a => a.job_id));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchAndLoadJobs(location.latitude, location.longitude);
    }
  }, [location?.latitude, location?.longitude, radiusKm]);

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
          city: location?.city || '',
          state: location?.country || '',
          district: location?.city || '',
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

  const handleSaveJob = async (jobId: string) => {
    if (!userId) {
      toast({ title: 'Please login to save jobs', variant: 'destructive' });
      return;
    }

    try {
      if (savedJobs.includes(jobId)) {
        await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('user_id', userId);
        setSavedJobs(prev => prev.filter(id => id !== jobId));
        toast({ title: '🗑️ Job removed from saved' });
      } else {
        await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId });
        setSavedJobs(prev => [...prev, jobId]);
        toast({ title: '💾 Job saved successfully' });
      }
    } catch (error) {
      console.error('Error saving job:', error);
      toast({ title: 'Error saving job', variant: 'destructive' });
    }
  };

  const handleApplyJob = async (jobId: string, applyUrl: string) => {
    if (!userId) {
      toast({ title: 'Please login to apply', variant: 'destructive' });
      return;
    }

    try {
      if (!appliedJobs.includes(jobId)) {
        await supabase.from('job_applications').insert({
          user_id: userId,
          job_id: jobId,
          status: 'applied'
        });
        setAppliedJobs(prev => [...prev, jobId]);
      }

      // Open application URL
      window.open(applyUrl, '_blank');
      toast({ title: '✅ Application tracked' });
    } catch (error) {
      console.error('Error tracking application:', error);
    }
  };

  const handleScrapeJobs = async () => {
    if (!scrapeKeywords.trim()) {
      toast({ title: 'Enter search keywords', variant: 'destructive' });
      return;
    }

    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-jobs', {
        body: {
          keywords: scrapeKeywords,
          location: location?.city || 'India',
          sources: selectedSources,
          userId
        }
      });

      if (error) throw error;

      toast({
        title: '🎉 Jobs Scraped Successfully',
        description: `Found ${data.jobs_found} new jobs from ${selectedSources.join(', ')}`
      });

      // Reload jobs
      if (location?.latitude && location?.longitude) {
        fetchAndLoadJobs(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('Error scraping jobs:', error);
      toast({ title: 'Scraping failed', variant: 'destructive' });
    } finally {
      setIsScraping(false);
    }
  };

  const exportJobs = () => {
    const csv = [
      ['Title', 'Company', 'Location', 'Type', 'Salary', 'Applied URL'].join(','),
      ...filteredJobs.map(job => [
        job.job_title,
        job.company_name,
        job.city,
        job.job_type,
        job.salary_range || 'N/A',
        job.apply_url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '📥 Jobs exported' });
  };

  const shareJob = async (job: Job) => {
    const text = `${job.job_title} at ${job.company_name}\n${job.city}\n${job.apply_url || ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: job.job_title, text });
        toast({ title: '✅ Shared successfully' });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: '📋 Copied to clipboard' });
    }
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
            {location?.city && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4 text-primary" />
                <span>{location.city}</span>
              </div>
            )}
          </div>

        {/* Action Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button variant="outline" size="sm" onClick={exportJobs} disabled={filteredJobs.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScrapeKeywords('search')}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Scrape Jobs
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-1" />
              Job Alerts
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/saved-jobs')}>
              <Bookmark className="h-4 w-4 mr-1" />
              Saved ({savedJobs.length})
            </Button>
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
        {locationLoading || loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Finding jobs near you...</p>
          </div>
        ) : !location ? (
          <div className="text-center py-8 space-y-4">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground mb-2">Enable location to find jobs near you</p>
              <p className="text-xs text-muted-foreground">{locationError || 'Grant location permission in your browser'}</p>
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
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onView={(id) => { trackJobView(id); setSelectedJob(job); }}
                    priority
                    onSave={handleSaveJob}
                    onApply={handleApplyJob}
                    isSaved={savedJobs.includes(job.id)}
                    isApplied={appliedJobs.includes(job.id)}
                  />
                ))}
              </div>
            )}

            {/* Trending Jobs */}
            {filteredJobs.filter(j => j.is_featured).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <h2 className="font-bold text-lg">🔥 Trending Jobs in {location?.city || 'Your City'}</h2>
                </div>
                {filteredJobs
                  .filter(job => job.is_featured)
                  .slice(0, 10)
                  .map(job => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      onView={(id) => { trackJobView(id); setSelectedJob(job); }}
                      onSave={handleSaveJob}
                      onApply={handleApplyJob}
                      isSaved={savedJobs.includes(job.id)}
                      isApplied={appliedJobs.includes(job.id)}
                    />
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
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      onView={(id) => { trackJobView(id); setSelectedJob(job); }}
                      onSave={handleSaveJob}
                      onApply={handleApplyJob}
                      isSaved={savedJobs.includes(job.id)}
                      isApplied={appliedJobs.includes(job.id)}
                    />
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
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      onView={(id) => { trackJobView(id); setSelectedJob(job); }}
                      onSave={handleSaveJob}
                      onApply={handleApplyJob}
                      isSaved={savedJobs.includes(job.id)}
                      isApplied={appliedJobs.includes(job.id)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Detail Dialog */}
      <Dialog open={selectedJob !== null && selectedJob !== undefined} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedJob?.job_title}</DialogTitle>
            <DialogDescription>
              {selectedJob?.company_name} • {selectedJob?.city}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedJob && (
              <div className="space-y-4 pr-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{selectedJob.job_type}</Badge>
                  {selectedJob.experience_level && <Badge variant="outline">{selectedJob.experience_level}</Badge>}
                  {selectedJob.is_remote && <Badge variant="secondary">🏠 Remote</Badge>}
                  {selectedJob.source && <Badge variant="secondary">{selectedJob.source}</Badge>}
                </div>

                {selectedJob.salary_range && (
                  <div>
                    <p className="text-sm font-medium mb-1">💰 Salary Range</p>
                    <p className="text-lg font-bold text-primary">{selectedJob.salary_range}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-1">📋 Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedJob.description}</p>
                </div>

                {selectedJob.skills_required && selectedJob.skills_required.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">🎯 Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills_required.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedJob.posted_date && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Posted: {new Date(selectedJob.posted_date).toLocaleDateString()}
                  </div>
                )}

                {selectedJob.distance && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedJob.distance.toFixed(1)} km away
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1" 
                    onClick={() => handleApplyJob(selectedJob.id, selectedJob.apply_url || '#')}
                    disabled={appliedJobs.includes(selectedJob.id)}
                  >
                    {appliedJobs.includes(selectedJob.id) ? '✅ Applied' : 'Apply Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleSaveJob(selectedJob.id)}
                  >
                    <Bookmark className={`h-4 w-4 ${savedJobs.includes(selectedJob.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => shareJob(selectedJob)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Scrape Jobs Dialog */}
      <Dialog open={scrapeKeywords === 'search'} onOpenChange={(open) => !open && setScrapeKeywords('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔍 Scrape Jobs from Multiple Sources</DialogTitle>
            <DialogDescription>
              Search for jobs across Indeed, LinkedIn, Naukri, and more
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Keywords</label>
              <Input
                placeholder="e.g. Software Engineer, Data Analyst, Sales..."
                value={scrapeKeywords}
                onChange={(e) => setScrapeKeywords(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Sources</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'indeed', 'linkedin', 'naukri', 'google'].map(source => (
                  <Button
                    key={source}
                    size="sm"
                    variant={selectedSources.includes(source) ? 'default' : 'outline'}
                    onClick={() => {
                      if (source === 'all') {
                        setSelectedSources(['all']);
                      } else {
                        setSelectedSources(prev => 
                          prev.includes(source) 
                            ? prev.filter(s => s !== source && s !== 'all')
                            : [...prev.filter(s => s !== 'all'), source]
                        );
                      }
                    }}
                  >
                    {source === 'all' ? '🌐 All Sources' : source}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleScrapeJobs}
              disabled={isScraping || !scrapeKeywords.trim()}
            >
              {isScraping ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Scraping
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCard({ job, onView, priority = false, onSave, onApply, isSaved, isApplied }: { 
  job: Job; 
  onView: (id: string) => void; 
  priority?: boolean;
  onSave?: (id: string) => void;
  onApply?: (id: string, url: string) => void;
  isSaved?: boolean;
  isApplied?: boolean;
}) {
  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all ${priority ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}
      onClick={() => onView(job.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">{job.job_title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            <span>{job.company_name}</span>
          </div>
        </div>
        {isSaved && (
          <Badge variant="secondary" className="ml-2">
            <Bookmark className="h-3 w-3 fill-current" />
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {job.city}
          {job.distance && ` • ${job.distance.toFixed(1)}km`}
        </Badge>
        <Badge>{job.job_type}</Badge>
        {job.is_remote && <Badge variant="secondary">🏠 Remote</Badge>}
        {job.experience_level && <Badge variant="outline">{job.experience_level}</Badge>}
      </div>

      {job.salary_range && (
        <div className="flex items-center gap-1 text-sm font-semibold text-primary mb-2">
          <DollarSign className="h-4 w-4" />
          {job.salary_range}
        </div>
      )}

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {job.description}
      </p>

      {job.skills_required && job.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.skills_required.slice(0, 3).map((skill, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
          ))}
          {job.skills_required.length > 3 && (
            <Badge variant="secondary" className="text-xs">+{job.skills_required.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {job.posted_date ? new Date(job.posted_date).toLocaleDateString() : 'Recently posted'}
        </div>
        <div className="flex gap-2">
          {onSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onSave(job.id);
              }}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          )}
          {onApply && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApply(job.id, job.apply_url || '#');
              }}
              disabled={isApplied}
            >
              {isApplied ? '✅ Applied' : 'Apply'}
            </Button>
          )}
        </div>
      </div>

      {job.source && (
        <div className="mt-2 text-xs text-muted-foreground">
          via {job.source}
        </div>
      )}
    </Card>
  );
}
