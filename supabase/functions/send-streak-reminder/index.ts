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
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const today = new Date().toISOString().split('T')[0];

    // Get all users with Telegram connected and notifications enabled
    const { data: usersWithNotifications, error: usersError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        full_name,
        telegram_chat_id
      `)
      .not("telegram_chat_id", "is", null);

    if (usersError) {
      throw usersError;
    }

    let remindersSent = 0;

    for (const user of usersWithNotifications || []) {
      // Check if telegram notifications are enabled
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("telegram_enabled")
        .eq("user_id", user.user_id)
        .maybeSingle();

      if (!settings?.telegram_enabled) {
        continue;
      }

      // Check if user has practiced today
      const { data: todayStats } = await supabase
        .from("daily_stats")
        .select("words_reviewed")
        .eq("user_id", user.user_id)
        .eq("date", today);

      const todayReviewed = todayStats?.reduce((sum, s) => sum + (s.words_reviewed || 0), 0) || 0;

      // Skip if user has already practiced today
      if (todayReviewed > 0) {
        continue;
      }

      // Get user's current streak
      const { data: userStats } = await supabase
        .from("user_stats")
        .select("streak")
        .eq("user_id", user.user_id);

      const currentStreak = Math.max(...(userStats?.map((s: any) => s.streak || 0) || [0]));

      // Only warn if user has an active streak to lose
      if (currentStreak === 0) {
        continue;
      }

      // Count words due for review
      const now = new Date().toISOString();
      const { count } = await supabase
        .from("words")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .lte("next_review_time", now);

      const wordsToReview = count || 0;

      let message = "";
      let emoji = "";

      if (currentStreak >= 30) {
        emoji = "🔥🔥🔥";
        message = `${emoji} <b>OGOHLANTIRISH!</b>\n\n` +
          `${user.full_name || 'Salom'}, sizning <b>${currentStreak} kunlik</b> streak'ingiz xavf ostida!\n\n` +
          `Bu ajoyib natija! Uni yo'qotmang! 💪`;
      } else if (currentStreak >= 7) {
        emoji = "🔥🔥";
        message = `${emoji} <b>Streak xavf ostida!</b>\n\n` +
          `${user.full_name || 'Salom'}, sizning <b>${currentStreak} kunlik</b> streak'ingiz bugun tugashi mumkin!\n\n` +
          `Davom ettiring! 💪`;
      } else {
        emoji = "🔥";
        message = `${emoji} <b>Bugun mashq qilmadingiz!</b>\n\n` +
          `${user.full_name || 'Salom'}, sizning <b>${currentStreak} kunlik</b> streak'ingiz bor.\n\n` +
          `Uni yo'qotmaslik uchun hoziroq mashq qiling! 💪`;
      }

      if (wordsToReview > 0) {
        message += `\n\n📚 Takrorlash kutmoqda: <b>${wordsToReview}</b> ta so'z`;
      }

      message += "\n\n⏰ Yarim tun oldidan mashq qiling!";

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, user.telegram_chat_id, message);
      remindersSent++;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: remindersSent,
        users_checked: usersWithNotifications?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending streak reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const WEBAPP_URL = "https://leitner.lovable.app";
  
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📚 Hoziroq mashq qilish", web_app: { url: WEBAPP_URL } }],
        ],
      },
    }),
  });
  
  if (!response.ok) {
    console.error("Error sending Telegram message:", await response.text());
  }
  
  return response;
}
