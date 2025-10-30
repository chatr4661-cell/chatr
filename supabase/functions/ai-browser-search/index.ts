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

// Multi-source parallel search
async function searchWeb(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    // DuckDuckGo
    const ddgResponse = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
    const ddgData = await ddgResponse.json();
    if (ddgData.RelatedTopics) {
      for (const topic of ddgData.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
            category: 'web'
          });
        }
      }
    }
  } catch (e) {
    console.error('DuckDuckGo error:', e);
  }

  try {
    // Wikipedia
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    );
    const wikiData = await wikiResponse.json();
    if (wikiData.query?.search) {
      for (const item of wikiData.query.search.slice(0, 3)) {
        results.push({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          snippet: item.snippet.replace(/<[^>]*>/g, ''),
          source: 'Wikipedia',
          category: 'web'
        });
      }
    }
  } catch (e) {
    console.error('Wikipedia error:', e);
  }

  return results;
}

async function searchGitHub(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`,
      { headers: { 'User-Agent': 'Chatr-Browser' } }
    );
    const data = await response.json();
    
    return (data.items || []).map((repo: any) => ({
      title: repo.full_name,
      url: repo.html_url,
      snippet: repo.description || 'No description',
      source: 'GitHub',
      category: 'tech',
      thumbnail: repo.owner.avatar_url
    }));
  } catch (error) {
    console.error('GitHub search error:', error);
    return [];
  }
}

async function searchStackOverflow(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(query)}&order=desc&sort=relevance&site=stackoverflow`
    );
    const data = await response.json();
    
    return (data.items || []).slice(0, 5).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.body_markdown?.substring(0, 200) || 'Stack Overflow discussion',
      source: 'Stack Overflow',
      category: 'tech'
    }));
  } catch (error) {
    console.error('Stack Overflow search error:', error);
    return [];
  }
}

async function searchReddit(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'User-Agent': 'Chatr-Browser' } }
    );
    const data = await response.json();
    
    return (data.data?.children || []).map((post: any) => ({
      title: post.data.title,
      url: `https://reddit.com${post.data.permalink}`,
      snippet: post.data.selftext?.substring(0, 200) || post.data.title,
      source: 'Reddit',
      category: 'social',
      thumbnail: post.data.thumbnail !== 'self' ? post.data.thumbnail : undefined
    }));
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

async function searchArxiv(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5`
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
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          snippet: summaryMatch ? summaryMatch[1].trim().substring(0, 200) : '',
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
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const context = results
      .filter(r => r.snippet && r.snippet.length > 10)
      .map(r => `[${r.source}] ${r.title}: ${r.snippet}`)
      .join('\n\n');

    const categoryPrompts: Record<string, string> = {
      web: 'Provide a comprehensive, factual summary synthesizing information from multiple web sources. Include key facts, statistics, and insights.',
      news: 'Summarize the latest news and developments. Focus on recent events, trends, and expert opinions.',
      research: 'Provide an academic-style summary highlighting key research findings, methodologies, and scholarly insights.',
      social: 'Summarize community discussions, public sentiment, and diverse perspectives from social platforms.',
      tech: 'Focus on technical details, code examples, best practices, and developer insights.',
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
            content: `You are an advanced search intelligence system. ${systemPrompt} Be precise, cite sources naturally, and provide actionable insights. Format your response with clear paragraphs.`
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nSources:\n${context}\n\nProvide a detailed, intelligent summary that goes deeper than traditional search engines. Synthesize information across sources and provide unique insights.`
          }
        ],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) return 'Rate limit reached. Please try again in a moment.';
      if (response.status === 402) return 'AI service requires payment. Please contact support.';
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI fusion error:', error);
    return 'Unable to generate AI summary at this time. See results below.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category = 'web' } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deep search: "${query}" [${category}]`);

    // Parallel multi-source search based on category
    const searchPromises: Promise<SearchResult[]>[] = [searchWeb(query)];
    
    if (category === 'web' || category === 'all') {
      searchPromises.push(
        searchGitHub(query),
        searchStackOverflow(query),
        searchReddit(query)
      );
    }
    
    if (category === 'research') {
      searchPromises.push(searchArxiv(query));
    }
    
    if (category === 'social') {
      searchPromises.push(searchReddit(query));
    }
    
    if (category === 'tech') {
      searchPromises.push(
        searchGitHub(query),
        searchStackOverflow(query)
      );
    }
    
    if (category === 'image') {
      searchPromises.push(
        searchUnsplash(query),
        searchPixabay(query)
      );
    }
    
    if (category === 'video') {
      searchPromises.push(
        searchYouTube(query),
        searchVimeo(query)
      );
    }

    const startTime = Date.now();
    const resultsArrays = await Promise.all(searchPromises);
    const allResults = resultsArrays.flat();
    const searchTime = Date.now() - startTime;

    console.log(`Found ${allResults.length} results in ${searchTime}ms`);

    // Categorize results
    const categorized = {
      web: allResults.filter(r => r.category === 'web'),
      tech: allResults.filter(r => r.category === 'tech'),
      social: allResults.filter(r => r.category === 'social'),
      research: allResults.filter(r => r.category === 'research'),
      image: allResults.filter(r => r.category === 'image'),
      video: allResults.filter(r => r.category === 'video'),
      all: allResults
    };

    // Generate AI fusion summary
    let summary = '';
    if (allResults.length > 0) {
      try {
        summary = await generateAIFusionSummary(query, allResults, category);
      } catch (error) {
        console.error('AI fusion failed:', error);
        summary = 'Search completed. See results below.';
      }
    } else {
      summary = 'No results found. Try rephrasing your query or selecting a different category.';
    }

    return new Response(
      JSON.stringify({
        summary,
        results: categorized[category as keyof typeof categorized] || allResults,
        allResults: categorized,
        query,
        category,
        searchTime,
        resultCount: allResults.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
