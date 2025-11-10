import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, recentSearches = [] } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate AI-powered search suggestions
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a search suggestion assistant for Chatr.chat.
Given a partial search query, suggest 5 relevant completions that users might be searching for.
Focus on local services in India: plumbers, electricians, food delivery, healthcare, jobs, beauty services, etc.

Respond ONLY with a JSON array of strings (no markdown, no explanations):
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]

Examples:
Query: "plumb" → ["plumber near me", "plumbing services", "emergency plumber", "plumber in Noida", "24/7 plumber"]
Query: "doc" → ["doctor consultation", "doctor near me", "dentist appointment", "doctor on call", "eye doctor"]
Query: "bir" → ["biryani delivery", "biryani near me", "chicken biryani", "veg biryani", "biryani restaurant"]`
          },
          {
            role: 'user',
            content: `Partial query: "${query}"\nRecent searches: ${recentSearches.slice(0, 3).join(', ')}`
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ suggestions: getDefaultSuggestions(query) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let suggestions: string[] = [];

    try {
      const content = aiData.choices?.[0]?.message?.content || '[]';
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      suggestions = JSON.parse(cleanContent);
    } catch {
      suggestions = getDefaultSuggestions(query);
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search suggestions error:', error);
    return new Response(
      JSON.stringify({ suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultSuggestions(query: string): string[] {
  const q = query.toLowerCase();
  const suggestions: string[] = [];
  
  if (q.includes('plumb')) return ['plumber near me', 'plumbing services', 'emergency plumber', '24/7 plumber', 'plumber in Noida'];
  if (q.includes('doc') || q.includes('dr')) return ['doctor consultation', 'doctor near me', 'dentist appointment', 'doctor on call', 'eye doctor'];
  if (q.includes('bir')) return ['biryani delivery', 'biryani near me', 'chicken biryani', 'veg biryani', 'biryani restaurant'];
  if (q.includes('food') || q.includes('rest')) return ['food delivery', 'restaurants near me', 'fast food', 'home food', 'food order online'];
  if (q.includes('elec')) return ['electrician near me', 'electrical services', 'emergency electrician', '24/7 electrician'];
  if (q.includes('clean')) return ['cleaning services', 'house cleaning', 'deep cleaning', 'office cleaning'];
  
  return [
    `${query} near me`,
    `${query} services`,
    `best ${query}`,
    `${query} delivery`,
    `${query} online`
  ];
}