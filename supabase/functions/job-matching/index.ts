import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId } = await req.json();

    // Get user's skills and preferences from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Find matching jobs based on skills and location
    const { data: jobs } = await supabase
      .from("job_postings")
      .select("*")
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString());

    // Simple matching algorithm
    const matchedJobs = jobs?.map(job => {
      let score = 0;
      
      // Location match
      if (job.location === profile?.city || job.is_remote) score += 30;
      
      // Skills match
      const userSkills = profile?.skills || [];
      const jobSkills = job.skills_required || [];
      const matchingSkills = userSkills.filter((skill: string) => 
        jobSkills.includes(skill)
      );
      score += (matchingSkills.length / jobSkills.length) * 70;

      return { ...job, matchScore: Math.round(score) };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return new Response(
      JSON.stringify({ matches: matchedJobs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
