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

    const { prescriptionId, imageUrl } = await req.json();

    if (!prescriptionId || !imageUrl) {
      throw new Error('Missing prescriptionId or imageUrl');
    }

    // Use Lovable AI to parse prescription
    const aiResponse = await fetch('https://lovable.dev/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this prescription image and extract all medicines with their dosage, frequency, and timing. Return JSON format: { "doctor_name": "...", "hospital_name": "...", "medicines": [{ "name": "...", "dosage": "...", "frequency": "once_daily|twice_daily|thrice_daily", "timing": ["morning", "evening"], "duration_days": 30 }] }. Only return valid JSON.` },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }]
      })
    });

    const aiData = await aiResponse.json();
    let parsedData: { medicines: any[]; doctor_name?: string; hospital_name?: string } = { medicines: [] };
    
    try {
      const content = aiData.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
    }

    // Update prescription with parsed data
    const { error: updateError } = await supabase
      .from('prescription_uploads')
      .update({
        ocr_parsed_data: parsedData,
        ocr_raw_text: JSON.stringify(aiData),
        doctor_name: parsedData.doctor_name || null,
        hospital_name: parsedData.hospital_name || null,
        status: 'processed'
      })
      .eq('id', prescriptionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Prescription parsing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
