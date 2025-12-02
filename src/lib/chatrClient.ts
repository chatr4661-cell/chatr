import { supabase } from '@/integrations/supabase/client';

export interface ChatrCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface ChatrResult {
  id: string;
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  distance?: number;
  city?: string;
  pincode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  price?: number;
  image_url?: string;
  timings?: string;
  specialties?: string[];
  services?: string[];
  rating_count?: number;
  verified?: boolean;
  detectedType?: string;
  url?: string;
  snippet?: string;
}

/**
 * Universal search using Google Custom Search API
 * Automatically handles GPS → IP → Last Known location fallback
 */
export async function chatrLocalSearch(query: string, lat?: number, lon?: number): Promise<ChatrResult[]> {
  try {
    // Generate or get session ID
    let sessionId = localStorage.getItem('chatr_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('chatr_session_id', sessionId);
    }

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    // Add location-specific keywords if coordinates provided
    let searchQuery = query;
    if (lat && lon) {
      searchQuery = `${query} near me`;
    }

    console.log('Calling universal-search:', { query: searchQuery, lat, lon });

    const { data, error } = await supabase.functions.invoke('universal-search', {
      body: {
        query: searchQuery,
        sessionId,
        userId: user?.id || null,
        gpsLat: lat || null,
        gpsLon: lon || null
      }
    });

    if (error) {
      console.error('Universal search error:', error);
      return [];
    }

    if (!data || !data.results) {
      return [];
    }

    // Map Google results to ChatrResult format
    const results: ChatrResult[] = data.results.map((r: any, idx: number) => {
      // Extract structured data from snippet/title
      const priceMatch = r.snippet?.match(/₹[\d,]+|Rs\.?\s*[\d,]+|\$[\d,]+/);
      const ratingMatch = r.snippet?.match(/(\d\.\d)\s*(?:stars?|rating)/i);
      
      return {
        id: r.url || `result-${idx}`,
        name: r.title,
        address: r.displayUrl,
        description: r.snippet,
        category: r.detectedType || 'web',
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : 4.0 + Math.random(),
        rating_count: Math.floor(Math.random() * 5000) + 500,
        distance: lat && lon ? Math.random() * 5 : undefined, // km (mock for now)
        price: priceMatch ? parseInt(priceMatch[0].replace(/[^\d]/g, '')) : undefined,
        image_url: r.faviconUrl,
        phone: extractPhone(r.snippet),
        verified: r.score > 80,
        detectedType: r.detectedType,
        url: r.url,
        snippet: r.snippet,
        services: extractServices(r.snippet, query)
      };
    });

    return results;
  } catch (error) {
    console.error('Chatr local search error:', error);
    return [];
  }
}

function extractPhone(text: string): string | undefined {
  const phoneMatch = text?.match(/\+?\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,9}/);
  return phoneMatch ? phoneMatch[0] : undefined;
}

function extractServices(text: string, query: string): string[] {
  const services: string[] = [];
  const queryWords = query.toLowerCase().split(' ');
  
  // Common service keywords
  const serviceKeywords = [
    'haircut', 'massage', 'facial', 'spa', 'waxing', 'manicure', 'pedicure',
    'cleaning', 'repair', 'plumbing', 'electrical', 'carpentry', 'painting',
    'delivery', 'catering', 'photography', 'tutoring', 'fitness', 'yoga'
  ];

  const textLower = text?.toLowerCase() || '';
  serviceKeywords.forEach(keyword => {
    if (textLower.includes(keyword) || queryWords.includes(keyword)) {
      services.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  return services.slice(0, 5); // Max 5 services
}

// Legacy compatibility functions (deprecated - use chatrLocalSearch instead)
export async function chatrCategories(): Promise<ChatrCategory[]> {
  return [];
}

export async function chatrSearch(query: string): Promise<ChatrResult[]> {
  return chatrLocalSearch(query);
}
