import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MAX_ANONYMOUS_SEARCHES = 3;
const STORAGE_KEY = 'anonymous_search_count';

export const useAnonymousSearchLimit = () => {
  const [searchCount, setSearchCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);

      // If authenticated, reset counter
      if (session) {
        localStorage.removeItem(STORAGE_KEY);
        setSearchCount(0);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        localStorage.removeItem(STORAGE_KEY);
        setSearchCount(0);
        setShowLoginPrompt(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load search count on mount
  useEffect(() => {
    if (!isAuthenticated) {
      const stored = localStorage.getItem(STORAGE_KEY);
      setSearchCount(stored ? parseInt(stored, 10) : 0);
    }
  }, [isAuthenticated]);

  const incrementSearch = useCallback(() => {
    if (isAuthenticated) {
      return true; // Allow unlimited searches
    }

    const newCount = searchCount + 1;
    setSearchCount(newCount);
    localStorage.setItem(STORAGE_KEY, newCount.toString());

    if (newCount >= MAX_ANONYMOUS_SEARCHES) {
      setShowLoginPrompt(true);
      return false; // Block search
    }

    return true; // Allow search
  }, [searchCount, isAuthenticated]);

  const closeLoginPrompt = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  const canSearch = isAuthenticated || searchCount < MAX_ANONYMOUS_SEARCHES;
  const remainingSearches = isAuthenticated 
    ? Infinity 
    : Math.max(0, MAX_ANONYMOUS_SEARCHES - searchCount);

  return {
    canSearch,
    searchCount,
    remainingSearches,
    isAuthenticated,
    showLoginPrompt,
    incrementSearch,
    closeLoginPrompt,
    loading,
    maxSearches: MAX_ANONYMOUS_SEARCHES,
  };
};
