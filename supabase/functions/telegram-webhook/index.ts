import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBAPP_URL = "https://leitner.lovable.app";

serve(async (req) => {
  // Handle CORS preflight
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

    // Parse Telegram webhook update
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const username = update.message?.from?.username || update.callback_query?.from?.username;

    // Handle callback queries (inline keyboard button clicks)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const callbackChatId = update.callback_query.message.chat.id;
      
      // Answer callback query to remove loading state
      await answerCallbackQuery(TELEGRAM_BOT_TOKEN, update.callback_query.id);

      switch (callbackData) {
        case "open_app":
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            callbackChatId,
            "📱 <b>Ilovani ochish</b>\n\n" +
            "Quyidagi tugmani bosing:",
            getWebAppButton()
          );
          break;
        
        case "my_stats":
          await handleStatsCommand(supabase, TELEGRAM_BOT_TOKEN, callbackChatId);
          break;
        
        case "words_to_review":
          await handleWordsToReviewCommand(supabase, TELEGRAM_BOT_TOKEN, callbackChatId);
          break;
        
        case "my_streak":
          await handleStreakCommand(supabase, TELEGRAM_BOT_TOKEN, callbackChatId);
          break;

        case "my_rank":
          await handleRankCommand(supabase, TELEGRAM_BOT_TOKEN, callbackChatId);
          break;
        
        case "help":
          await sendHelpMessage(TELEGRAM_BOT_TOKEN, callbackChatId);
          break;

        case "settings":
          await sendSettingsMenu(supabase, TELEGRAM_BOT_TOKEN, callbackChatId);
          break;

        case "notif_on":
          await handleToggleNotifications(supabase, TELEGRAM_BOT_TOKEN, callbackChatId, true);
          break;

        case "notif_off":
          await handleToggleNotifications(supabase, TELEGRAM_BOT_TOKEN, callbackChatId, false);
          break;

        case "set_time":
          await sendTimeSettingsInfo(TELEGRAM_BOT_TOKEN, callbackChatId);
          break;

        case "time_06:00":
        case "time_08:00":
        case "time_09:00":
        case "time_12:00":
        case "time_18:00":
        case "time_21:00":
          const time = callbackData.replace("time_", "");
          await handleSetReminderTime(supabase, TELEGRAM_BOT_TOKEN, callbackChatId, time);
          break;

        case "weekly_report":
          await handleWeeklyReport(supabase, TELEGRAM_BOT_TOKEN, callbackChatId);
          break;

        case "back_to_menu":
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            callbackChatId,
            "📋 <b>Asosiy menyu</b>",
            getMainMenuKeyboard()
          );
          break;
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle /start command with deep link
    if (update.message?.text?.startsWith("/start")) {
      const text = update.message.text;
      
      // Extract deep link parameter (user_id:timestamp encoded in base64)
      const parts = text.split(" ");
      if (parts.length > 1) {
        const linkToken = parts[1];
        try {
          const decoded = atob(linkToken);
          const [userId, timestamp] = decoded.split(":");
          
          if (userId) {
            // Link this Telegram chat to the user profile
            const { error } = await supabase
              .from("profiles")
              .update({
                telegram_chat_id: chatId,
                telegram_username: username,
                telegram_connected_at: new Date().toISOString(),
              })
              .eq("user_id", userId);

            if (error) {
              console.error("Error linking Telegram:", error);
              await sendTelegramMessage(
                TELEGRAM_BOT_TOKEN,
                chatId,
                "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
              );
            } else {
              // Create notification settings if not exists
              await supabase
                .from("notification_settings")
                .upsert({
                  user_id: userId,
                  telegram_enabled: true,
                }, { onConflict: "user_id" });

              await sendTelegramMessage(
                TELEGRAM_BOT_TOKEN,
                chatId,
                "✅ <b>Muvaffaqiyatli ulandi!</b>\n\n" +
                "Endi siz so'zlarni takrorlash eslatmalarini shu yerda olasiz.\n\n" +
                "📱 Ilovani ochish yoki buyruqlarni ko'rish uchun quyidagi tugmalardan foydalaning:",
                getMainMenuKeyboard()
              );
            }
          }
        } catch (e) {
          console.error("Error parsing deep link:", e);
          await sendWelcomeMessage(TELEGRAM_BOT_TOKEN, chatId);
        }
      } else {
        // No deep link - just a regular /start
        await sendWelcomeMessage(TELEGRAM_BOT_TOKEN, chatId);
      }
    }

    // Handle /menu command
    if (update.message?.text === "/menu") {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        "📋 <b>Asosiy menyu</b>\n\nQuyidagi tugmalardan birini tanlang:",
        getMainMenuKeyboard()
      );
    }

    // Handle /help command
    if (update.message?.text === "/help") {
      await sendHelpMessage(TELEGRAM_BOT_TOKEN, chatId);
    }

    // Handle /status command
    if (update.message?.text === "/status") {
      await handleStatusCommand(supabase, TELEGRAM_BOT_TOKEN, chatId);
    }

    // Handle /stats command
    if (update.message?.text === "/stats") {
      await handleStatsCommand(supabase, TELEGRAM_BOT_TOKEN, chatId);
    }

    // Handle /review command
    if (update.message?.text === "/review") {
      await handleWordsToReviewCommand(supabase, TELEGRAM_BOT_TOKEN, chatId);
    }

    // Handle /streak command
    if (update.message?.text === "/streak") {
      await handleStreakCommand(supabase, TELEGRAM_BOT_TOKEN, chatId);
    }

    // Handle /rank command
    if (update.message?.text === "/rank") {
      await handleRankCommand(supabase, TELEGRAM_BOT_TOKEN, chatId);
    }

    // Handle /app command
    if (update.message?.text === "/app") {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        "📱 <b>Leitner App</b>\n\nIlovani ochish uchun quyidagi tugmani bosing:",
        getWebAppButton()
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
      [
        { text: "📊 Statistika", callback_data: "my_stats" },
        { text: "🔥 Streak", callback_data: "my_streak" },
      ],
      [
        { text: "📚 Takrorlash", callback_data: "words_to_review" },
        { text: "🏆 Reyting", callback_data: "my_rank" },
      ],
      [
        { text: "⚙️ Sozlamalar", callback_data: "settings" },
        { text: "❓ Yordam", callback_data: "help" },
      ],
    ],
  };
}

function getSettingsKeyboard(notificationsEnabled: boolean, currentTime?: string) {
  return {
    inline_keyboard: [
      [
        notificationsEnabled 
          ? { text: "🔔 Bildirishnoma: Yoqilgan ✅", callback_data: "notif_off" }
          : { text: "🔕 Bildirishnoma: O'chirilgan ❌", callback_data: "notif_on" }
      ],
      [{ text: `⏰ Eslatma vaqti: ${currentTime || '09:00'}`, callback_data: "set_time" }],
      [
        { text: "🌅 06:00", callback_data: "time_06:00" },
        { text: "🌄 08:00", callback_data: "time_08:00" },
        { text: "🌅 09:00", callback_data: "time_09:00" },
      ],
      [
        { text: "☀️ 12:00", callback_data: "time_12:00" },
        { text: "🌆 18:00", callback_data: "time_18:00" },
        { text: "🌙 21:00", callback_data: "time_21:00" },
      ],
      [{ text: "📊 Haftalik hisobot", callback_data: "weekly_report" }],
      [{ text: "⬅️ Orqaga", callback_data: "back_to_menu" }],
    ],
  };
}

function getWebAppButton() {
  return {
    inline_keyboard: [
      [{ text: "📱 Leitner App'ni ochish", web_app: { url: WEBAPP_URL } }],
    ],
  };
}

async function sendWelcomeMessage(token: string, chatId: number) {
  await sendTelegramMessage(
    token,
    chatId,
    "👋 <b>Salom! Leitner App botiga xush kelibsiz!</b>\n\n" +
    "🎓 Bu bot orqali:\n" +
    "• So'zlarni takrorlash eslatmalarini olasiz\n" +
    "• Statistikangizni ko'rasiz\n" +
    "• Ilovani to'g'ridan-to'g'ri ochasiz\n\n" +
    "📱 <b>Ilovadan botni ulash uchun:</b>\n" +
    "Profil → Telegram → Ulash tugmasini bosing\n\n" +
    "Yoki hoziroq ilovani oching:",
    getMainMenuKeyboard()
  );
}

async function sendHelpMessage(token: string, chatId: number) {
  await sendTelegramMessage(
    token,
    chatId,
    "📚 <b>Leitner App Bot - Yordam</b>\n\n" +
    "Bu bot sizga so'zlarni takrorlash vaqti kelganda eslatma yuboradi.\n\n" +
    "<b>Buyruqlar:</b>\n" +
    "/start - Botni ishga tushirish\n" +
    "/menu - Asosiy menyuni ko'rsatish\n" +
    "/app - Ilovani ochish\n" +
    "/stats - Statistikani ko'rish\n" +
    "/review - Takrorlash kerak so'zlar\n" +
    "/streak - Streak ma'lumotlari\n" +
    "/rank - Reytingdagi o'rningiz\n" +
    "/status - Ulanish holatini tekshirish\n" +
    "/help - Yordam\n\n" +
    "❓ Savollar uchun: Ilovadagi Sozlamalar bo'limiga o'ting",
    getMainMenuKeyboard()
  );
}

async function handleStatusCommand(supabase: any, token: string, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (profile) {
    await sendTelegramMessage(
      token,
      chatId,
      `✅ <b>Hisob ulangan!</b>\n\n👤 ${profile.full_name || "Foydalanuvchi"}\n\n📱 Eslatmalar faol`,
      getMainMenuKeyboard()
    );
  } else {
    await sendTelegramMessage(
      token,
      chatId,
      "❌ <b>Hisob ulanmagan.</b>\n\n📱 Ilovadan botni ulash uchun:\nProfil → Telegram → Ulash",
      getWebAppButton()
    );
  }
}

async function handleStatsCommand(supabase: any, token: string, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level, streak, total_words, learned_words, today_reviewed, today_correct")
    .eq("user_id", profile.user_id);

  if (!stats || stats.length === 0) {
    await sendTelegramMessage(token, chatId, "📊 Hali statistika yo'q. So'z qo'shishni boshlang!");
    return;
  }

  const totalXp = stats.reduce((sum: number, s: any) => sum + (s.xp || 0), 0);
  const maxLevel = Math.max(...stats.map((s: any) => s.level || 1));
  const maxStreak = Math.max(...stats.map((s: any) => s.streak || 0));
  const totalWords = stats.reduce((sum: number, s: any) => sum + (s.total_words || 0), 0);
  const learnedWords = stats.reduce((sum: number, s: any) => sum + (s.learned_words || 0), 0);
  const todayReviewed = stats.reduce((sum: number, s: any) => sum + (s.today_reviewed || 0), 0);
  const todayCorrect = stats.reduce((sum: number, s: any) => sum + (s.today_correct || 0), 0);

  await sendTelegramMessage(
    token,
    chatId,
    `📊 <b>Sizning statistikangiz</b>\n\n` +
    `⭐ Daraja: ${maxLevel}\n` +
    `💎 XP: ${totalXp.toLocaleString()}\n` +
    `🔥 Streak: ${maxStreak} kun\n\n` +
    `📚 Jami so'zlar: ${totalWords}\n` +
    `✅ O'rganilgan: ${learnedWords}\n\n` +
    `📅 Bugun takrorlangan: ${todayReviewed}\n` +
    `🎯 Bugun to'g'ri: ${todayCorrect}`,
    getMainMenuKeyboard()
  );
}

async function handleWordsToReviewCommand(supabase: any, token: string, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const now = new Date().toISOString();
  const { data: words, error } = await supabase
    .from("words")
    .select("id")
    .eq("user_id", profile.user_id)
    .lte("next_review_time", now);

  const count = words?.length || 0;

  await sendTelegramMessage(
    token,
    chatId,
    count > 0
      ? `📚 <b>Takrorlash kerak:</b> ${count} ta so'z\n\nHoziroq boshlang!`
      : "🎉 <b>Ajoyib!</b> Hozircha takrorlash kerak so'z yo'q!",
    getWebAppButton()
  );
}

async function handleStreakCommand(supabase: any, token: string, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { data: stats } = await supabase
    .from("user_stats")
    .select("streak, last_active_date")
    .eq("user_id", profile.user_id);

  const maxStreak = stats?.reduce((max: number, s: any) => Math.max(max, s.streak || 0), 0) || 0;
  const lastActive = stats?.[0]?.last_active_date;

  let message = `🔥 <b>Sizning streak:</b> ${maxStreak} kun\n\n`;
  
  if (maxStreak === 0) {
    message += "Har kuni o'rganib streak'ingizni oshiring!";
  } else if (maxStreak < 7) {
    message += "Yaxshi boshladingiz! Davom eting! 💪";
  } else if (maxStreak < 30) {
    message += "Zo'r natija! Siz muntazamsiz! 🌟";
  } else if (maxStreak < 100) {
    message += "Ajoyib! Siz haqiqiy o'rganuvchisiz! 🏆";
  } else {
    message += "Incredibleeee! Siz chempionsiz! 👑";
  }

  await sendTelegramMessage(token, chatId, message, getMainMenuKeyboard());
}

async function handleRankCommand(supabase: any, token: string, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  // Get all users' XP
  const { data: allStats } = await supabase
    .from("user_stats")
    .select("user_id, xp");

  // Aggregate by user
  const userXpMap = new Map<string, number>();
  for (const stat of allStats || []) {
    const existing = userXpMap.get(stat.user_id) || 0;
    userXpMap.set(stat.user_id, existing + (stat.xp || 0));
  }

  // Sort by XP
  const sorted = Array.from(userXpMap.entries()).sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([userId]) => userId === profile.user_id) + 1;
  const myXp = userXpMap.get(profile.user_id) || 0;
  const totalUsers = sorted.length;

  let emoji = "📊";
  if (rank === 1) emoji = "👑";
  else if (rank === 2) emoji = "🥈";
  else if (rank === 3) emoji = "🥉";
  else if (rank <= 10) emoji = "🏆";

  await sendTelegramMessage(
    token,
    chatId,
    `${emoji} <b>Reytingdagi o'rningiz</b>\n\n` +
    `🏅 O'rin: <b>#${rank}</b> / ${totalUsers}\n` +
    `💎 XP: ${myXp.toLocaleString()}\n\n` +
    (rank === 1 ? "🎉 Siz birinchi o'rindasiz! Davom eting!" : 
     rank <= 3 ? "🌟 Zo'r natija! Top 3 dasiz!" :
     rank <= 10 ? "💪 Top 10 ichida! Yaxshi ish!" :
     "📈 Ko'proq XP yig'ing va yuqoriga ko'taring!"),
    getMainMenuKeyboard()
  );
}

async function sendTelegramMessage(
  token: string, 
  chatId: number, 
  text: string, 
  replyMarkup?: any
) {
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    console.error("Error sending Telegram message:", await response.text());
  }
  
  return response;
}

async function answerCallbackQuery(token: string, callbackQueryId: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
    }),
  });
}

async function sendSettingsMenu(supabase: any, token: string, chatId: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("telegram_enabled, daily_reminder_time")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const notificationsEnabled = settings?.telegram_enabled || false;
  const currentTime = settings?.daily_reminder_time?.slice(0, 5) || "09:00";

  await sendTelegramMessage(
    token,
    chatId,
    "⚙️ <b>Sozlamalar</b>\n\n" +
    "Quyidagi sozlamalarni o'zgartirishingiz mumkin:",
    getSettingsKeyboard(notificationsEnabled, currentTime)
  );
}

async function handleToggleNotifications(
  supabase: any, 
  token: string, 
  chatId: number, 
  enabled: boolean
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { error } = await supabase
    .from("notification_settings")
    .upsert({
      user_id: profile.user_id,
      telegram_enabled: enabled,
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Error updating notification settings:", error);
    await sendTelegramMessage(token, chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    return;
  }

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("daily_reminder_time")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const currentTime = settings?.daily_reminder_time?.slice(0, 5) || "09:00";

  const message = enabled
    ? "🔔 <b>Bildirishnomalar yoqildi!</b>\n\nEndi siz so'zlarni takrorlash eslatmalarini olasiz."
    : "🔕 <b>Bildirishnomalar o'chirildi.</b>\n\nBildirishnomalar yuborilmaydi.";

  await sendTelegramMessage(
    token,
    chatId,
    message,
    getSettingsKeyboard(enabled, currentTime)
  );
}

async function sendTimeSettingsInfo(token: string, chatId: number) {
  await sendTelegramMessage(
    token,
    chatId,
    "⏰ <b>Eslatma vaqtini tanlang</b>\n\n" +
    "Quyidagi vaqtlardan birini tanlang. Har kuni shu vaqtda eslatma olasiz:",
  );
}

async function handleSetReminderTime(
  supabase: any,
  token: string,
  chatId: number,
  time: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { error } = await supabase
    .from("notification_settings")
    .upsert({
      user_id: profile.user_id,
      daily_reminder_time: time,
      telegram_enabled: true,
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Error setting reminder time:", error);
    await sendTelegramMessage(token, chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    return;
  }

  await sendTelegramMessage(
    token,
    chatId,
    `✅ <b>Eslatma vaqti o'zgartirildi!</b>\n\n` +
    `⏰ Yangi vaqt: <b>${time}</b>\n\n` +
    `Har kuni shu vaqtda eslatma olasiz.`,
    getSettingsKeyboard(true, time)
  );
}

async function handleWeeklyReport(
  supabase: any,
  token: string,
  chatId: number
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  // Get stats from the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const startDate = oneWeekAgo.toISOString().split('T')[0];

  const { data: dailyStats } = await supabase
    .from("daily_stats")
    .select("date, words_reviewed, words_correct, xp_earned")
    .eq("user_id", profile.user_id)
    .gte("date", startDate)
    .order("date", { ascending: true });

  // Get current user stats
  const { data: userStats } = await supabase
    .from("user_stats")
    .select("xp, level, streak, total_words, learned_words")
    .eq("user_id", profile.user_id);

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

  // Generate progress bar
  const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;
  const progressBar = generateProgressBar(progressPercent);

  // Day breakdown with emojis
  const dayEmojis = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
  let weekBreakdown = "";
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStat = dailyStats?.find((s: any) => s.date === dateStr);
    const dayIndex = date.getDay();
    const emoji = (dayStat?.words_reviewed || 0) > 0 ? "🟢" : "⚪️";
    weekBreakdown += `${emoji} `;
  }

  const reportMessage = 
    `📊 <b>Haftalik Hisobot</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>${profile.full_name || 'Foydalanuvchi'}</b>\n\n` +
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

  await sendTelegramMessage(token, chatId, reportMessage, getMainMenuKeyboard());
}

function generateProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return "▓".repeat(filled) + "░".repeat(empty);
}
