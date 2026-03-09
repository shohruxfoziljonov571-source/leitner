import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v21.0";
const VALID_EVENTS = ["CompleteRegistration", "Lead", "Purchase", "Subscribe", "StartTrial"];

// Simple in-memory rate limiter (per isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { click_id, event_name = "CompleteRegistration", value, currency, test_event_code } = body;

    // Input validation
    if (!click_id || typeof click_id !== "string" || click_id.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid click_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VALID_EVENTS.includes(event_name)) {
      return new Response(JSON.stringify({ error: `Invalid event_name. Valid: ${VALID_EVENTS.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by click_id
    if (isRateLimited(click_id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");

    if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
      console.error("Missing META_PIXEL_ID or META_ACCESS_TOKEN");
      return new Response(JSON.stringify({ error: "Meta credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: click, error: clickError } = await supabase
      .from("ad_clicks")
      .select("*")
      .eq("click_id", click_id)
      .maybeSingle();

    if (clickError || !click) {
      console.error("Click not found:", click_id, clickError);
      return new Response(JSON.stringify({ error: "Click not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup for CompleteRegistration
    if (event_name === "CompleteRegistration" && click.conversion_sent) {
      return new Response(JSON.stringify({ message: "Already sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    async function sha256(input: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(input.trim().toLowerCase());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const eventId = `${click_id}_${event_name}_${Date.now()}`;
    const hashedExternalId = await sha256(click_id);
    const hashedEmail = await sha256(`${click_id}@leitner.uz`);

    const eventData: Record<string, unknown> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: "https://leitner.lovable.app/lp",
      user_data: {
        client_user_agent: click.user_agent || "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
        external_id: [hashedExternalId],
        em: [hashedEmail],
      },
    };

    if (click.fbclid) {
      (eventData.user_data as Record<string, unknown>).fbc = `fb.1.${click.created_at ? new Date(click.created_at).getTime() : Date.now()}.${click.fbclid}`;
    }

    if (click.telegram_user_id) {
      const tgHash = await sha256(String(click.telegram_user_id));
      (eventData.user_data as Record<string, unknown>).external_id = [tgHash];
      (eventData.user_data as Record<string, unknown>).em = [await sha256(`${click.telegram_user_id}@leitner.uz`)];
    }

    if (value && currency) {
      eventData.custom_data = {
        value: parseFloat(value),
        currency: String(currency).slice(0, 3).toUpperCase(),
      };
    }

    console.log("Sending to Meta:", JSON.stringify({ data: [eventData] }, null, 2));

    const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;

    const requestBody: Record<string, unknown> = {
      data: [eventData],
      access_token: META_ACCESS_TOKEN,
    };

    if (test_event_code && typeof test_event_code === "string") {
      requestBody.test_event_code = test_event_code.slice(0, 50);
    }

    const metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const metaResult = await metaResponse.json();
    console.log(`Meta API [${event_name}] response:`, JSON.stringify(metaResult));

    if (!metaResponse.ok) {
      console.error("Meta API error:", metaResult);
      return new Response(JSON.stringify({ error: "Meta API error", details: metaResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event_name === "CompleteRegistration") {
      await supabase
        .from("ad_clicks")
        .update({
          conversion_sent: true,
          conversion_sent_at: new Date().toISOString(),
        })
        .eq("click_id", click_id);
    }

    return new Response(JSON.stringify({ success: true, event_name, meta_response: metaResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
