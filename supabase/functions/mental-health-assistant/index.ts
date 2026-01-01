import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// PHQ-9 Questions
const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself",
  "Trouble concentrating on things",
  "Moving or speaking slowly, or being restless",
  "Thoughts of self-harm"
];

// GAD-7 Questions  
const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
];

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
      case 'get_assessment_questions': {
        const { assessment_type } = params;
        
        if (assessment_type === 'PHQ-9') {
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: {
                questions: PHQ9_QUESTIONS.map((q, i) => ({ id: i, question: q })),
                options: [
                  { value: 0, label: 'Not at all' },
                  { value: 1, label: 'Several days' },
                  { value: 2, label: 'More than half the days' },
                  { value: 3, label: 'Nearly every day' }
                ],
                description: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (assessment_type === 'GAD-7') {
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: {
                questions: GAD7_QUESTIONS.map((q, i) => ({ id: i, question: q })),
                options: [
                  { value: 0, label: 'Not at all' },
                  { value: 1, label: 'Several days' },
                  { value: 2, label: 'More than half the days' },
                  { value: 3, label: 'Nearly every day' }
                ],
                description: 'Over the last 2 weeks, how often have you been bothered by the following problems?'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('Unknown assessment type');
      }

      case 'submit_assessment': {
        const { assessment_type, responses } = params;
        
        // Calculate score
        const score = responses.reduce((sum: number, r: number) => sum + r, 0);
        
        let interpretation = '';
        let recommendations: string[] = [];
        let severity = '';
        
        if (assessment_type === 'PHQ-9') {
          if (score <= 4) {
            severity = 'minimal';
            interpretation = 'Minimal or no depression symptoms detected.';
            recommendations = ['Continue self-care practices', 'Maintain social connections', 'Regular exercise'];
          } else if (score <= 9) {
            severity = 'mild';
            interpretation = 'Mild depression symptoms. Monitor and consider lifestyle changes.';
            recommendations = ['Consider counseling', 'Increase physical activity', 'Practice mindfulness', 'Maintain regular sleep schedule'];
          } else if (score <= 14) {
            severity = 'moderate';
            interpretation = 'Moderate depression symptoms. Professional support recommended.';
            recommendations = ['Consult a mental health professional', 'Consider therapy options', 'Join support groups', 'Practice stress management'];
          } else if (score <= 19) {
            severity = 'moderately_severe';
            interpretation = 'Moderately severe depression. Please seek professional help.';
            recommendations = ['Schedule appointment with psychiatrist', 'Discuss treatment options', 'Consider medication evaluation', 'Daily self-care routine'];
          } else {
            severity = 'severe';
            interpretation = 'Severe depression symptoms. Please seek immediate professional support.';
            recommendations = ['Seek immediate professional help', 'Contact crisis helpline if needed', 'Do not isolate yourself', 'Inform a trusted person'];
          }
        } else if (assessment_type === 'GAD-7') {
          if (score <= 4) {
            severity = 'minimal';
            interpretation = 'Minimal anxiety symptoms.';
            recommendations = ['Continue healthy habits', 'Practice relaxation techniques'];
          } else if (score <= 9) {
            severity = 'mild';
            interpretation = 'Mild anxiety. Self-care strategies may help.';
            recommendations = ['Deep breathing exercises', 'Limit caffeine', 'Regular exercise', 'Adequate sleep'];
          } else if (score <= 14) {
            severity = 'moderate';
            interpretation = 'Moderate anxiety. Consider professional guidance.';
            recommendations = ['Consult a counselor', 'Try cognitive behavioral techniques', 'Meditation apps', 'Limit news consumption'];
          } else {
            severity = 'severe';
            interpretation = 'Severe anxiety symptoms. Professional help recommended.';
            recommendations = ['Schedule mental health consultation', 'Discuss therapy options', 'Consider medication evaluation', 'Practice grounding techniques'];
          }
        }

        // Store assessment
        const { data: assessment, error: insertError } = await supabase
          .from('mental_health_assessments')
          .insert({
            user_id: user.id,
            assessment_type,
            score,
            responses: { answers: responses },
            interpretation,
            recommendations
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              score,
              max_score: assessment_type === 'PHQ-9' ? 27 : 21,
              severity,
              interpretation,
              recommendations,
              assessment_id: assessment.id
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'find_therapists': {
        const { city, specialty, teletherapy_only } = params;
        
        let query = supabase
          .from('chatr_healthcare')
          .select('*')
          .eq('is_mental_health_provider', true)
          .eq('is_active', true);

        if (city) {
          query = query.ilike('city', `%${city}%`);
        }
        
        if (teletherapy_only) {
          query = query.eq('offers_teletherapy', true);
        }

        const { data: therapists, error } = await query.limit(20);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data: therapists || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'book_session': {
        const { therapist_id, session_type, scheduled_at, duration_minutes } = params;
        
        const { data: session, error } = await supabase
          .from('therapy_sessions')
          .insert({
            user_id: user.id,
            therapist_id,
            session_type,
            scheduled_at,
            duration_minutes: duration_minutes || 45,
            status: 'scheduled'
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data: session }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'chat_support': {
        const { message, context } = params;
        
        // Check for crisis keywords
        const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'want to die', 'self harm'];
        const isCrisis = crisisKeywords.some(k => message.toLowerCase().includes(k));
        
        if (isCrisis) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: {
                response: `I'm really concerned about what you're sharing. You're not alone, and help is available right now.

🆘 **Crisis Helplines (India):**
• iCall: 9152987821
• Vandrevala Foundation: 1860-2662-345
• NIMHANS: 080-46110007

Please reach out to one of these helplines immediately. Your life matters, and trained professionals are ready to support you 24/7.

Would you like me to help you find a mental health professional in your area?`,
                is_crisis: true,
                helplines: [
                  { name: 'iCall', number: '9152987821' },
                  { name: 'Vandrevala Foundation', number: '1860-2662-345' },
                  { name: 'NIMHANS', number: '080-46110007' }
                ]
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Regular supportive chat
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
                content: `You are a compassionate mental health support assistant. You are NOT a therapist and cannot provide medical advice.
Your role is to:
- Listen empathetically
- Validate feelings
- Suggest healthy coping strategies
- Encourage professional help when appropriate
- Provide self-care tips
Always be warm, non-judgmental, and supportive. If someone seems in crisis, urge them to contact helplines.`
              },
              {
                role: 'user',
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        let response = "I'm here to listen and support you. Would you like to tell me more about what you're going through?";
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          response = aiData.choices[0]?.message?.content || response;
        }

        return new Response(
          JSON.stringify({ success: true, data: { response, is_crisis: false } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_history': {
        const { data: assessments } = await supabase
          .from('mental_health_assessments')
          .select('*')
          .eq('user_id', user.id)
          .order('assessed_at', { ascending: false })
          .limit(20);

        const { data: sessions } = await supabase
          .from('therapy_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('scheduled_at', { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({ success: true, data: { assessments: assessments || [], sessions: sessions || [] } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Mental health assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
