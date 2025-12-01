import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 10 } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    const supabaseClient = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null;

    console.log('Fetching healthcare near:', latitude, longitude, 'within', radius, 'km');

    // TODO: Integrate Google Maps Places API for real healthcare data
    // const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    // For now, using sample data with realistic locations around user
    const sampleProviders = [
      {
        name: 'Apollo Clinic',
        type: 'clinic',
        description: 'Multi-specialty clinic with experienced doctors',
        address: 'Main Street, Near City Center',
        latitude: latitude + 0.03,
        longitude: longitude + 0.02,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        phone_number: '+91-22-12345678',
        timings: '9:00 AM - 9:00 PM',
        specialties: ['General Medicine', 'Pediatrics', 'Dermatology'],
        services_offered: ['Consultation', 'Laboratory', 'Pharmacy'],
        rating_average: 4.5,
        rating_count: 120,
        verified: true,
        is_monetized: false,
        added_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        name: 'City General Hospital',
        type: 'hospital',
        description: '24/7 emergency and multi-specialty hospital',
        address: 'Hospital Road, Central Area',
        latitude: latitude + 0.01,
        longitude: longitude - 0.02,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        phone_number: '+91-22-23456789',
        timings: '24/7',
        specialties: ['Emergency', 'Surgery', 'Cardiology', 'Orthopedics'],
        services_offered: ['Emergency', 'ICU', 'Surgery', 'Diagnostics'],
        rating_average: 4.2,
        rating_count: 250,
        verified: true,
        is_monetized: false,
        added_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        name: 'MedPlus Pharmacy',
        type: 'pharmacy',
        description: 'Trusted pharmacy with wide range of medicines',
        address: 'Market Square, Shopping District',
        latitude: latitude - 0.02,
        longitude: longitude + 0.03,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        phone_number: '+91-11-12345678',
        timings: '8:00 AM - 10:00 PM',
        specialties: ['Prescription Medicines', 'OTC Products'],
        services_offered: ['Home Delivery', 'Online Orders'],
        rating_average: 4.0,
        rating_count: 80,
        verified: true,
        is_monetized: false,
        added_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        name: 'HealthCare Diagnostics',
        type: 'lab',
        description: 'Advanced diagnostic center with modern equipment',
        address: 'Medical Complex, Healthcare Zone',
        latitude: latitude + 0.04,
        longitude: longitude + 0.05,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        phone_number: '+91-80-12345678',
        timings: '7:00 AM - 8:00 PM',
        specialties: ['Blood Tests', 'X-Ray', 'Ultrasound', 'CT Scan'],
        services_offered: ['Pathology', 'Radiology', 'Home Collection'],
        rating_average: 4.3,
        rating_count: 150,
        verified: true,
        is_monetized: false,
        added_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        name: 'Family Care Clinic',
        type: 'clinic',
        description: 'Family healthcare with personalized attention',
        address: 'Residential Area, Park Lane',
        latitude: latitude - 0.05,
        longitude: longitude - 0.01,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        phone_number: '+91-20-12345678',
        timings: '10:00 AM - 6:00 PM',
        specialties: ['Family Medicine', 'Vaccination', 'Health Checkups'],
        services_offered: ['Consultation', 'Preventive Care'],
        rating_average: 4.6,
        rating_count: 95,
        verified: true,
        is_monetized: false,
        added_by: '00000000-0000-0000-0000-000000000000'
      }
    ];

    // Filter providers within radius and calculate distance
    const providersWithDistance = sampleProviders.map(provider => {
      const distance = calculateDistance(latitude, longitude, provider.latitude, provider.longitude);
      return { ...provider, distance: parseFloat(distance.toFixed(1)) };
    }).filter(provider => provider.distance <= radius);

    // Insert healthcare providers into database if Supabase is configured
    if (supabaseClient) {
      const { error } = await supabaseClient
        .from('healthcare_db')
        .upsert(providersWithDistance, { onConflict: 'name,city', ignoreDuplicates: true });

      if (error) {
        console.error('Database error:', error);
      }
    }

    console.log('Inserted', providersWithDistance.length, 'providers within', radius, 'km');

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: providersWithDistance.length,
        providers: providersWithDistance 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-healthcare:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage, details: error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
