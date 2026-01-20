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
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find validated but not notified referrals
    const { data: pendingNotifications, error: queryError } = await supabase
      .from("contest_referrals")
      .select(`
        id,
        contest_id,
        referrer_user_id,
        referred_user_id,
        validated_at
      `)
      .eq("is_valid", true)
      .is("notified_at", null)
      .order("validated_at", { ascending: true })
      .limit(50);

    if (queryError) {
      console.error("Error fetching pending notifications:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log("No pending referral notifications");
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${pendingNotifications.length} pending notifications`);

    let processed = 0;
    let failed = 0;

    for (const referral of pendingNotifications) {
      try {
        // Get referrer's telegram chat id
        const { data: referrerParticipant } = await supabase
          .from("contest_participants")
          .select("telegram_chat_id, referral_count")
          .eq("contest_id", referral.contest_id)
          .eq("user_id", referral.referrer_user_id)
          .maybeSingle();

        if (!referrerParticipant?.telegram_chat_id) {
          console.log(`Referrer ${referral.referrer_user_id} has no telegram_chat_id, skipping`);
          // Mark as notified anyway to avoid retrying
          await supabase
            .from("contest_referrals")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", referral.id);
          continue;
        }

        // Get referred user's profile
        const { data: referredProfile } = await supabase
          .from("profiles")
          .select("full_name, telegram_username")
          .eq("user_id", referral.referred_user_id)
          .maybeSingle();

        // Get contest details
        const { data: contest } = await supabase
          .from("contests")
          .select("title")
          .eq("id", referral.contest_id)
          .maybeSingle();

        const referredName = referredProfile?.full_name || 
                            referredProfile?.telegram_username || 
                            "Yangi foydalanuvchi";

        const message = 
          `🎉 <b>Yangi referral tasdiqlandi!</b>\n\n` +
          `👤 <b>${referredName}</b> sizning havolangiz orqali ro'yxatdan o'tdi va birinchi so'zini qo'shdi!\n\n` +
          `🏆 <b>${contest?.title || "Konkurs"}</b>\n` +
          `📊 Sizning referallaringiz: <b>${referrerParticipant.referral_count || 1}</b> ta\n\n` +
          `💪 Davom eting! Ko'proq do'stlaringizni taklif qiling!`;

        // Send telegram notification
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: referrerParticipant.telegram_chat_id,
              text: message,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📊 Statistikam", callback_data: "my_contest_stats" }],
                  [{ text: "📤 Yana taklif qilish", callback_data: "share_contest" }],
                ],
              },
            }),
          }
        );

        if (telegramResponse.ok) {
          // Mark as notified
          await supabase
            .from("contest_referrals")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", referral.id);

          console.log(`Notification sent to referrer: ${referrerParticipant.telegram_chat_id}`);
          processed++;
        } else {
          const errorText = await telegramResponse.text();
          console.error(`Failed to send notification: ${errorText}`);
          failed++;
        }
      } catch (error) {
        console.error(`Error processing referral ${referral.id}:`, error);
        failed++;
      }
    }

    console.log(`Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ ok: true, processed, failed }),
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
