import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  category?: string;
  thumbnail?: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: string;
  views?: string;
}

// Brave Search API (has generous free tier)
async function searchBrave(query: string): Promise<SearchResult[]> {
  try {
    // Using Brave's public search (no API key needed for basic search)
    const response = await fetch(
      `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChatrBot/1.0)',
          'Accept': 'text/html'
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      }
    );
    
    if (!response.ok) throw new Error('Brave search failed');
    
    // For now, return empty as we'd need to parse HTML
    // In production, you'd add BRAVE_API_KEY to secrets for proper API access
    return [];
  } catch (e) {
    console.error('Brave search error:', e);
    return [];
  }
}

// DuckDuckGo Instant Answer API
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    // Abstract
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.Abstract,
        source: 'DuckDuckGo',
        category: 'web'
      });
    }
    
    // Related Topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 8)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
            category: 'web',
            thumbnail: topic.Icon?.URL
          });
        }
      }
    }
  } catch (e) {
    console.error('DuckDuckGo error:', e);
  }

  return results;
}

// Bing Search (free tier available)
async function searchBing(query: string): Promise<SearchResult[]> {
  try {
    // Using Bing's public search (requires API key for production)
    // For now, return empty - users can add BING_SEARCH_KEY to secrets
    const BING_KEY = Deno.env.get('BING_SEARCH_KEY');
    if (!BING_KEY) return [];

    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: { 'Ocp-Apim-Subscription-Key': BING_KEY },
        signal: AbortSignal.timeout(5000)
      }
    );
    const data = await response.json();
    
    return (data.webPages?.value || []).map((item: any) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      source: 'Bing',
      category: 'web'
    }));
  } catch (e) {
    console.error('Bing search error:', e);
    return [];
  }
}

// News API for trending news
async function searchNews(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=8&language=en&apiKey=demo`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    return (data.articles || []).slice(0, 8).map((article: any) => ({
      title: article.title,
      url: article.url,
      snippet: article.description || article.content?.substring(0, 200),
      source: article.source.name,
      category: 'news',
      thumbnail: article.urlToImage
    }));
  } catch (e) {
    console.error('News search error:', e);
    return [];
  }
}

// Wikipedia API
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=8`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    if (data.query?.search) {
      return data.query.search.map((item: any) => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
        snippet: item.snippet.replace(/<[^>]*>/g, ''),
        source: 'Wikipedia',
        category: 'web'
      }));
    }
  } catch (e) {
    console.error('Wikipedia error:', e);
  }
  
  return [];
}

// GitHub Search API
async function searchGitHub(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=8`,
      { 
        headers: { 'User-Agent': 'Chatr-Browser' },
        signal: AbortSignal.timeout(5000)
      }
    );
    const data = await response.json();
    
    return (data.items || []).map((repo: any) => ({
      title: repo.full_name,
      url: repo.html_url,
      snippet: repo.description || 'No description available',
      source: 'GitHub',
      category: 'tech',
      thumbnail: repo.owner.avatar_url
    }));
  } catch (error) {
    console.error('GitHub search error:', error);
    return [];
  }
}

// Stack Overflow Search
async function searchStackOverflow(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(query)}&order=desc&sort=relevance&site=stackoverflow&pagesize=8`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: (item.body_markdown?.substring(0, 200) || 'Stack Overflow discussion') + '...',
      source: 'Stack Overflow',
      category: 'tech'
    }));
  } catch (error) {
    console.error('Stack Overflow search error:', error);
    return [];
  }
}

// Reddit Search
async function searchReddit(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=8&sort=relevance`,
      { 
        headers: { 'User-Agent': 'Chatr-Browser' },
        signal: AbortSignal.timeout(5000)
      }
    );
    const data = await response.json();
    
    return (data.data?.children || []).map((post: any) => ({
      title: post.data.title,
      url: `https://reddit.com${post.data.permalink}`,
      snippet: (post.data.selftext?.substring(0, 200) || post.data.title) + '...',
      source: 'Reddit',
      category: 'social',
      thumbnail: post.data.thumbnail !== 'self' && post.data.thumbnail?.startsWith('http') ? post.data.thumbnail : undefined
    }));
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

// arXiv Research Papers
async function searchArxiv(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=8`,
      { signal: AbortSignal.timeout(6000) }
    );
    const text = await response.text();
    
    const results: SearchResult[] = [];
    const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    for (const entry of entries) {
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/);
      const linkMatch = entry.match(/<id>(.*?)<\/id>/);
      
      if (titleMatch && linkMatch) {
        results.push({
          title: titleMatch[1].trim().replace(/\n/g, ' '),
          url: linkMatch[1].trim(),
          snippet: summaryMatch ? summaryMatch[1].trim().substring(0, 200) + '...' : '',
          source: 'arXiv',
          category: 'research'
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('arXiv search error:', error);
    return [];
  }
}

async function searchUnsplash(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=demo`,
      { headers: { 'Accept-Version': 'v1' } }
    );
    const data = await response.json();
    
    return (data.results || []).map((photo: any) => ({
      title: photo.alt_description || photo.description || query,
      url: photo.links.html,
      snippet: `By ${photo.user.name} on Unsplash`,
      source: 'Unsplash',
      category: 'image',
      thumbnail: photo.urls.small,
      imageUrl: photo.urls.regular
    }));
  } catch (error) {
    console.error('Unsplash search error:', error);
    return [];
  }
}

async function searchPixabay(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=demo&q=${encodeURIComponent(query)}&image_type=photo&per_page=20`
    );
    const data = await response.json();
    
    return (data.hits || []).slice(0, 20).map((hit: any) => ({
      title: hit.tags,
      url: hit.pageURL,
      snippet: `${hit.likes} likes · ${hit.views} views`,
      source: 'Pixabay',
      category: 'image',
      thumbnail: hit.previewURL,
      imageUrl: hit.webformatURL
    }));
  } catch (error) {
    console.error('Pixabay search error:', error);
    return [];
  }
}

async function searchYouTube(query: string): Promise<SearchResult[]> {
  try {
    // Using YouTube's oEmbed and search suggestion as fallback
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    // Return structured results pointing to YouTube search
    return [{
      title: `"${query}" on YouTube`,
      url: searchUrl,
      snippet: 'Search YouTube for videos, tutorials, and live streams',
      source: 'YouTube',
      category: 'video',
      thumbnail: 'https://www.youtube.com/img/desktop/yt_1200.png'
    }];
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

async function searchVimeo(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://vimeo.com/api/v2/videos/search.json?query=${encodeURIComponent(query)}&per_page=10`
    );
    const data = await response.json();
    
    return (data || []).map((video: any) => ({
      title: video.title,
      url: video.url,
      snippet: video.description?.substring(0, 200) || 'Vimeo video',
      source: 'Vimeo',
      category: 'video',
      thumbnail: video.thumbnail_medium,
      videoUrl: video.url,
      duration: `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`,
      views: video.stats_number_of_plays?.toString()
    }));
  } catch (error) {
    console.error('Vimeo search error:', error);
    return [];
  }
}

async function generateAIFusionSummary(query: string, results: SearchResult[], category: string): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return 'AI summary unavailable. See search results below.';
    }

    // Take top 10 most relevant results
    const topResults = results.slice(0, 10);
    const context = topResults
      .filter(r => r.snippet && r.snippet.length > 20)
      .map((r, i) => `[${i + 1}] ${r.source}: ${r.title}\n${r.snippet}`)
      .join('\n\n');

    if (!context) {
      return 'No sufficient data found. Try refining your search.';
    }

    const categoryPrompts: Record<string, string> = {
      web: 'You are an expert search assistant. Provide a comprehensive, factual answer synthesizing information from multiple sources. Include specific facts, statistics, and cite sources using [1], [2], etc.',
      news: 'Summarize the latest news and developments. Focus on recent events, key facts, and expert insights. Cite sources.',
      research: 'Provide an academic-style answer highlighting key research findings, methodologies, and scholarly insights. Use formal language and cite sources.',
      social: 'Summarize community discussions and public sentiment from social platforms. Mention diverse perspectives and cite sources.',
      tech: 'Focus on technical details, best practices, and developer insights. Include code concepts if relevant and cite sources.',
      image: 'Describe what these images show and their context. Mention key visual elements and sources.',
      video: 'Summarize the video content available. Mention key topics and creators.',
    };

    const systemPrompt = categoryPrompts[category] || categoryPrompts.web;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}

CRITICAL INSTRUCTIONS:
- Write in clear paragraphs (2-4 sentences each)
- Start with a direct answer to the query
- Include specific facts, data, and examples
- Cite sources naturally using [1], [2], etc.
- Be comprehensive but concise (200-300 words)
- Use proper formatting with line breaks between paragraphs`
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nSearch Results:\n${context}\n\nProvide a comprehensive answer with source citations.`
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      if (response.status === 429) return 'Rate limit reached. Showing search results below.';
      if (response.status === 402) return 'AI credits depleted. Showing search results below.';
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'Unable to generate summary. See results below.';
  } catch (error) {
    console.error('AI fusion error:', error);
    return 'AI summary unavailable. See search results below.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category = 'web' } = await req.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanQuery = query.trim();
    console.log(`🔍 Search: "${cleanQuery}" [${category}]`);

    // Ultra-fast parallel search across ALL sources
    const searchPromises: Promise<SearchResult[]>[] = [
      searchDuckDuckGo(cleanQuery),
      searchWikipedia(cleanQuery),
      searchBing(cleanQuery),
    ];
    
    // Add category-specific searches in parallel
    if (category === 'web' || category === 'all') {
      searchPromises.push(
        searchGitHub(cleanQuery),
        searchStackOverflow(cleanQuery),
        searchReddit(cleanQuery),
        searchBrave(cleanQuery),
        searchNews(cleanQuery)
      );
    } else if (category === 'news') {
      searchPromises.push(searchNews(cleanQuery), searchReddit(cleanQuery));
    } else if (category === 'research') {
      searchPromises.push(searchArxiv(cleanQuery));
    } else if (category === 'social') {
      searchPromises.push(searchReddit(cleanQuery));
    } else if (category === 'tech') {
      searchPromises.push(
        searchGitHub(cleanQuery),
        searchStackOverflow(cleanQuery)
      );
    } else if (category === 'image') {
      searchPromises.push(
        searchUnsplash(cleanQuery),
        searchPixabay(cleanQuery)
      );
    } else if (category === 'video') {
      searchPromises.push(
        searchYouTube(cleanQuery),
        searchVimeo(cleanQuery)
      );
    }

    const startTime = Date.now();
    
    // Use Promise.allSettled for resilience - don't fail if one source fails
    const resultsArrays = await Promise.allSettled(searchPromises);
    
    // Collect successful results
    const allResults = resultsArrays
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<SearchResult[]>).value)
      .filter(r => r && r.title && r.url); // Filter out invalid results
    
    const searchTime = Date.now() - startTime;

    console.log(`✅ Found ${allResults.length} results in ${searchTime}ms`);

    if (allResults.length === 0) {
      return new Response(
        JSON.stringify({
          summary: 'No results found. Try different keywords or check your spelling.',
          results: [],
          allResults: { web: [], tech: [], social: [], research: [], image: [], video: [], all: [] },
          query: cleanQuery,
          category,
          searchTime,
          resultCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Categorize results
    const categorized = {
      web: allResults.filter(r => r.category === 'web'),
      tech: allResults.filter(r => r.category === 'tech'),
      social: allResults.filter(r => r.category === 'social'),
      research: allResults.filter(r => r.category === 'research'),
      image: allResults.filter(r => r.category === 'image'),
      video: allResults.filter(r => r.category === 'video'),
      news: allResults.filter(r => r.category === 'news'),
      all: allResults
    };

    // Generate AI summary
    console.log('🤖 Generating AI summary...');
    const summary = await generateAIFusionSummary(cleanQuery, allResults, category);

    const response = {
      summary,
      results: categorized[category as keyof typeof categorized] || allResults,
      allResults: categorized,
      query: cleanQuery,
      category,
      searchTime,
      resultCount: allResults.length
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
