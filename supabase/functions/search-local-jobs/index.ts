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

    // Fetch job listings from web search
    const searchQuery = `jobs in ${city} India`;
    const jobs = await searchJobs(searchQuery, city, latitude, longitude);
    
    // Store in database with deduplication
    for (const job of jobs) {
      // Check if job already exists
      const { data: existing } = await supabaseClient
        .from('local_jobs_db')
        .select('id')
        .eq('job_title', job.job_title)
        .eq('company_name', job.company_name)
        .eq('city', job.city)
        .single();
      
      if (!existing) {
        await supabaseClient
          .from('local_jobs_db')
          .insert({
            job_title: job.job_title,
            company_name: job.company_name,
            job_type: job.job_type,
            category: job.category,
            description: job.description,
            salary_range: job.salary_range,
            city: job.city,
            pincode: job.pincode,
            is_remote: job.is_remote,
            is_featured: false,
            view_count: 0,
            source_url: job.source_url,
            latitude: job.latitude,
            longitude: job.longitude
          });
      }
    }

    return new Response(
      JSON.stringify({ success: true, jobs, count: jobs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchJobs(query: string, city: string, lat?: number, lon?: number) {
  // Use DuckDuckGo search (they allow scraping)
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' naukri indeed timejobs')}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Parse results - basic implementation
    const jobs = parseJobResults(html, city, lat, lon);
    
    return jobs;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

function parseJobResults(html: string, city: string, lat?: number, lon?: number) {
  const jobs = [];
  
  // Basic parsing - extract job titles and companies from search results
  const titleRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/g;
  
  let match;
  const titles = [];
  while ((match = titleRegex.exec(html)) !== null) {
    titles.push(match[1]);
  }
  
  // Create sample jobs from parsed data
  // In production, this would parse actual job listings
  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const categories = ['Technology', 'Sales', 'Marketing', 'Customer Service', 'Operations'];
  
  for (let i = 0; i < Math.min(titles.length, 10); i++) {
    jobs.push({
      job_title: titles[i] || `Position in ${city}`,
      company_name: 'Various Companies',
      job_type: jobTypes[i % jobTypes.length],
      category: categories[i % categories.length],
      description: `Job opportunity in ${city}`,
      salary_range: null,
      city: city,
      pincode: null,
      is_remote: false,
      source_url: 'https://naukri.com',
      latitude: lat,
      longitude: lon
    });
  }
  
  return jobs;
}
