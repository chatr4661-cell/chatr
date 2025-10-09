import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  BookOpen,
  Video,
  FileText,
  Heart,
  Eye,
  ExternalLink,
  BookmarkPlus,
  Bookmark,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Resource {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  resource_type: string;
  author_name: string | null;
  is_professional: boolean;
  tags: string[];
  image_url: string | null;
  video_url: string | null;
  external_link: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  is_favorited?: boolean;
}

const categories = [
  { id: 'all', label: 'All Resources', emoji: '📚' },
  { id: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { id: 'depression', label: 'Depression', emoji: '💙' },
  { id: 'stress', label: 'Stress Management', emoji: '🧘' },
  { id: 'self-care', label: 'Self Care', emoji: '🌸' },
  { id: 'mindfulness', label: 'Mindfulness', emoji: '🧠' },
  { id: 'relationships', label: 'Relationships', emoji: '❤️' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
];

const resourceTypeIcons = {
  article: BookOpen,
  video: Video,
  guide: FileText,
  tool: Heart,
};

export function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadResources();
  }, [selectedCategory, searchQuery]);

  const loadResources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('mental_health_resources')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check favorites
      if (user && data) {
        const resourceIds = data.map(r => r.id);
        const { data: favorites } = await supabase
          .from('resource_favorites')
          .select('resource_id')
          .eq('user_id', user.id)
          .in('resource_id', resourceIds);

        const favoritedIds = new Set(favorites?.map(f => f.resource_id) || []);
        setResources(data.map(resource => ({
          ...resource,
          is_favorited: favoritedIds.has(resource.id)
        })));
      } else {
        setResources(data || []);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (resourceId: string, currentlyFavorited: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save favorites',
          variant: 'destructive',
        });
        return;
      }

      if (currentlyFavorited) {
        await supabase
          .from('resource_favorites')
          .delete()
          .eq('resource_id', resourceId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('resource_favorites')
          .insert({ resource_id: resourceId, user_id: user.id });
      }

      loadResources();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const viewResource = async (resource: Resource) => {
    setSelectedResource(resource);
    
    // Increment view count
    await supabase
      .from('mental_health_resources')
      .update({ view_count: resource.view_count + 1 })
      .eq('id', resource.id);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search resources, topics, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-glass-border"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="whitespace-nowrap"
            >
              <span className="mr-2">{cat.emoji}</span>
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : selectedResource ? (
        // Resource Detail View
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-8 bg-gradient-card backdrop-blur-glass border-glass-border">
            <Button
              variant="ghost"
              onClick={() => setSelectedResource(null)}
              className="mb-4"
            >
              ← Back to Resources
            </Button>

            {selectedResource.image_url && (
              <img
                src={selectedResource.image_url}
                alt={selectedResource.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {selectedResource.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {selectedResource.author_name && (
                      <span>
                        By {selectedResource.author_name}
                        {selectedResource.is_professional && ' • Professional Content'}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(selectedResource.id, selectedResource.is_favorited || false)}
                >
                  {selectedResource.is_favorited ? (
                    <Bookmark className="w-6 h-6 fill-current text-primary" />
                  ) : (
                    <BookmarkPlus className="w-6 h-6" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{selectedResource.category}</Badge>
                {selectedResource.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {selectedResource.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {selectedResource.like_count} likes
                </span>
              </div>

              {selectedResource.video_url && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={selectedResource.video_url}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedResource.content }} />
              </div>

              {selectedResource.external_link && (
                <Button asChild className="w-full">
                  <a
                    href={selectedResource.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Learn More
                  </a>
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      ) : (
        // Resource List View
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource, index) => {
            const Icon = resourceTypeIcons[resource.resource_type as keyof typeof resourceTypeIcons] || BookOpen;
            
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full p-6 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-all cursor-pointer group">
                  <div className="space-y-4">
                    {resource.image_url && (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <img
                          src={resource.image_url}
                          alt={resource.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <Icon className="w-5 h-5 text-primary" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(resource.id, resource.is_favorited || false);
                          }}
                        >
                          {resource.is_favorited ? (
                            <Bookmark className="w-4 h-4 fill-current" />
                          ) : (
                            <BookmarkPlus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      <h3
                        className="font-semibold text-lg text-foreground line-clamp-2"
                        onClick={() => viewResource(resource)}
                      >
                        {resource.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {resource.description}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {resource.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {resource.like_count}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => viewResource(resource)}
                    >
                      Read More
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && resources.length === 0 && (
        <Card className="p-12 text-center bg-gradient-card backdrop-blur-glass border-glass-border">
          <p className="text-muted-foreground">No resources found. Try adjusting your search.</p>
        </Card>
      )}
    </div>
  );
}
