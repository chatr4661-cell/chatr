import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Briefcase, Code, Filter, UserPlus, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIdentity } from '@/hooks/useIdentity';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { useDebounce } from '@/hooks/useDebounce';

const Discover = () => {
  const navigate = useNavigate();
  const { searchPeople } = useIdentity();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<{ city?: string; industry?: string }>({});

  const debouncedSearch = useDebounce(query, 300);

  React.useEffect(() => {
    if (debouncedSearch.length >= 2) {
      performSearch(debouncedSearch);
    } else {
      setResults([]);
    }
  }, [debouncedSearch, filters]);

  const performSearch = async (q: string) => {
    setSearching(true);
    const data = await searchPeople(q, filters);
    setResults(data);
    setSearching(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Discover People</h1>
            <p className="text-xs text-muted-foreground">Find anyone by skill, company, or location</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, company, city..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Developer', 'Designer', 'Doctor', 'Teacher', 'Business'].map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="cursor-pointer whitespace-nowrap hover:bg-primary/10"
              onClick={() => setQuery(skill)}
            >
              {skill}
            </Badge>
          ))}
        </div>

        {/* Results */}
        {searching && <p className="text-center text-sm text-muted-foreground py-8">Searching...</p>}

        {!searching && results.length === 0 && query.length >= 2 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No people found</p>
          </div>
        )}

        {!searching && results.length === 0 && query.length < 2 && (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">Discover CHATR Users</p>
            <p className="text-sm text-muted-foreground mt-1">Search by name, skill, company, or city</p>
          </div>
        )}

        {results.map((person: any) => (
          <Card key={person.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={person.profiles?.avatar_url} />
                  <AvatarFallback>{(person.profiles?.username || '?')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold truncate">{person.profiles?.username || 'User'}</p>
                    {person.profiles?.primary_handle && (
                      <span className="text-xs text-muted-foreground font-mono">@{person.profiles.primary_handle}</span>
                    )}
                    <TrustScoreBadge userId={person.user_id} />
                  </div>
                  {person.headline && (
                    <p className="text-sm text-muted-foreground truncate">{person.headline}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {person.company && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> {person.company}
                      </span>
                    )}
                    {person.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {person.city}
                      </span>
                    )}
                  </div>
                  {person.skills?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {person.skills.slice(0, 3).map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Discover;
