import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  message: z.string().min(1, 'Message required').max(5000, 'Message too long'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(5000)
  })).max(50).optional()
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
    
    const { message, history } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const messages = [
      {
        role: 'system',
        content: `You are a helpful health assistant. Provide general health information and guidance in a clear, human tone.
        
        Communication style:
        - Write like a knowledgeable person, not a robot
        - NO markdown formatting (no asterisks, bold, or code-like text)
        - NO phrases like "As an AI" or robotic disclaimers
        - Use natural transitions like "Overall," "In summary," "Here's what I'd suggest"
        - Keep it professional yet conversational
        
        Important rules:
        - Always remind users to consult healthcare professionals for medical advice
        - Be empathetic, clear, and concise
        - If symptoms are serious, urgently recommend seeing a doctor
        - Suggest specific specialists when relevant (general practitioner, cardiologist, etc.)
        - Prioritize clarity over formality`
      },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-health-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
