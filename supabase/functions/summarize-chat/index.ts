import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  messages: z.array(z.object({
    sender: z.string().max(100),
    content: z.string().max(5000)
  })).min(1, 'At least one message required').max(500)
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = inputSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messages } = validationResult.data;

    if (!messages || messages.length === 0) {
      throw new Error('No messages to summarize');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Format conversation for AI
    const conversationText = messages
      .map((msg: any) => `${msg.sender}: ${msg.content}`)
      .join('\n');

    console.log(`Summarizing ${messages.length} messages...`);

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
            content: `You are a conversation summarizer for a healthcare messaging app. Create a clear, concise summary in natural, human language.

Writing style:
- Write as if a person created this summary, not a bot
- NO markdown formatting (no asterisks, bold, or code-like text)
- NO robotic phrases like "The conversation includes" or "As an AI"
- Use natural transitions like "Overall," "In summary," "Main highlights"
- Keep it professional yet conversational

Content rules:
- Highlight key topics and decisions
- Note any health-related information (symptoms, medications, appointments)
- Keep summary under 150 words
- Use simple bullet points (• not asterisks) only where needed
- Include action items if any
- Prioritize clarity over formality`
          },
          {
            role: 'user',
            content: `Summarize this conversation:\n\n${conversationText}`
          }
        ],
        temperature: 0.5,
        max_tokens: 400
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Summarization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
