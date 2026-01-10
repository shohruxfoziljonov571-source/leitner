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

    let reportsSent = 0;

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

      // Get stats from the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const startDate = oneWeekAgo.toISOString().split('T')[0];

      const { data: dailyStats } = await supabase
        .from("daily_stats")
        .select("date, words_reviewed, words_correct, xp_earned")
        .eq("user_id", user.user_id)
        .gte("date", startDate)
        .order("date", { ascending: true });

      // Get current user stats
      const { data: userStats } = await supabase
        .from("user_stats")
        .select("xp, level, streak, total_words, learned_words")
        .eq("user_id", user.user_id);

      // Calculate weekly totals
      let totalReviewed = 0;
      let totalCorrect = 0;
      let totalXp = 0;
      let daysActive = 0;

      for (const stat of dailyStats || []) {
        totalReviewed += stat.words_reviewed || 0;
        totalCorrect += stat.words_correct || 0;
        totalXp += stat.xp_earned || 0;
        if ((stat.words_reviewed || 0) > 0) daysActive++;
      }

      const accuracy = totalReviewed > 0 
        ? Math.round((totalCorrect / totalReviewed) * 100) 
        : 0;

      // Aggregate user stats
      const currentXp = userStats?.reduce((sum: number, s: any) => sum + (s.xp || 0), 0) || 0;
      const currentLevel = Math.max(...(userStats?.map((s: any) => s.level || 1) || [1]));
      const currentStreak = Math.max(...(userStats?.map((s: any) => s.streak || 0) || [0]));
      const totalWords = userStats?.reduce((sum: number, s: any) => sum + (s.total_words || 0), 0) || 0;
      const learnedWords = userStats?.reduce((sum: number, s: any) => sum + (s.learned_words || 0), 0) || 0;

      // Skip if no activity at all
      if (totalReviewed === 0 && totalWords === 0) {
        continue;
      }

      // Generate progress bar
      const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;
      const progressBar = generateProgressBar(progressPercent);

      // Day breakdown with emojis
      let weekBreakdown = "";
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStat = dailyStats?.find((s: any) => s.date === dateStr);
        const emoji = (dayStat?.words_reviewed || 0) > 0 ? "🟢" : "⚪️";
        weekBreakdown += `${emoji} `;
      }

      const reportMessage = 
        `📊 <b>Haftalik Hisobot</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 <b>${user.full_name || 'Foydalanuvchi'}</b>\n\n` +
        `📅 <b>Oxirgi 7 kun:</b>\n` +
        `${weekBreakdown}\n\n` +
        `📈 <b>Haftalik natijalar:</b>\n` +
        `• Takrorlangan: ${totalReviewed} ta so'z\n` +
        `• To'g'ri javoblar: ${totalCorrect} (${accuracy}%)\n` +
        `• XP yig'ildi: +${totalXp}\n` +
        `• Faol kunlar: ${daysActive}/7\n\n` +
        `🏆 <b>Joriy holat:</b>\n` +
        `• Daraja: ⭐️ ${currentLevel}\n` +
        `• Jami XP: 💎 ${currentXp.toLocaleString()}\n` +
        `• Streak: 🔥 ${currentStreak} kun\n\n` +
        `📚 <b>So'zlar progress:</b>\n` +
        `${progressBar} ${progressPercent}%\n` +
        `${learnedWords} / ${totalWords} so'z o'rganilgan\n\n` +
        (daysActive >= 5 
          ? "🌟 <b>Ajoyib hafta!</b> Davom eting!"
          : daysActive >= 3 
          ? "👍 <b>Yaxshi hafta!</b> Ozgina ko'proq harakat!"
          : "💪 <b>Ko'proq mashq qiling!</b> Har kuni 5 daqiqa!");

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, user.telegram_chat_id, reportMessage);
      reportsSent++;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reports_sent: reportsSent,
        users_checked: usersWithNotifications?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending weekly reports:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return "▓".repeat(filled) + "░".repeat(empty);
}

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
