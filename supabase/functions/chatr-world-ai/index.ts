import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  type: 'summary' | 'symptom_check' | 'job_match' | 'restaurant_recommend' | 'chat';
  data: any;
  context?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, context }: AIRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'summary':
        systemPrompt = `You are an AI assistant that summarizes search results clearly and concisely. 
        Provide a helpful summary in 2-3 paragraphs. Include key facts and actionable information.
        Focus on what's most relevant to users in India.`;
        userPrompt = `Summarize these search results for the query "${data.query}":\n\n${JSON.stringify(data.results?.slice(0, 5))}`;
        break;

      case 'symptom_check':
        systemPrompt = `You are a helpful health assistant. You do NOT diagnose conditions.
        Based on symptoms, suggest possible causes and ALWAYS recommend consulting a doctor.
        Provide general wellness tips. Be empathetic and clear.
        IMPORTANT: Always include a disclaimer that this is not medical advice.`;
        userPrompt = `The user reports these symptoms: ${data.symptoms}\n\nProvide helpful information and recommendations.`;
        break;

      case 'job_match':
        systemPrompt = `You are a career advisor AI. Analyze the user's profile and suggest suitable jobs.
        Consider skills, experience, location preferences, and salary expectations.
        Provide actionable career advice.`;
        userPrompt = `User profile:\nSkills: ${data.skills?.join(', ')}\nExperience: ${data.experience} years\nLocation: ${data.location}\n\nAvailable jobs:\n${JSON.stringify(data.jobs?.slice(0, 10))}\n\nSuggest the best matches and explain why.`;
        break;

      case 'restaurant_recommend':
        systemPrompt = `You are a food recommendation AI for India. Suggest restaurants based on:
        - User preferences (cuisine, budget, dietary restrictions)
        - Location and delivery availability
        - Ratings and reviews
        Be specific and helpful.`;
        userPrompt = `User preferences:\nCuisine: ${data.cuisine || 'any'}\nBudget: ${data.budget || 'moderate'}\nDietary: ${data.dietary || 'none'}\n\nAvailable restaurants:\n${JSON.stringify(data.restaurants?.slice(0, 10))}\n\nRecommend the best options.`;
        break;

      case 'chat':
        systemPrompt = `You are Chatr AI, a helpful assistant for Chatr World - a local life search platform in India.
        Help users find jobs, healthcare, food, deals, and local services.
        Be friendly, concise, and helpful. Provide actionable suggestions.`;
        userPrompt = data.message || '';
        break;

      default:
        throw new Error('Invalid AI request type');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const result = aiData.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ result, type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'AI request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});