import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submittedText, originalText, dictationId, userId } = await req.json();

    if (!submittedText || !originalText) {
      return new Response(
        JSON.stringify({ error: "submittedText va originalText kerak" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Checking dictation submission...");
    console.log("Original length:", originalText.length);
    console.log("Submitted length:", submittedText.length);

    // Call AI to analyze the dictation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Sen ingliz tili diktant tekshiruvchisisisan. Foydalanuvchi yozgan matnni original matn bilan solishtirib, xatolarni topishing va batafsil tushuntiring kerak.

Javobingiz quyidagi formatda bo'lsin:
1. Umumiy baho (0-100% aniqlik)
2. Xatolar soni
3. Har bir xato uchun:
   - Noto'g'ri yozilgan so'z
   - To'g'ri variant
   - Qisqacha tushuntirish

Javobni O'zbek tilida bering. Ijobiy va rag'batlantiruvchi uslubda yozing.`
          },
          {
            role: "user",
            content: `Original matn:
"${originalText}"

Foydalanuvchi yozgan matn:
"${submittedText}"

Iltimos, matnlarni solishtiring va xatolarni aniqlang.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_dictation",
              description: "Analyze dictation submission and return structured feedback",
              parameters: {
                type: "object",
                properties: {
                  accuracy_percentage: {
                    type: "number",
                    description: "Accuracy percentage from 0 to 100"
                  },
                  errors_count: {
                    type: "integer",
                    description: "Total number of errors found"
                  },
                  feedback: {
                    type: "string",
                    description: "Detailed feedback in Uzbek language explaining errors and suggestions"
                  },
                  xp_earned: {
                    type: "integer",
                    description: "XP to award based on accuracy (0-20)"
                  }
                },
                required: ["accuracy_percentage", "errors_count", "feedback", "xp_earned"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_dictation" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result = {
      accuracy_percentage: 0,
      errors_count: 0,
      feedback: "Xatolik yuz berdi",
      xp_earned: 0
    };

    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Save to database if userId and dictationId provided
    if (userId && dictationId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: insertError } = await supabase
        .from("dictation_submissions")
        .insert({
          user_id: userId,
          dictation_id: dictationId,
          submitted_text: submittedText,
          accuracy_percentage: result.accuracy_percentage,
          errors_count: result.errors_count,
          ai_feedback: result.feedback,
          xp_earned: result.xp_earned
        });

      if (insertError) {
        console.error("Failed to save submission:", insertError);
      } else {
        console.log("Submission saved successfully");
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
