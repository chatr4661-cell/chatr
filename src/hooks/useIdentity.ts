import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserIdentity {
  id: string;
  user_id: string;
  handle: string;
  suffix: string;
  full_handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  identity_type: string;
  is_active: boolean;
  visibility: string;
  auto_reply_enabled: boolean;
  ai_clone_enabled: boolean;
  ai_clone_personality: string | null;
  ai_clone_boundaries: Record<string, any>;
  created_at: string;
}

export interface DiscoveryProfile {
  id: string;
  user_id: string;
  headline: string | null;
  skills: string[];
  company: string | null;
  job_title: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  social_links: Record<string, string>;
  is_searchable: boolean;
  search_visibility: string;
  allow_messages_from: string;
  allow_calls_from: string;
  show_phone_to: string;
  anonymous_mode: boolean;
}

export const useIdentity = () => {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [discoveryProfile, setDiscoveryProfile] = useState<DiscoveryProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);

  const loadIdentities = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_identities' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at') as any;

      if (error) throw error;
      setIdentities(data || []);

      // Get handle from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_handle')
        .eq('id', user.id)
        .single() as any;

      setHandle(profile?.primary_handle || null);
    } catch (error) {
      console.error('Failed to load identities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const claimHandle = useCallback(async (newHandle: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check availability
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('primary_handle', newHandle.toLowerCase())
        .maybeSingle() as any;

      if (existing) {
        toast.error('Handle already taken');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ primary_handle: newHandle.toLowerCase() } as any)
        .eq('id', user.id);

      if (error) throw error;

      setHandle(newHandle.toLowerCase());
      toast.success('Handle claimed! Your identities are ready.');
      await loadIdentities();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim handle');
      return false;
    }
  }, [loadIdentities]);

  const updateIdentity = useCallback(async (identityId: string, updates: Partial<UserIdentity>) => {
    try {
      const { error } = await supabase
        .from('user_identities' as any)
        .update(updates as any)
        .eq('id', identityId) as any;

      if (error) throw error;
      toast.success('Identity updated');
      await loadIdentities();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update identity');
    }
  }, [loadIdentities]);

  const loadDiscoveryProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_discovery_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle() as any;

      if (error) throw error;
      setDiscoveryProfile(data);
    } catch (error) {
      console.error('Failed to load discovery profile:', error);
    }
  }, []);

  const updateDiscoveryProfile = useCallback(async (updates: Partial<DiscoveryProfile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_discovery_profiles' as any)
        .upsert({ user_id: user.id, ...updates } as any, { onConflict: 'user_id' }) as any;

      if (error) throw error;
      toast.success('Discovery profile updated');
      await loadDiscoveryProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update discovery profile');
    }
  }, [loadDiscoveryProfile]);

  const searchPeople = useCallback(async (query: string, filters?: {
    skills?: string[];
    city?: string;
    industry?: string;
  }) => {
    try {
      let q = supabase
        .from('user_discovery_profiles' as any)
        .select('*, profiles!inner(username, avatar_url, primary_handle)') as any;

      if (query) {
        q = q.or(`headline.ilike.%${query}%,company.ilike.%${query}%,job_title.ilike.%${query}%,city.ilike.%${query}%`);
      }
      if (filters?.city) q = q.eq('city', filters.city);
      if (filters?.industry) q = q.eq('industry', filters.industry);
      if (filters?.skills?.length) q = q.overlaps('skills', filters.skills);

      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }, []);

  const resolveHandle = useCallback(async (fullHandle: string) => {
    try {
      const { data, error } = await supabase
        .from('user_identities' as any)
        .select('*, profiles!inner(username, avatar_url, phone_number)')
        .eq('full_handle', fullHandle)
        .eq('is_active', true)
        .maybeSingle() as any;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Handle resolution failed:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    loadIdentities();
    loadDiscoveryProfile();
  }, [loadIdentities, loadDiscoveryProfile]);

  return {
    identities,
    handle,
    discoveryProfile,
    loading,
    claimHandle,
    updateIdentity,
    updateDiscoveryProfile,
    searchPeople,
    resolveHandle,
    loadIdentities,
    loadDiscoveryProfile,
  };
};
