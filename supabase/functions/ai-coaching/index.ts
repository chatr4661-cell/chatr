import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoachingRequest {
  transcript: string;
  sentiment?: string;
  urgency?: string;
  context?: 'sales' | 'support' | 'general';
  agentName?: string;
}

interface CoachingResponse {
  suggestions: string[];
  talkingPoints: string[];
  warningFlags: string[];
  recommendedActions: string[];
  toneAdvice: string;
  nextBestAction: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, sentiment, urgency, context = 'support', agentName }: CoachingRequest = await req.json();

    console.log('[ai-coaching] Request:', { transcriptLength: transcript?.length, sentiment, urgency, context });

    if (!transcript || transcript.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Transcript required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
    
    let result: CoachingResponse = {
      suggestions: [],
      talkingPoints: [],
      warningFlags: [],
      recommendedActions: [],
      toneAdvice: 'Maintain a professional and helpful tone',
      nextBestAction: 'Continue listening actively',
    };

    if (geminiApiKey) {
      const systemPrompt = context === 'sales' 
        ? 'You are a real-time sales coaching AI helping agents close deals effectively.'
        : context === 'support'
        ? 'You are a real-time customer support coaching AI helping agents resolve issues efficiently.'
        : 'You are a real-time call coaching AI helping agents communicate effectively.';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}

Analyze this live call transcript and provide real-time coaching for the agent${agentName ? ` (${agentName})` : ''}.

Current sentiment: ${sentiment || 'unknown'}
Urgency level: ${urgency || 'unknown'}

Transcript:
"${transcript}"

Return a JSON object with:
- suggestions: array of 2-3 short, actionable suggestions for the agent right now
- talkingPoints: array of 2-3 key points the agent should mention
- warningFlags: array of any concerning phrases or issues to address
- recommendedActions: array of specific actions to take
- toneAdvice: one sentence about tone/approach to use
- nextBestAction: the single most important thing to do next

Keep all text very brief and actionable (under 20 words each). Return ONLY valid JSON.`
              }]
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        try {
          const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
          result = JSON.parse(jsonStr);
          console.log('[ai-coaching] Generated coaching:', result.nextBestAction);
        } catch (parseError) {
          console.error('[ai-coaching] Parse error:', parseError);
        }
      }
    } else {
      // Basic fallback coaching
      const lowerTranscript = transcript.toLowerCase();
      
      if (lowerTranscript.includes('angry') || lowerTranscript.includes('frustrated')) {
        result.suggestions = ['Acknowledge their frustration', 'Offer a solution or escalation'];
        result.warningFlags = ['Customer appears frustrated'];
        result.toneAdvice = 'Use a calm, empathetic tone';
      }
      
      if (lowerTranscript.includes('cancel') || lowerTranscript.includes('refund')) {
        result.talkingPoints = ['Ask about their specific concerns', 'Offer alternatives before proceeding'];
        result.nextBestAction = 'Understand the root cause before processing';
      }
      
      if (urgency === 'high') {
        result.recommendedActions = ['Prioritize resolution', 'Offer immediate callback if needed'];
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        coaching: result,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[ai-coaching] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
