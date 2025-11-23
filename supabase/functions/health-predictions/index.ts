import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch user's health vitals for analysis
    const { data: vitals, error: vitalsError } = await supabase
      .from('health_vitals')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (vitalsError) throw vitalsError;

    // Fetch medications for interaction analysis
    const { data: medications, error: medsError } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (medsError) throw medsError;

    // Fetch health goals
    const { data: goals, error: goalsError } = await supabase
      .from('health_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (goalsError) throw goalsError;

    // Use Lovable AI for health predictions
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a health analytics AI. Analyze health data and provide:
1. Risk assessments for potential health issues
2. Trend analysis of vital signs
3. Personalized health recommendations
4. Goal progress insights
Return JSON with: {predictions: [{type, category, description, confidence, recommendation}]}`
          },
          {
            role: 'user',
            content: JSON.stringify({
              vitals: vitals?.slice(0, 20),
              medications,
              goals
            })
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content || '{}';
    
    let predictions;
    try {
      predictions = JSON.parse(aiContent).predictions || [];
    } catch {
      predictions = [{
        type: 'recommendation',
        category: 'general',
        description: aiContent,
        confidence: 0.75,
        recommendation: 'Continue monitoring your health metrics regularly'
      }];
    }

    // Store predictions
    const predictionRecords = predictions.map((pred: any) => ({
      user_id: user.id,
      prediction_type: pred.type || 'recommendation',
      category: pred.category || 'general',
      prediction_data: {
        description: pred.description,
        recommendation: pred.recommendation,
        details: pred.details
      },
      confidence_score: pred.confidence || 0.75,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }));

    const { data: savedPredictions, error: saveError } = await supabase
      .from('health_predictions')
      .insert(predictionRecords)
      .select();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        predictions: savedPredictions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health predictions error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});