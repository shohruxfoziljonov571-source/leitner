import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBAPP_URL = "https://leitner.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find users who:
    // 1. Created account 6-48 hours ago
    // 2. Have telegram_chat_id (so we can message them)
    // 3. Have 0 words reviewed (today_reviewed = 0 and total learned = 0)
    // 4. Haven't been sent a reminder yet (we track via referral_source field)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Get profiles created in the window with telegram connected
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id, full_name, created_at, referral_source")
      .not("telegram_chat_id", "is", null)
      .gte("created_at", twoDaysAgo)
      .lte("created_at", sixHoursAgo);

    if (profileErr) {
      console.error("Profile query error:", profileErr);
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profiles || profiles.length === 0) {
      console.log("No profiles in the onboarding window");
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out those already reminded
    const eligibleProfiles = profiles.filter(
      (p: any) => !p.referral_source?.includes("onboarding_reminded")
    );

    if (eligibleProfiles.length === 0) {
      console.log("All profiles already reminded");
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const profile of eligibleProfiles) {
      // Check if user has any reviewed words
      const { data: stats } = await supabase
        .from("user_stats")
        .select("today_reviewed, total_words, learned_words")
        .eq("user_id", profile.user_id);

      const totalReviewed = stats?.reduce(
        (sum: number, s: any) => sum + (s.today_reviewed || 0) + (s.learned_words || 0),
        0
      ) || 0;

      // User has already engaged — skip
      if (totalReviewed > 0) {
        skipped++;
        continue;
      }

      // Check word count
      const totalWords = stats?.reduce((sum: number, s: any) => sum + (s.total_words || 0), 0) || 0;

      // Send reminder via Telegram
      const firstName = profile.full_name?.split(" ")[0] || "Do'stim";

      let messageText: string;

      if (totalWords > 0) {
        // Has words (starter pack) but hasn't reviewed
        messageText =
          `👋 <b>Salom, ${firstName}!</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `Sizda <b>${totalWords} ta so'z</b> tayyor turubdi! 📚\n\n` +
          `Ularni takrorlashni boshlang — har kuni atigi <b>5 daqiqa</b> ajratib, ingliz tilingizni sezilarli yaxshilashingiz mumkin.\n\n` +
          `💡 Hoziroq /quiz bosing va birinchi darsni o'ting! 🚀`;
      } else {
        // No words at all
        messageText =
          `👋 <b>Salom, ${firstName}!</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `Siz ro'yxatdan o'tdingiz, lekin hali birinchi so'zingizni qo'shmagansiz! 😊\n\n` +
          `💡 <b>Tezkor boshlash:</b>\n` +
          `<code>/add hello - salom</code>\n\n` +
          `Yoki 📱 ilovani oching va tayyor so'z to'plamini tanlang!\n\n` +
          `Har kuni 5 daqiqa = katta natija! 🎯`;
      }

      try {
        const res = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: profile.telegram_chat_id,
              text: messageText,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🧠 Quiz boshlash", callback_data: "quiz" }],
                  [{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
                ],
              },
            }),
          }
        );

        if (res.ok) {
          sent++;
          // Mark as reminded
          const existingSource = profile.referral_source || "";
          const newSource = existingSource
            ? `${existingSource},onboarding_reminded`
            : "onboarding_reminded";

          await supabase
            .from("profiles")
            .update({ referral_source: newSource })
            .eq("user_id", profile.user_id);
        } else {
          const errBody = await res.text();
          console.error(`Failed to send to ${profile.telegram_chat_id}:`, errBody);
        }
      } catch (e) {
        console.error(`Send error for ${profile.telegram_chat_id}:`, e);
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`Onboarding reminders: sent=${sent}, skipped=${skipped}, total=${eligibleProfiles.length}`);

    return new Response(
      JSON.stringify({ ok: true, sent, skipped, total: eligibleProfiles.length }),
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
