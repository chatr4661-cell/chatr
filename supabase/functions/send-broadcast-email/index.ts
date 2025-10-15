import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  broadcastId: string;
  recipients: string[];
  subject: string;
  content: string;
  fromName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, content, fromName }: BroadcastRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      throw new Error("No recipients provided");
    }

    // Send emails in batches of 50 (Resend limit)
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = [];
    for (const batch of batches) {
      const emailPromises = batch.map(email =>
        resend.emails.send({
          from: `${fromName} <broadcast@chatr.chat>`,
          to: [email],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">${fromName}</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
                <div style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">
                  ${content}
                </div>
              </div>
              <div style="padding: 20px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
                <p>You received this because you're subscribed to ${fromName} on Chatr</p>
                <p>Powered by Chatr Business</p>
              </div>
            </div>
          `,
        })
      );

      const batchResults = await Promise.allSettled(emailPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Broadcast sent: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        total: recipients.length
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending broadcast:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);