import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, latitude, longitude } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch healthcare providers using Overpass API (OpenStreetMap)
    const providers = await searchHealthcare(city, latitude, longitude);
    
    // Store in database with deduplication
    for (const provider of providers) {
      // Check if provider already exists
      const { data: existing } = await supabaseClient
        .from('healthcare_db')
        .select('id')
        .eq('name', provider.name)
        .eq('address', provider.address)
        .single();
      
      if (!existing) {
        await supabaseClient
          .from('healthcare_db')
          .insert({
            name: provider.name,
            type: provider.type,
            description: provider.description,
            address: provider.address,
            city: provider.city,
            pincode: provider.pincode,
            phone_number: provider.phone_number,
            specialties: provider.specialties,
            services_offered: provider.services_offered,
            rating_average: provider.rating_average,
            rating_count: provider.rating_count,
            verified: false,
            is_monetized: false,
            latitude: provider.latitude,
            longitude: provider.longitude
          });
      }
    }

    return new Response(
      JSON.stringify({ success: true, providers, count: providers.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchHealthcare(city: string, lat?: number, lon?: number) {
  if (!lat || !lon) {
    return [];
  }

  try {
    // Use Overpass API to find hospitals and clinics near location
    const radius = 5000; // 5km radius
    const query = `
      [out:json];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lon});
        node["amenity"="clinic"](around:${radius},${lat},${lon});
        node["amenity"="doctors"](around:${radius},${lat},${lon});
        node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      );
      out body;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    const data = await response.json();
    
    const providers = data.elements.map((element: any) => ({
      name: element.tags.name || 'Healthcare Facility',
      type: getHealthcareType(element.tags.amenity),
      description: element.tags.description || null,
      address: formatAddress(element.tags),
      city: city,
      pincode: element.tags.postcode || null,
      phone_number: element.tags.phone || element.tags.contact_phone || null,
      specialties: element.tags.speciality ? [element.tags.speciality] : [],
      services_offered: [],
      rating_average: 0,
      rating_count: 0,
      latitude: element.lat,
      longitude: element.lon
    }));
    
    return providers;
  } catch (error) {
    console.error('Healthcare search error:', error);
    return [];
  }
}

function getHealthcareType(amenity: string): string {
  const typeMap: { [key: string]: string } = {
    'hospital': 'hospital',
    'clinic': 'clinic',
    'doctors': 'clinic',
    'pharmacy': 'pharmacy'
  };
  return typeMap[amenity] || 'clinic';
}

function formatAddress(tags: any): string {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:district'],
    tags['addr:city']
  ].filter(Boolean);
  
  return parts.join(', ') || 'Address not available';
}
