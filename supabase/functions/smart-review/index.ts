import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, userStats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!words || !Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ prioritized: [], tips: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare word data for AI analysis
    const wordSummary = words.slice(0, 30).map((w: any) => ({
      id: w.id,
      word: w.original_word,
      translation: w.translated_word,
      box: w.box_number,
      reviewed: w.times_reviewed,
      correct: w.times_correct,
      incorrect: w.times_incorrect,
      accuracy: w.times_reviewed > 0 ? Math.round((w.times_correct / w.times_reviewed) * 100) : 0,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a spaced repetition learning assistant. Analyze the user's word review data and provide smart recommendations. Return JSON only.`
          },
          {
            role: "user",
            content: `Here are the user's words with review statistics:
${JSON.stringify(wordSummary, null, 2)}

User stats: streak=${userStats?.streak || 0}, total_reviewed_today=${userStats?.today_reviewed || 0}

Analyze and return a JSON object with:
1. "prioritized": array of word IDs sorted by urgency (most difficult/error-prone first). Include ALL word IDs.
2. "tips": array of 2-3 short learning tips in Uzbek language, based on the data (e.g. which words need more attention, patterns in errors)
3. "difficulty_map": object mapping word ID to difficulty score (1-10, 10 = hardest)

Consider: low accuracy = harder, more incorrect answers = needs more review, low box number with many reviews = struggling word.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "smart_review_result",
              description: "Return prioritized review order with tips",
              parameters: {
                type: "object",
                properties: {
                  prioritized: {
                    type: "array",
                    items: { type: "string" },
                    description: "Word IDs sorted by review urgency"
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 learning tips in Uzbek"
                  },
                  difficulty_map: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "Word ID to difficulty score (1-10)"
                  }
                },
                required: ["prioritized", "tips", "difficulty_map"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "smart_review_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: sort by accuracy (lowest first)
    const fallback = wordSummary
      .sort((a: any, b: any) => a.accuracy - b.accuracy)
      .map((w: any) => w.id);

    return new Response(JSON.stringify({ 
      prioritized: fallback, 
      tips: ["So'zlarni muntazam takrorlang"], 
      difficulty_map: {} 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("smart-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
