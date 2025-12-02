import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

export default function LocalDeals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const { location } = useChatrLocation();
  const [providers, setProviders] = useState<ChatrResult[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ChatrResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const { toast } = useToast();

  useEffect(() => {
    if (location?.lat && location?.lon) {
      loadProviders();
    }
  }, [category, location?.lat, location?.lon]);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, sortBy]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const searchTerm = category || 'services salon plumber electrician';
      const results = await chatrLocalSearch(searchTerm, location?.lat, location?.lon);
      
      if (results && results.length > 0) {
        setProviders(results);
      } else {
        setProviders([]);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service providers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    setFilteredProviders(filtered);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleDirections = (lat?: number, lon?: number) => {
    if (lat && lon) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    }
  };

  const handleBook = () => {
    toast({
      title: "Booking",
      description: "Opening booking interface...",
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
            <h1 className="text-3xl font-bold text-foreground">
              {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Services` : 'Local Services'}
            </h1>
            <p className="text-muted-foreground">
              {category ? `Find the best ${category} services near you` : 'Discover local services & professionals'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${category || 'services'}...`}
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
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Finding {category || 'services'}...</p>
          </div>
        )}

        {!loading && filteredProviders.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-lg font-medium text-foreground">
              0 professionals available
            </p>
            <p className="text-muted-foreground">
              Try adjusting your search or check back later
            </p>
          </div>
        )}

        {!loading && filteredProviders.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {filteredProviders.length} professionals available
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredProviders.map((provider) => (
                <CategoryCard
                  key={provider.id}
                  result={provider}
                  onCall={handleCall}
                  onDirections={handleDirections}
                  onBook={handleBook}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
