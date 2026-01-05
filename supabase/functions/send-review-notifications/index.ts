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

    // Get all users who need to review words and have Telegram enabled
    const now = new Date().toISOString();

    // Get users with Telegram connected and notifications enabled
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

    let notificationsSent = 0;

    for (const user of usersWithNotifications || []) {
      // Check notification settings
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("telegram_enabled, quiet_hours_start, quiet_hours_end")
        .eq("user_id", user.user_id)
        .maybeSingle();

      if (!settings?.telegram_enabled) {
        continue;
      }

      // Check quiet hours
      const currentHour = new Date().getHours();
      if (settings.quiet_hours_start && settings.quiet_hours_end) {
        const startHour = parseInt(settings.quiet_hours_start.split(":")[0]);
        const endHour = parseInt(settings.quiet_hours_end.split(":")[0]);
        
        if (startHour <= currentHour && currentHour < endHour) {
          continue; // Skip during quiet hours
        }
      }

      // Count words due for review per language
      const { data: languages } = await supabase
        .from("user_languages")
        .select("id, source_language, target_language")
        .eq("user_id", user.user_id);

      let totalWordsToReview = 0;
      const languageDetails: string[] = [];

      for (const lang of languages || []) {
        const { count } = await supabase
          .from("words")
          .select("*", { count: "exact", head: true })
          .eq("user_language_id", lang.id)
          .lte("next_review_time", now);

        if (count && count > 0) {
          totalWordsToReview += count;
          const langEmoji = lang.target_language === "en" ? "🇬🇧" : lang.target_language === "ru" ? "🇷🇺" : "🇺🇿";
          languageDetails.push(`${langEmoji} ${count} ta`);
        }
      }

      if (totalWordsToReview > 0) {
        const message = 
          `📚 Takrorlash vaqti!\n\n` +
          `${user.full_name || "Salom"}, sizda ${totalWordsToReview} ta so'z takrorlashni kutmoqda.\n\n` +
          `${languageDetails.join("\n")}\n\n` +
          `🎯 Ilovaga kiring va o'rganishni davom ettiring!`;

        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, user.telegram_chat_id, message);
        notificationsSent++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: notificationsSent,
        users_checked: usersWithNotifications?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notifications:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    }),
  });
  
  if (!response.ok) {
    console.error("Error sending Telegram message:", await response.text());
  }
  
  return response;
}
