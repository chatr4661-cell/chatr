import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, messageText, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = "";
    let userPrompt = "";
    let tools: any[] = [];

    // Define different AI actions
    switch (action) {
      case "smart-reply":
        systemPrompt = `You are a helpful AI assistant that generates smart, contextual reply suggestions for chat messages. 
        Generate 3 different reply options with varying tones:
        1. Professional/Formal
        2. Friendly/Casual
        3. Quick/Brief
        Keep replies concise and relevant to the conversation context.`;
        userPrompt = `Generate 3 smart reply suggestions for this message: "${messageText}"`;
        
        tools = [{
          type: "function",
          function: {
            name: "suggest_replies",
            description: "Generate smart reply suggestions",
            parameters: {
              type: "object",
              properties: {
                replies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      tone: { type: "string", enum: ["professional", "friendly", "quick"] }
                    },
                    required: ["text", "tone"]
                  }
                }
              },
              required: ["replies"]
            }
          }
        }];
        break;

      case "summarize":
        systemPrompt = `You are an AI that creates concise, clear summaries of conversations. 
        Focus on key points, decisions made, and action items. Keep it brief and actionable.`;
        userPrompt = `Summarize this conversation:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;
        
        tools = [{
          type: "function",
          function: {
            name: "create_summary",
            description: "Create conversation summary",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                keyPoints: {
                  type: "array",
                  items: { type: "string" }
                },
                actionItems: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["summary"]
            }
          }
        }];
        break;

      case "extract-tasks":
        systemPrompt = `You are an AI that extracts actionable tasks from messages. 
        Identify tasks, deadlines, priorities, and assign appropriate categories.`;
        userPrompt = `Extract tasks from: "${messageText}"`;
        
        tools = [{
          type: "function",
          function: {
            name: "extract_tasks",
            description: "Extract tasks from message",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                      dueDate: { type: "string" },
                      category: { type: "string" }
                    },
                    required: ["title", "priority"]
                  }
                }
              },
              required: ["tasks"]
            }
          }
        }];
        break;

      case "sentiment-analysis":
        systemPrompt = `Analyze the emotional tone and sentiment of messages. 
        Provide sentiment (positive/neutral/negative) and suggested tone-based reactions.`;
        userPrompt = `Analyze sentiment: "${messageText}"`;
        
        tools = [{
          type: "function",
          function: {
            name: "analyze_sentiment",
            description: "Analyze message sentiment",
            parameters: {
              type: "object",
              properties: {
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                confidence: { type: "number" },
                suggestedReactions: {
                  type: "array",
                  items: { type: "string" }
                },
                tone: { type: "string" }
              },
              required: ["sentiment", "confidence"]
            }
          }
        }];
        break;

      default:
        throw new Error("Invalid action");
    }

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: tools,
        tool_choice: { type: "function", function: { name: tools[0].function.name } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("AI chat assistant error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
