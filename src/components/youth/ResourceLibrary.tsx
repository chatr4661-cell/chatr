import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen, Video, FileText, Heart, Clock, TrendingUp, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  resource_type: string;
  difficulty_level: string | null;
  estimated_read_time: number | null;
  author: string | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  video_url: string | null;
  view_count: number;
  favorite_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
}

const CATEGORIES = ['all', 'anxiety', 'depression', 'stress', 'wellness'];

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    loadResources();
  }, [selectedCategory]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadResources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('mental_health_resources')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: resourcesData, error } = await query;

      if (error) throw error;

      // Check which resources are favorited
      if (user && resourcesData) {
        const { data: favoritesData } = await supabase
          .from('resource_favorites')
          .select('resource_id')
          .eq('user_id', user.id);

        const favoritedResourceIds = new Set(favoritesData?.map((f: any) => f.resource_id) || []);

        setResources((resourcesData as any[]).map((resource: any) => ({
          ...resource,
          is_favorited: favoritedResourceIds.has(resource.id)
        })));
      } else {
        setResources((resourcesData as any[]) || []);
      }
    } catch (error: any) {
      console.error('Error loading resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (resourceId: string, currentlyFavorited: boolean) => {
    if (!currentUser) {
      toast.error('Please sign in to save favorites');
      return;
    }

    try {
      if (currentlyFavorited) {
        const { error } = await supabase
          .from('resource_favorites')
          .delete()
          .eq('resource_id', resourceId)
          .eq('user_id', currentUser.id);

        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('resource_favorites')
          .insert({ resource_id: resourceId, user_id: currentUser.id } as any);

        if (error) throw error;
        toast.success('Added to favorites');
      }

      loadResources();
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const incrementViewCount = async (resourceId: string) => {
    try {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      await supabase
        .from('mental_health_resources')
        .update({ view_count: (resource.view_count || 0) + 1 } as any)
        .eq('id', resourceId);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'guide':
        return BookOpen;
      default:
        return FileText;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search resources, topics, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50 border-glass-border"
        />
      </div>

      {/* Category Filter */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-background/50">
          {CATEGORIES.map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Featured Resources */}
      {selectedCategory === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Featured Resources</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {filteredResources.filter(r => r.is_featured).slice(0, 4).map((resource) => {
              const Icon = getResourceIcon(resource.resource_type);
              return (
                <Card
                  key={resource.id}
                  className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-glass border-glass-border hover:shadow-glow transition-all cursor-pointer"
                  onClick={() => {
                    incrementViewCount(resource.id);
                    toast.info('Opening resource...');
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-foreground line-clamp-2">{resource.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(resource.id, resource.is_favorited || false);
                          }}
                          className="flex-shrink-0"
                        >
                          <Heart className={`w-4 h-4 ${resource.is_favorited ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{resource.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{resource.difficulty_level}</Badge>
                        {resource.estimated_read_time && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {resource.estimated_read_time} min
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {resource.view_count || 0} views
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Resources */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">
          {selectedCategory === 'all' ? 'All Resources' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Resources`}
        </h3>
        <div className="grid gap-4">
          {filteredResources.filter(r => selectedCategory === 'all' ? !r.is_featured : true).map((resource) => {
            const Icon = getResourceIcon(resource.resource_type);
            return (
              <Card
                key={resource.id}
                className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-all cursor-pointer"
                onClick={() => {
                  incrementViewCount(resource.id);
                  toast.info('Opening resource...');
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1">{resource.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(resource.id, resource.is_favorited || false);
                        }}
                        className="flex-shrink-0"
                      >
                        <Heart className={`w-4 h-4 ${resource.is_favorited ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{resource.category}</Badge>
                      <Badge variant="outline" className="capitalize">{resource.difficulty_level}</Badge>
                      {resource.estimated_read_time && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" />
                          {resource.estimated_read_time} min
                        </Badge>
                      )}
                      {resource.author && (
                        <span className="text-xs text-muted-foreground">by {resource.author}</span>
                      )}
                    </div>
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-xs text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredResources.length === 0 && (
        <Card className="p-12 text-center bg-gradient-card backdrop-blur-glass border-glass-border">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No resources found</h3>
          <p className="text-muted-foreground">Try adjusting your search or category filter</p>
        </Card>
      )}
    </div>
  );
}
