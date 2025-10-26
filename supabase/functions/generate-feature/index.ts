import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, featureName, type } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating feature:', { featureName, type });

    // Generate React Component
    const componentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert React/TypeScript developer. Generate production-ready code for a React component using:
- TypeScript
- shadcn/ui components
- Tailwind CSS
- React hooks
- Supabase client for data fetching
Only return the component code, no explanations.`
          },
          {
            role: 'user',
            content: `Create a React component for: ${featureName}\n\nRequirements:\n${prompt}\n\nInclude all necessary imports and make it production-ready.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const componentData = await componentResponse.json();
    const component = componentData.choices[0].message.content;

    // Generate Database Schema
    const schemaResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a database expert. Generate SQL schema for Supabase (PostgreSQL) including:
- Table creation
- Row Level Security (RLS) policies
- Indexes
- Triggers if needed
Only return SQL code, no explanations.`
          },
          {
            role: 'user',
            content: `Create database schema for: ${featureName}\n\nRequirements:\n${prompt}\n\nInclude RLS policies for security.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const schemaData = await schemaResponse.json();
    const schema = schemaData.choices[0].message.content;

    // Generate API/Helper Functions
    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in building APIs and helper functions. Generate TypeScript functions for:
- API calls using Supabase client
- Data transformation utilities
- Custom hooks if needed
Only return code, no explanations.`
          },
          {
            role: 'user',
            content: `Create API functions for: ${featureName}\n\nRequirements:\n${prompt}\n\nUse Supabase client for all data operations.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const apiData = await apiResponse.json();
    const api = apiData.choices[0].message.content;

    return new Response(
      JSON.stringify({
        component,
        schema,
        api,
        featureName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-feature function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
