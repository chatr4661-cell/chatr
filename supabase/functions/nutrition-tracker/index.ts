import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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

    const { action, ...params } = await req.json();

    switch (action) {
      case 'log_food': {
        const { food_name, meal_type, quantity } = params;
        
        // Use AI to estimate nutrition
        const aiResponse = await fetch(LOVABLE_AI_URL, {
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
                content: `You are a nutrition expert. Estimate nutritional values for Indian foods accurately.
Return ONLY valid JSON: {"calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number}
Use typical Indian portion sizes. Be accurate for common foods like roti, dal, rice, sabzi.`
              },
              {
                role: 'user',
                content: `Estimate nutrition for: ${quantity || '1 serving'} of ${food_name}`
              }
            ],
            temperature: 0.3,
            max_tokens: 200
          })
        });

        let nutrition = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices[0]?.message?.content || '{}';
          try {
            const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
            nutrition = { ...nutrition, ...parsed };
          } catch {
            console.log('Could not parse AI response, using defaults');
          }
        }

        // Log the food
        const { data: logData, error: logError } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user.id,
            log_date: new Date().toISOString().split('T')[0],
            meal_type: meal_type || 'snack',
            food_name,
            ...nutrition
          })
          .select()
          .single();

        if (logError) throw logError;

        return new Response(
          JSON.stringify({ success: true, data: logData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_daily_summary': {
        const { date } = params;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data: summary } = await supabase
          .from('nutrition_daily_summary')
          .select('*')
          .eq('user_id', user.id)
          .eq('summary_date', targetDate)
          .single();

        const { data: logs } = await supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', targetDate)
          .order('created_at', { ascending: true });

        // Group by meal type
        const meals = {
          breakfast: logs?.filter(l => l.meal_type === 'breakfast') || [],
          lunch: logs?.filter(l => l.meal_type === 'lunch') || [],
          dinner: logs?.filter(l => l.meal_type === 'dinner') || [],
          snack: logs?.filter(l => l.meal_type === 'snack') || []
        };

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              summary: summary || { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0 },
              meals,
              date: targetDate
            } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set_goals': {
        const { goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, goal_water_ml } = params;
        
        const { data, error } = await supabase
          .from('nutrition_daily_summary')
          .upsert({
            user_id: user.id,
            summary_date: new Date().toISOString().split('T')[0],
            goal_calories,
            goal_protein_g,
            goal_carbs_g,
            goal_fat_g,
            goal_water_ml
          }, { onConflict: 'user_id,summary_date' })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'log_water': {
        const { amount_ml } = params;
        
        // Update water in today's summary
        const today = new Date().toISOString().split('T')[0];
        
        const { data: existing } = await supabase
          .from('nutrition_daily_summary')
          .select('total_water_ml')
          .eq('user_id', user.id)
          .eq('summary_date', today)
          .single();

        const newTotal = (existing?.total_water_ml || 0) + amount_ml;

        const { data, error } = await supabase
          .from('nutrition_daily_summary')
          .upsert({
            user_id: user.id,
            summary_date: today,
            total_water_ml: newTotal
          }, { onConflict: 'user_id,summary_date' })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data: { total_water_ml: newTotal } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Nutrition tracker error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
