/**
 * Full-Text Search Hook
 * Server-side search with PostgreSQL full-text search
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  content: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  rank?: number;
  headline?: string;
  conversation_name?: string;
  sender_name?: string;
}

interface SearchFilters {
  conversationId?: string;
  senderId?: string;
  messageType?: string;
  dateFrom?: string;
  dateTo?: string;
  hasMedia?: boolean;
}

export const useFullTextSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Perform full-text search
   */
  const search = useCallback(async (
    query: string,
    filters: SearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<SearchResult[]> => {
    if (!query.trim()) {
      setResults([]);
      setTotalCount(0);
      return [];
    }

    setLoading(true);
    setSearchQuery(query);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's conversations first
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participants?.length) {
        setResults([]);
        setTotalCount(0);
        return [];
      }

      const conversationIds = participants.map(p => p.conversation_id);

      // Build search query
      let searchBuilder = supabase
        .from('messages')
        .select('id, content, conversation_id, sender_id, created_at, message_type, media_url', { count: 'exact' })
        .in('conversation_id', conversationIds)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.conversationId) {
        searchBuilder = searchBuilder.eq('conversation_id', filters.conversationId);
      }
      if (filters.senderId) {
        searchBuilder = searchBuilder.eq('sender_id', filters.senderId);
      }
      if (filters.messageType) {
        searchBuilder = searchBuilder.eq('message_type', filters.messageType);
      }
      if (filters.dateFrom) {
        searchBuilder = searchBuilder.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        searchBuilder = searchBuilder.lte('created_at', filters.dateTo);
      }
      if (filters.hasMedia !== undefined) {
        if (filters.hasMedia) {
          searchBuilder = searchBuilder.not('media_url', 'is', null);
        } else {
          searchBuilder = searchBuilder.is('media_url', null);
        }
      }

      const { data, error, count } = await searchBuilder;

      if (error) throw error;

      // Highlight search terms
      const searchResults: SearchResult[] = (data || []).map(msg => {
        const regex = new RegExp(`(${query})`, 'gi');
        const headline = msg.content.replace(regex, '<mark>$1</mark>');
        
        return {
          ...msg,
          headline,
          rank: 1 // Simple ranking, could be enhanced
        };
      });

      setResults(searchResults);
      setTotalCount(count || 0);

      return searchResults;
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Debounced search for real-time typing
   */
  const searchDebounced = useCallback((
    query: string,
    filters?: SearchFilters,
    delay: number = 300
  ) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(query, filters);
    }, delay);
  }, [search]);

  /**
   * Search within specific conversation
   */
  const searchInConversation = useCallback(async (
    conversationId: string,
    query: string,
    limit: number = 50
  ): Promise<SearchResult[]> => {
    return search(query, { conversationId }, limit);
  }, [search]);

  /**
   * Get search suggestions based on history (using localStorage for simplicity)
   */
  const getSearchSuggestions = useCallback(async (): Promise<string[]> => {
    try {
      const stored = localStorage.getItem('chatr_search_suggestions');
      if (stored) {
        return JSON.parse(stored).slice(0, 10);
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  /**
   * Save search to history (using localStorage)
   */
  const saveSearchHistory = useCallback(async (query: string) => {
    try {
      if (!query.trim()) return;

      const stored = localStorage.getItem('chatr_search_suggestions');
      const history: string[] = stored ? JSON.parse(stored) : [];
      
      // Add to front, remove duplicates, limit to 20
      const updated = [query.trim(), ...history.filter(h => h !== query.trim())].slice(0, 20);
      localStorage.setItem('chatr_search_suggestions', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, []);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setResults([]);
    setSearchQuery('');
    setTotalCount(0);
  }, []);

  /**
   * Search for messages with specific content type
   */
  const searchByType = useCallback(async (
    messageType: 'image' | 'video' | 'document' | 'voice' | 'location',
    conversationId?: string
  ): Promise<SearchResult[]> => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('messages')
        .select('id, content, conversation_id, sender_id, created_at, message_type, media_url')
        .eq('message_type', messageType)
        .order('created_at', { ascending: false })
        .limit(100);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else {
        // Get user's conversations
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (participants?.length) {
          query = query.in('conversation_id', participants.map(p => p.conversation_id));
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const searchResults: SearchResult[] = (data || []).map(msg => ({
        ...msg,
        headline: msg.content
      }));

      setResults(searchResults);
      return searchResults;
    } catch (error) {
      console.error('Search by type failed:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    totalCount,
    searchQuery,
    search,
    searchDebounced,
    searchInConversation,
    searchByType,
    getSearchSuggestions,
    saveSearchHistory,
    clearSearch
  };
};
