import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentRequest {
  text: string;
  callId?: string;
  speakerId?: string;
}

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated' | 'happy' | 'confused';
  score: number; // -1 to 1
  emotions: { [key: string]: number };
  keywords: string[];
  urgency: 'low' | 'medium' | 'high';
  suggestions?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, callId, speakerId }: SentimentRequest = await req.json();

    console.log('[call-sentiment] Analyzing:', { textLength: text?.length, callId, speakerId });

    if (!text || text.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Text required for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
    
    let result: SentimentResult = {
      sentiment: 'neutral',
      score: 0,
      emotions: {},
      keywords: [],
      urgency: 'low',
    };

    if (geminiApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze the sentiment and emotions in this customer service conversation text. Return a JSON object with:
- sentiment: one of "positive", "negative", "neutral", "frustrated", "happy", "confused"
- score: number from -1 (very negative) to 1 (very positive)
- emotions: object with emotion names as keys and confidence 0-1 as values (e.g., {"anger": 0.2, "satisfaction": 0.7})
- keywords: array of important topic keywords mentioned
- urgency: "low", "medium", or "high" based on caller's need
- suggestions: array of 1-2 short coaching tips for the agent

Text to analyze:
"${text}"

Return ONLY valid JSON, no markdown.`
              }]
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        try {
          // Clean up response (remove markdown if present)
          const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
          result = JSON.parse(jsonStr);
          console.log('[call-sentiment] AI analysis complete:', result.sentiment);
        } catch (parseError) {
          console.error('[call-sentiment] Failed to parse AI response:', parseError);
        }
      }
    } else {
      // Basic keyword-based analysis fallback
      const lowerText = text.toLowerCase();
      
      const positiveWords = ['thank', 'great', 'excellent', 'happy', 'love', 'perfect', 'awesome'];
      const negativeWords = ['angry', 'frustrated', 'terrible', 'horrible', 'hate', 'worst', 'cancel'];
      const urgentWords = ['urgent', 'emergency', 'asap', 'immediately', 'now', 'help'];
      
      const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
      const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
      const urgentCount = urgentWords.filter(w => lowerText.includes(w)).length;
      
      if (negativeCount > positiveCount) {
        result.sentiment = negativeCount > 2 ? 'frustrated' : 'negative';
        result.score = -0.5 - (negativeCount * 0.1);
      } else if (positiveCount > negativeCount) {
        result.sentiment = positiveCount > 2 ? 'happy' : 'positive';
        result.score = 0.5 + (positiveCount * 0.1);
      }
      
      result.urgency = urgentCount > 1 ? 'high' : urgentCount === 1 ? 'medium' : 'low';
      result.keywords = [...positiveWords, ...negativeWords].filter(w => lowerText.includes(w));
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        callId,
        speakerId,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[call-sentiment] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
