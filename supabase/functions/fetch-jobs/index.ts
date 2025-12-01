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
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('Fetching jobs near:', latitude, longitude, 'within', radius, 'km');

    // TODO: Integrate real job APIs (Adzuna, Google Jobs, etc.)
    // const ADZUNA_API_KEY = Deno.env.get('ADZUNA_API_KEY');
    // const ADZUNA_APP_ID = Deno.env.get('ADZUNA_APP_ID');
    
    // For now, using sample data with realistic locations around user
    const sampleJobs = [
      {
        job_title: 'Software Developer',
        company_name: 'Tech Solutions Inc',
        job_type: 'Full-time',
        category: 'Technology',
        description: 'Develop web applications using React and Node.js',
        salary_range: '₹5-8 LPA',
        latitude: latitude + 0.02,
        longitude: longitude + 0.01,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        is_remote: false,
        is_featured: true,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        job_title: 'Marketing Manager',
        company_name: 'Brand Boost',
        job_type: 'Full-time',
        category: 'Marketing',
        description: 'Lead marketing campaigns and team management',
        salary_range: '₹6-10 LPA',
        latitude: latitude + 0.05,
        longitude: longitude - 0.02,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        is_remote: true,
        is_featured: false,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        job_title: 'Sales Executive',
        company_name: 'Growth Hub',
        job_type: 'Full-time',
        category: 'Sales',
        description: 'B2B sales and client relationship management',
        salary_range: '₹3-5 LPA',
        latitude: latitude + 0.07,
        longitude: longitude + 0.03,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        is_remote: false,
        is_featured: false,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        job_title: 'Graphic Designer',
        company_name: 'Creative Studio',
        job_type: 'Part-time',
        category: 'Design',
        description: 'Create visual content for digital platforms',
        salary_range: '₹2-4 LPA',
        latitude: latitude - 0.03,
        longitude: longitude + 0.04,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        is_remote: true,
        is_featured: false,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        job_title: 'Customer Support',
        company_name: 'Help Desk Pro',
        job_type: 'Full-time',
        category: 'Customer Service',
        description: 'Provide customer support via phone and email',
        salary_range: '₹2-3 LPA',
        latitude: latitude + 0.01,
        longitude: longitude - 0.05,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        is_remote: false,
        is_featured: false,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      },
      {
        job_title: 'Data Analyst',
        company_name: 'Analytics Corp',
        job_type: 'Full-time',
        category: 'Technology',
        description: 'Analyze data and create reports using Python',
        salary_range: '₹4-7 LPA',
        latitude: latitude - 0.06,
        longitude: longitude - 0.01,
        city: 'Near You',
        state: 'Local',
        pincode: '000000',
        is_remote: true,
        is_featured: true,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      }
    ];

    // Filter jobs within radius and calculate distance
    const jobsWithDistance = sampleJobs.map(job => {
      const distance = calculateDistance(latitude, longitude, job.latitude, job.longitude);
      return { ...job, distance: parseFloat(distance.toFixed(1)) };
    }).filter(job => job.distance <= radius);

    // Insert jobs into master table for now (sample data)
    // In production, these would be synced from the source tables
    const masterJobs = jobsWithDistance.map(job => ({
      source_table: 'sample',
      source_id: crypto.randomUUID(),
      job_title: job.job_title,
      company_name: job.company_name,
      job_type: job.job_type,
      category: job.category,
      description: job.description,
      salary_range: job.salary_range,
      location: `${job.city}, ${job.state}`,
      city: job.city,
      state: job.state,
      pincode: job.pincode,
      latitude: job.latitude,
      longitude: job.longitude,
      distance: job.distance,
      is_remote: job.is_remote,
      is_featured: job.is_featured,
      view_count: 0,
      application_count: 0
    }));

    const { data, error } = await supabaseClient
      .from('jobs_clean_master')
      .upsert(masterJobs, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Synced', jobsWithDistance.length, 'jobs to master table within', radius, 'km');

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: jobsWithDistance.length,
        jobs: jobsWithDistance 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
