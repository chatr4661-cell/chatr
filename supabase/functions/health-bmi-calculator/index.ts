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

    const { height_cm, weight_kg, waist_cm, body_fat_percent } = await req.json();

    if (!height_cm || !weight_kg) {
      throw new Error('Height and weight are required');
    }

    // Calculate BMI
    const heightM = height_cm / 100;
    const bmiValue = Math.round((weight_kg / (heightM * heightM)) * 100) / 100;

    // Determine category
    let bmiCategory: string;
    let healthRisk: string;
    let recommendations: string[] = [];

    if (bmiValue < 18.5) {
      bmiCategory = 'underweight';
      healthRisk = 'Increased risk of nutritional deficiency and osteoporosis';
      recommendations = [
        'Consider consulting a nutritionist',
        'Increase protein and healthy fat intake',
        'Include strength training exercises',
        'Eat more frequent, nutrient-dense meals'
      ];
    } else if (bmiValue >= 18.5 && bmiValue < 25) {
      bmiCategory = 'normal';
      healthRisk = 'Low risk - maintain your healthy weight';
      recommendations = [
        'Continue balanced diet and regular exercise',
        'Get regular health checkups',
        'Maintain 150 mins of moderate exercise weekly',
        'Stay hydrated and sleep well'
      ];
    } else if (bmiValue >= 25 && bmiValue < 30) {
      bmiCategory = 'overweight';
      healthRisk = 'Increased risk of heart disease and type 2 diabetes';
      recommendations = [
        'Aim for gradual weight loss (0.5-1 kg/week)',
        'Reduce processed foods and sugar',
        'Increase physical activity to 200+ mins/week',
        'Consider consulting a dietitian'
      ];
    } else {
      bmiCategory = 'obese';
      healthRisk = 'High risk of heart disease, diabetes, and other conditions';
      recommendations = [
        'Consult a healthcare provider for personalized plan',
        'Consider medically supervised weight loss',
        'Focus on sustainable lifestyle changes',
        'Regular monitoring of blood pressure and blood sugar'
      ];
    }

    // Calculate ideal weight range
    const idealWeightMin = Math.round(18.5 * heightM * heightM * 10) / 10;
    const idealWeightMax = Math.round(24.9 * heightM * heightM * 10) / 10;

    // Store the BMI record
    const { data: bmiRecord, error: insertError } = await supabase
      .from('bmi_records')
      .insert({
        user_id: user.id,
        height_cm,
        weight_kg,
        bmi_value: bmiValue,
        bmi_category: bmiCategory,
        waist_cm: waist_cm || null,
        body_fat_percent: body_fat_percent || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Get BMI history for trend
    const { data: history } = await supabase
      .from('bmi_records')
      .select('bmi_value, recorded_at')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(10);

    // Calculate trend
    let trend = 'stable';
    if (history && history.length >= 2) {
      const diff = history[0].bmi_value - history[1].bmi_value;
      if (diff > 0.5) trend = 'increasing';
      else if (diff < -0.5) trend = 'decreasing';
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bmi_value: bmiValue,
          bmi_category: bmiCategory,
          health_risk: healthRisk,
          recommendations,
          ideal_weight_range: {
            min: idealWeightMin,
            max: idealWeightMax
          },
          trend,
          history: history?.slice(0, 5),
          record_id: bmiRecord.id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('BMI Calculator error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
