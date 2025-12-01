const BASE = "http://localhost:4300";

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
}

export async function chatrTest() {
  return fetch(`${BASE}/api/test`).then(r => r.json());
}

export async function chatrCategories(): Promise<ChatrCategory[]> {
  return fetch(`${BASE}/api/categories`).then(r => r.json());
}

export async function chatrSearch(query: string): Promise<ChatrResult[]> {
  return fetch(`${BASE}/api/search?q=${encodeURIComponent(query)}`)
    .then(r => r.json());
}

export async function chatrLocalSearch(query: string, lat: number, lon: number): Promise<ChatrResult[]> {
  try {
    const response = await fetch(`${BASE}/local/search?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chatr local search error:', error);
    return [];
  }
}
