import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RawJob {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  url?: string;
  job_type?: string;
  experience?: string;
  skills?: string[];
  posted_date?: string;
}

interface NormalizedJob {
  title: string;
  company_name: string;
  description: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: string;
  job_type: string;
  skills: string[];
  experience_years: number | null;
  category: string;
  is_active: boolean;
  source_url: string | null;
  expires_at: string;
}

// Parse salary string into min/max values
function parseSalary(salaryStr: string | undefined): { min: number | null; max: number | null; type: string } {
  if (!salaryStr) return { min: null, max: null, type: 'monthly' };
  
  const cleaned = salaryStr.toLowerCase().replace(/[₹,]/g, '');
  
  // Detect salary type
  let type = 'monthly';
  if (cleaned.includes('per year') || cleaned.includes('/year') || cleaned.includes('lpa') || cleaned.includes('annual')) {
    type = 'yearly';
  } else if (cleaned.includes('per hour') || cleaned.includes('/hour')) {
    type = 'hourly';
  } else if (cleaned.includes('per day') || cleaned.includes('/day')) {
    type = 'daily';
  }
  
  // Extract numbers
  const numbers = cleaned.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return { min: null, max: null, type };
  
  let min = parseFloat(numbers[0]);
  let max = numbers.length > 1 ? parseFloat(numbers[1]) : min;
  
  // Handle LPA (Lakhs Per Annum)
  if (cleaned.includes('lpa') || cleaned.includes('lakh')) {
    min = min * 100000;
    max = max * 100000;
    type = 'yearly';
  }
  
  // Handle 'k' suffix
  if (cleaned.includes('k')) {
    min = min * 1000;
    max = max * 1000;
  }
  
  return { min: Math.round(min), max: Math.round(max), type };
}

// Parse experience string to years
function parseExperience(expStr: string | undefined): number | null {
  if (!expStr) return null;
  
  const cleaned = expStr.toLowerCase();
  if (cleaned.includes('fresher') || cleaned.includes('entry')) return 0;
  
  const numbers = cleaned.match(/\d+/g);
  if (!numbers) return null;
  
  return parseInt(numbers[0]);
}

// Detect job category from title and description
function detectCategory(title: string, description: string | undefined): string {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  if (text.match(/software|developer|engineer|coding|programming|react|node|python|java|frontend|backend|fullstack/)) {
    return 'technology';
  }
  if (text.match(/delivery|driver|courier|logistics|transport/)) {
    return 'delivery';
  }
  if (text.match(/sales|marketing|business development|bdm|lead generation/)) {
    return 'sales';
  }
  if (text.match(/customer|support|service|helpdesk|telecaller|bpo|call center/)) {
    return 'customer_support';
  }
  if (text.match(/admin|office|executive|receptionist|data entry|clerk/)) {
    return 'admin';
  }
  if (text.match(/nurse|doctor|medical|healthcare|hospital|pharma/)) {
    return 'healthcare';
  }
  if (text.match(/teacher|tutor|education|trainer|faculty/)) {
    return 'education';
  }
  if (text.match(/accountant|finance|banking|ca|audit|accounts/)) {
    return 'finance';
  }
  if (text.match(/chef|cook|hotel|restaurant|hospitality|waiter/)) {
    return 'hospitality';
  }
  if (text.match(/mechanic|electrician|plumber|technician|maintenance/)) {
    return 'skilled_trades';
  }
  
  return 'general';
}

// Detect job type
function detectJobType(text: string | undefined): string {
  if (!text) return 'full-time';
  
  const lower = text.toLowerCase();
  if (lower.includes('part-time') || lower.includes('part time')) return 'part-time';
  if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
  if (lower.includes('intern')) return 'internship';
  if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) return 'remote';
  
  return 'full-time';
}

// Extract skills from description
function extractSkills(description: string | undefined): string[] {
  if (!description) return [];
  
  const skillPatterns = [
    'javascript', 'python', 'java', 'react', 'node', 'sql', 'excel', 'word',
    'communication', 'english', 'hindi', 'sales', 'marketing', 'customer service',
    'data entry', 'typing', 'ms office', 'tally', 'accounts', 'driving license',
    'two wheeler', 'four wheeler', 'cooking', 'cleaning', 'management'
  ];
  
  const text = description.toLowerCase();
  return skillPatterns.filter(skill => text.includes(skill));
}

// Normalize raw job data to our schema
function normalizeJob(raw: RawJob): NormalizedJob | null {
  // Must have title and company at minimum
  if (!raw.title || !raw.company) {
    console.log('Skipping job - missing title or company:', raw);
    return null;
  }
  
  const salary = parseSalary(raw.salary);
  const fullText = `${raw.title} ${raw.description || ''} ${raw.job_type || ''}`;
  
  // Set expiry to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  return {
    title: raw.title.trim(),
    company_name: raw.company.trim(),
    description: raw.description?.trim() || null,
    location: raw.location?.trim() || null,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_type: salary.type,
    job_type: detectJobType(fullText),
    skills: raw.skills || extractSkills(raw.description),
    experience_years: parseExperience(raw.experience),
    category: detectCategory(raw.title, raw.description),
    is_active: true,
    source_url: raw.url || null,
    expires_at: expiresAt.toISOString(),
  };
}

// Job sources to crawl
const JOB_SOURCES = [
  {
    name: 'startup-jobs',
    searchUrl: (query: string, location: string) => 
      `startup jobs ${query} ${location} India hiring`,
  },
  {
    name: 'company-careers',
    searchUrl: (query: string, location: string) => 
      `${query} jobs ${location} careers hiring apply now`,
  },
  {
    name: 'local-jobs',
    searchUrl: (query: string, location: string) => 
      `${query} vacancy ${location} urgent hiring immediate joining`,
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, limit = 20 } = await req.json();
    
    if (!query && !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query or location is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Crawl service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔍 Crawling jobs for: ${query || 'any'} in ${location || 'India'}`);

    // Use Firecrawl search to find job listings
    const searchQuery = `${query || 'jobs'} ${location || ''} India hiring apply careers`.trim();
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: Math.min(limit * 2, 50), // Get more results to filter
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Firecrawl search error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to search for jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    console.log(`📄 Found ${searchData.data?.length || 0} search results`);

    // Extract jobs from search results using AI
    const rawJobs: RawJob[] = [];
    
    for (const result of searchData.data || []) {
      // Parse the markdown content to extract job information
      const content = result.markdown || result.description || '';
      const url = result.url || '';
      
      // Simple extraction - look for job-like patterns
      const jobs = extractJobsFromContent(content, url, result.title);
      rawJobs.push(...jobs);
    }

    console.log(`📋 Extracted ${rawJobs.length} raw jobs`);

    // Normalize all jobs
    const normalizedJobs = rawJobs
      .map(normalizeJob)
      .filter((job): job is NormalizedJob => job !== null)
      .slice(0, limit);

    console.log(`✅ Normalized ${normalizedJobs.length} jobs`);

    // Upsert normalized jobs to database
    if (normalizedJobs.length > 0) {
      const { error: insertError } = await supabase
        .from('chatr_jobs')
        .upsert(
          normalizedJobs.map(job => ({
            ...job,
            updated_at: new Date().toISOString(),
          })),
          { 
            onConflict: 'title,company_name,location',
            ignoreDuplicates: true 
          }
        );

      if (insertError) {
        console.error('Error inserting jobs:', insertError);
      } else {
        console.log(`💾 Saved ${normalizedJobs.length} jobs to database`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Crawled and normalized ${normalizedJobs.length} jobs`,
        jobs: normalizedJobs,
        raw_count: rawJobs.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error crawling jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract job listings from content
function extractJobsFromContent(content: string, sourceUrl: string, pageTitle: string): RawJob[] {
  const jobs: RawJob[] = [];
  
  // Look for job-like patterns in the content
  const lines = content.split('\n');
  let currentJob: Partial<RawJob> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detect job titles (usually in headers or bold)
    if (trimmed.match(/^#+\s+.*(developer|engineer|manager|executive|assistant|analyst|designer|intern|fresher|hiring)/i) ||
        trimmed.match(/\*\*.*(developer|engineer|manager|executive|assistant|analyst|designer|intern|fresher|hiring).*\*\*/i)) {
      
      // Save previous job if exists
      if (currentJob.title) {
        jobs.push({ ...currentJob, url: sourceUrl } as RawJob);
      }
      
      // Start new job
      currentJob = {
        title: trimmed.replace(/^#+\s+/, '').replace(/\*\*/g, '').trim(),
      };
    }
    
    // Extract company name
    if (trimmed.match(/company|employer|organization|at\s+/i) && !currentJob.company) {
      const match = trimmed.match(/(?:company|employer|at)\s*:?\s*([^,\n|]+)/i);
      if (match) {
        currentJob.company = match[1].trim();
      }
    }
    
    // Extract location
    if (trimmed.match(/location|city|place|area/i) && !currentJob.location) {
      const match = trimmed.match(/(?:location|city|place)\s*:?\s*([^,\n|]+)/i);
      if (match) {
        currentJob.location = match[1].trim();
      }
    }
    
    // Extract salary
    if (trimmed.match(/salary|₹|lpa|ctc|package|compensation/i) && !currentJob.salary) {
      currentJob.salary = trimmed.replace(/^.*?(?:salary|ctc|package)\s*:?\s*/i, '').trim();
    }
    
    // Extract experience
    if (trimmed.match(/experience|exp|years?/i) && !currentJob.experience) {
      const match = trimmed.match(/(\d+\s*[-–]\s*\d+|\d+)\s*(?:years?|yrs?)/i);
      if (match) {
        currentJob.experience = match[0];
      }
    }
    
    // Add to description
    if (currentJob.title && trimmed.length > 20) {
      currentJob.description = (currentJob.description || '') + ' ' + trimmed;
    }
  }
  
  // Save last job
  if (currentJob.title) {
    jobs.push({ ...currentJob, url: sourceUrl } as RawJob);
  }
  
  // If no structured jobs found, try to create from page title
  if (jobs.length === 0 && pageTitle) {
    const titleMatch = pageTitle.match(/(.*?)\s+(?:at|@|-)\s+(.*?)(?:\s*\||$)/i);
    if (titleMatch) {
      jobs.push({
        title: titleMatch[1].trim(),
        company: titleMatch[2].trim(),
        url: sourceUrl,
      });
    }
  }
  
  return jobs;
}
