import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, ArrowLeft } from "lucide-react";
import { useChatrLocation } from "@/hooks/useChatrLocation";
import { chatrLocalSearch, ChatrResult } from "@/lib/chatrClient";
import { useToast } from "@/hooks/use-toast";
import { CategoryCard } from "@/components/search/CategoryCard";

export default function LocalJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ChatrResult[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ChatrResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobType, setJobType] = useState("all");
  const [experience, setExperience] = useState("all");
  const { location } = useChatrLocation();

  useEffect(() => {
    if (location?.lat && location?.lon) {
      fetchJobs(location.lat, location.lon);
    }
  }, [location?.lat, location?.lon]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, jobType, experience]);

  const fetchJobs = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const results = await chatrLocalSearch('jobs careers hiring employment', latitude, longitude);
      
      if (results && results.length > 0) {
        setJobs(results);
      } else {
        setJobs([]);
      }
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
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (jobType !== 'all') {
      filtered = filtered.filter(job =>
        job.description?.toLowerCase().includes(jobType)
      );
    }

    if (experience !== 'all') {
      filtered = filtered.filter(job =>
        job.description?.toLowerCase().includes(experience)
      );
    }

    setFilteredJobs(filtered);
  };

  const handleApply = () => {
    toast({
      title: "Apply",
      description: "Opening application form...",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Local Jobs</h1>
            <p className="text-muted-foreground">Find opportunities near you</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
          <Button size="icon" variant="outline" className="rounded-full">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="entry">Entry Level</SelectItem>
              <SelectItem value="mid">Mid Level</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Finding jobs...</p>
          </div>
        )}

        {!loading && filteredJobs.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-foreground">No jobs found</p>
          </div>
        )}

        {!loading && filteredJobs.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length} jobs available
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJobs.map((job) => (
                <CategoryCard
                  key={job.id}
                  result={job}
                  onBook={handleApply}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
