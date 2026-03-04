import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { click_id } = await req.json();

    if (!click_id) {
      return new Response(JSON.stringify({ error: "click_id required" }), {
        status: 400,
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

    // Get click data from DB
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

    if (click.conversion_sent) {
      return new Response(JSON.stringify({ message: "Already sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build event data
    const eventData: any = {
      event_name: "CompleteRegistration",
      event_time: Math.floor(Date.now() / 1000),
      event_id: click_id, // deduplication
      action_source: "website",
      user_data: {},
    };

    // Add fbclid if available
    if (click.fbclid) {
      eventData.user_data.fbc = `fb.1.${Date.now()}.${click.fbclid}`;
    }

    // Add fbp cookie if we had it (not available in this flow, but structure is ready)
    // eventData.user_data.fbp = "fb.1.xxx.yyy";

    // Send to Meta Conversions API
    const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;
    
    const metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: META_ACCESS_TOKEN,
      }),
    });

    const metaResult = await metaResponse.json();
    console.log("Meta API response:", JSON.stringify(metaResult));

    if (!metaResponse.ok) {
      console.error("Meta API error:", metaResult);
      return new Response(JSON.stringify({ error: "Meta API error", details: metaResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark conversion as sent
    await supabase
      .from("ad_clicks")
      .update({
        conversion_sent: true,
        conversion_sent_at: new Date().toISOString(),
      })
      .eq("click_id", click_id);

    return new Response(JSON.stringify({ success: true, meta_response: metaResult }), {
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
