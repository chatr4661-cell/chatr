import { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, DollarSign, Clock, Building, Filter, Plus, Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  company_name: string;
  description: string;
  location: string;
  salary_min: number;
  salary_max: number;
  salary_type: string;
  job_type: string;
  skills: string[];
  experience_years: number;
  category: string;
  image_url: string;
  views_count: number;
  created_at: string;
}

interface ChatrWorldJobsProps {
  location?: { lat: number; lon: number; city?: string } | null;
}

const jobCategories = [
  'All', 'IT & Software', 'Sales & Marketing', 'Customer Service', 
  'Healthcare', 'Education', 'Finance', 'Construction', 'Retail', 'Hospitality'
];

const jobTypes = ['All', 'full-time', 'part-time', 'contract', 'freelance', 'internship'];

export function ChatrWorldJobs({ location }: ChatrWorldJobsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [jobType, setJobType] = useState('All');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [category, jobType]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatr_jobs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category !== 'All') {
        query = query.eq('category', category);
      }
      if (jobType !== 'All') {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (job: Job) => {
    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to apply');
        return;
      }

      const { error } = await supabase
        .from('chatr_job_applications')
        .insert({
          job_id: job.id,
          user_id: user.id,
          cover_letter: coverLetter,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already applied for this job');
        } else {
          throw error;
        }
      } else {
        toast.success('Application submitted successfully!');
        setCoverLetter('');
        setSelectedJob(null);
      }
    } catch (error) {
      console.error('Application error:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSalary = (min: number, max: number, type: string) => {
    const format = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
    if (min && max) return `${format(min)} - ${format(max)}/${type}`;
    if (min) return `${format(min)}+/${type}`;
    return 'Not disclosed';
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs, companies, locations..."
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {jobCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jobType} onValueChange={setJobType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            {jobTypes.map(type => (
              <SelectItem key={type} value={type}>{type === 'All' ? 'All Types' : type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Badge */}
      {location?.city && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm">Showing jobs near <strong>{location.city}</strong></span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Jobs Grid */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map(job => (
            <Card key={job.id} className="hover:shadow-lg transition-all group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg line-clamp-1">{job.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{job.company_name}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {job.job_type}
                  </span>
                  {job.experience_years > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {job.experience_years}+ yrs
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="h-4 w-4" />
                  {formatSalary(job.salary_min, job.salary_max, job.salary_type)}
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 3).map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                    {job.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{job.skills.length - 3}</Badge>
                    )}
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-2" onClick={() => setSelectedJob(job)}>
                      Apply Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Apply for {job.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">{job.company_name}</p>
                        <p className="text-sm">{job.description}</p>
                      </div>
                      <div>
                        <Label htmlFor="cover">Cover Letter (Optional)</Label>
                        <Textarea
                          id="cover"
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          placeholder="Tell them why you're a great fit..."
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={() => handleApply(job)} 
                        disabled={applying}
                        className="w-full"
                      >
                        {applying ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit Application
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No jobs found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}