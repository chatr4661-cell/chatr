import { supabase } from '@/integrations/supabase/client';

export interface CrawlJobsParams {
  query?: string;
  location?: string;
  limit?: number;
}

export interface CrawlJobsResult {
  success: boolean;
  message?: string;
  jobs?: any[];
  raw_count?: number;
  error?: string;
}

/**
 * Crawl and normalize jobs from public sources
 * Jobs are automatically saved to the database
 */
export async function crawlJobs(params: CrawlJobsParams): Promise<CrawlJobsResult> {
  try {
    const { data, error } = await supabase.functions.invoke('crawl-jobs', {
      body: params,
    });

    if (error) {
      console.error('Error crawling jobs:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Error calling crawl-jobs function:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to crawl jobs' 
    };
  }
}

/**
 * Trigger background job crawl for a location
 * This runs async and populates the database
 */
export async function triggerJobCrawl(location: string, categories: string[] = []): Promise<void> {
  // Crawl for different job types in the location
  const queries = categories.length > 0 ? categories : [
    'software developer',
    'sales marketing',
    'delivery driver',
    'customer support',
    'data entry clerk',
    'accountant',
    'teacher tutor',
  ];

  // Fire off crawls in parallel (don't await - let them run in background)
  for (const query of queries.slice(0, 3)) { // Limit to 3 concurrent crawls
    crawlJobs({ query, location, limit: 10 }).catch(console.error);
  }
}
