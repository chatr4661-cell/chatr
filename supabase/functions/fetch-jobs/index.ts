import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { city, latitude, longitude } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? ''
    );

    // Sample job data based on location
    const sampleJobs = [
      {
        job_title: 'Software Developer',
        company_name: 'Tech Solutions Inc',
        job_type: 'Full-time',
        category: 'Technology',
        description: 'Develop web applications using React and Node.js',
        salary_range: '₹5-8 LPA',
        city: city || 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
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
        city: city || 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
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
        city: city || 'Delhi',
        state: 'Delhi',
        pincode: '110001',
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
        city: city || 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
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
        city: city || 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
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
        city: city || 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        is_remote: true,
        is_featured: true,
        view_count: 0,
        posted_by: '00000000-0000-0000-0000-000000000000'
      }
    ];

    // Insert jobs into database
    const { data, error } = await supabaseClient
      .from('local_jobs_db')
      .upsert(sampleJobs, { onConflict: 'job_title,company_name', ignoreDuplicates: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: sampleJobs.length }),
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
