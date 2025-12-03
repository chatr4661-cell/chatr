import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'parallel_you_challenge':
        systemPrompt = `You are an AI playing a game where you mimic a user's personality. 
        User personality traits: ${JSON.stringify(data.personality || {})}
        Challenge type: ${data.challengeType}
        Generate a challenge response that matches this personality.
        Be competitive but fair. Response should be creative and engaging.`;
        userPrompt = data.challenge;
        break;

      case 'parallel_you_generate':
        systemPrompt = `Generate a fun, engaging challenge for the "Parallel You" game.
        Challenge type: ${data.challengeType}
        Difficulty: ${data.difficulty}
        The challenge should be something that tests ${data.challengeType} skills.
        Return JSON: { "challenge": "...", "timeLimit": number, "options": [...] if multiple choice }`;
        userPrompt = `Generate a level ${data.level} ${data.challengeType} challenge.`;
        break;

      case 'map_hunt_clue':
        systemPrompt = `You are generating treasure hunt clues for the CHATR Map Hunt game.
        Create mysterious, engaging clues that can be solved by finding real-world objects.
        Level: ${data.level}, Difficulty: ${data.difficulty}
        Location context: ${data.locationContext || 'general urban area'}
        Return JSON: { 
          "clue": "poetic/mysterious clue text", 
          "target": "what they need to find",
          "hints": ["hint1", "hint2", "hint3"]
        }`;
        userPrompt = `Generate a level ${data.level} treasure hunt clue.`;
        break;

      case 'map_hunt_verify':
        systemPrompt = `You are verifying if a photo matches a treasure hunt clue.
        Original clue: ${data.clue}
        Target object: ${data.target}
        Analyze if the described image matches. Be fair but accurate.
        Return JSON: { "verified": boolean, "confidence": 0-100, "feedback": "..." }`;
        userPrompt = `User describes their photo as: ${data.photoDescription}`;
        break;

      case 'emotionsync_analyze':
        systemPrompt = `You are an emotion analysis AI for the EmotionSync game.
        Target emotion: ${data.targetEmotion}
        Analyze the user's input and detect the emotion expressed.
        Return JSON: { 
          "detected": "emotion name", 
          "confidence": 0-100, 
          "feedback": "encouraging feedback",
          "tips": "how to better express this emotion"
        }`;
        userPrompt = `User input: "${data.userInput}"`;
        break;

      case 'emotionsync_prompt':
        systemPrompt = `Generate a creative prompt for the EmotionSync game.
        Target emotion: ${data.emotion}
        Difficulty: ${data.difficulty}
        Create an engaging scenario that would naturally evoke this emotion.
        Return JSON: { "prompt": "scenario text", "tips": "hints for expressing emotion" }`;
        userPrompt = `Generate an emotion prompt for ${data.emotion}.`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    // Try to parse as JSON, fallback to raw content
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { response: content };
    } catch {
      result = { response: content };
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chatr-games-ai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process game action' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
