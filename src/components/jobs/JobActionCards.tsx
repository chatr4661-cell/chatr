/**
 * Job Action Cards - Replace search results with actionable job cards
 * Part of CHATR Action Engine - Intent → Execution
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Building2, 
  IndianRupee,
  Zap,
  ArrowRight,
  Star,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { JobIntent } from '@/services/intentEngine/jobIntentDetector';
import { QuickApplyModal } from './QuickApplyModal';

export interface JobListing {
  id: string;
  title: string;
  company_name: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  job_type: string;
  experience_years?: number;
  skills?: string[];
  category?: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  is_urgent?: boolean;
  is_verified?: boolean;
  posted_ago?: string;
  applications_count?: number;
}

interface JobActionCardsProps {
  jobs: JobListing[];
  intent: JobIntent;
  onApply: (job: JobListing) => void;
  onFilterSelect: (filter: string) => void;
  isLoading?: boolean;
  userProfile?: {
    name?: string;
    phone?: string;
    email?: string;
    skills?: string[];
    experience?: string;
  };
}

export function JobActionCards({ 
  jobs, 
  intent, 
  onApply, 
  onFilterSelect,
  isLoading,
  userProfile 
}: JobActionCardsProps) {
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  const formatSalary = (min?: number, max?: number, type?: string) => {
    if (!min && !max) return null;
    const format = (n: number) => {
      if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
      if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
      return `₹${n}`;
    };
    const suffix = type === 'month' ? '/mo' : type === 'year' ? '/yr' : '';
    if (min && max) return `${format(min)} - ${format(max)}${suffix}`;
    if (min) return `${format(min)}+${suffix}`;
    if (max) return `Up to ${format(max)}${suffix}`;
    return null;
  };

  const handleApplySuccess = (jobId: string) => {
    setAppliedJobs(prev => new Set(prev).add(jobId));
    setSelectedJob(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Finding perfect jobs for you...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Smart Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">
            {jobs.length} Job{jobs.length !== 1 ? 's' : ''} Match{jobs.length === 1 ? 'es' : ''} for You
          </h2>
          <p className="text-xs text-muted-foreground">
            {intent.extractedData.location ? `In ${intent.extractedData.location}` : 'Based on your search'}
            {intent.extractedData.category && ` • ${intent.extractedData.category}`}
          </p>
        </div>
      </div>

      {/* Smart Filter Chips */}
      {intent.suggestedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {intent.suggestedFilters.map((filter, i) => (
            <Badge
              key={i}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1"
              onClick={() => onFilterSelect(filter)}
            >
              {filter}
            </Badge>
          ))}
        </div>
      )}

      {/* Job Cards */}
      {jobs.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground mb-4">No jobs found matching your criteria</p>
          <Button variant="outline" onClick={() => onFilterSelect('All Jobs')}>
            View All Jobs
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card 
              key={job.id} 
              className="p-4 hover:shadow-lg transition-all border-border/50 hover:border-primary/30"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    {job.is_verified && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {job.is_urgent && (
                      <Badge variant="destructive" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{job.company_name}</span>
                  </div>
                </div>
                {formatSalary(job.salary_min, job.salary_max, job.salary_type) && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-semibold text-green-600">
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span className="text-sm">
                        {formatSalary(job.salary_min, job.salary_max, job.salary_type)?.replace('₹', '')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="capitalize">{job.job_type?.replace('-', ' ')}</span>
                </div>
                {job.experience_years !== undefined && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    <span>{job.experience_years === 0 ? 'Fresher' : `${job.experience_years}+ yrs`}</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {job.skills.slice(0, 4).map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {job.skills.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{job.skills.length - 4}
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {appliedJobs.has(job.id) ? (
                  <Button disabled className="flex-1 gap-2 bg-green-500 hover:bg-green-500">
                    <CheckCircle2 className="w-4 h-4" />
                    Applied
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 gap-2"
                    onClick={() => setSelectedJob(job)}
                  >
                    <Zap className="w-4 h-4" />
                    Apply Now
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => onApply(job)}
                  className="gap-1"
                >
                  Details
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {job.posted_ago && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Posted {job.posted_ago}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Quick Apply Modal */}
      {selectedJob && (
        <QuickApplyModal
          job={selectedJob}
          userProfile={userProfile}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          onSuccess={() => handleApplySuccess(selectedJob.id)}
        />
      )}
    </div>
  );
}
