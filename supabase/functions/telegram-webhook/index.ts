import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBAPP_URL = "https://leitner.lovable.app";

// Cache for user profiles to reduce DB calls
const profileCache = new Map<number, { userId: string; fullName: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Quiz session cache
const quizCache = new Map<number, { wordId: string; correctAnswer: string; options: string[]; expires: number }>();
const QUIZ_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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
    const update = await req.json();
    
    // Handle inline queries (for sharing words)
    if (update.inline_query) {
      await handleInlineQuery(supabase, TELEGRAM_BOT_TOKEN, update.inline_query);
      return quickResponse();
    }

    // Handle chosen inline result
    if (update.chosen_inline_result) {
      console.log("Inline result chosen:", update.chosen_inline_result.result_id);
      return quickResponse();
    }

    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const messageText = update.message?.text || "";

    // Handle callback queries with early return
    if (update.callback_query) {
      await handleCallbackQuery(supabase, TELEGRAM_BOT_TOKEN, update.callback_query);
      return quickResponse();
    }

    // Handle text commands
    if (update.message?.text) {
      await handleTextCommand(supabase, TELEGRAM_BOT_TOKEN, chatId, messageText, update.message);
    }

    console.log(`Request processed in ${Date.now() - startTime}ms`);
    return quickResponse();
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function quickResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============ INLINE QUERY HANDLER ============
async function handleInlineQuery(supabase: any, token: string, inlineQuery: any) {
  const queryId = inlineQuery.id;
  const query = inlineQuery.query.trim().toLowerCase();
  const fromId = inlineQuery.from.id;

  // Get user profile from cache or DB
  const profile = await getCachedProfile(supabase, fromId);
  
  if (!profile) {
    await answerInlineQuery(token, queryId, [{
      type: "article",
      id: "not_connected",
      title: "❌ Hisob ulanmagan",
      description: "Avval botni hisobingizga ulang",
      input_message_content: {
        message_text: "❌ Leitner App hisobiga ulanmagan. @Leitner_robot ga /start yuboring.",
      },
    }]);
    return;
  }

  // Search user's words
  let wordsQuery = supabase
    .from("words")
    .select("id, original_word, translated_word, source_language, target_language, box_number")
    .eq("user_id", profile.userId)
    .limit(20);

  if (query.length > 0) {
    wordsQuery = wordsQuery.or(`original_word.ilike.%${query}%,translated_word.ilike.%${query}%`);
  }

  const { data: words } = await wordsQuery;

  if (!words || words.length === 0) {
    await answerInlineQuery(token, queryId, [{
      type: "article",
      id: "no_words",
      title: "📭 So'z topilmadi",
      description: query ? `"${query}" bo'yicha so'z topilmadi` : "Siz hali so'z qo'shmagansiz",
      input_message_content: {
        message_text: "📱 Leitner App - So'z o'rganish ilovasi\n\n" + WEBAPP_URL,
      },
    }]);
    return;
  }

  const results = words.map((word: any, index: number) => ({
    type: "article",
    id: `word_${word.id}_${index}`,
    title: `${word.original_word} → ${word.translated_word}`,
    description: `📦 Box ${word.box_number} | ${getLanguageEmoji(word.source_language)} → ${getLanguageEmoji(word.target_language)}`,
    input_message_content: {
      message_text: 
        `📚 <b>Leitner App - So'z</b>\n\n` +
        `${getLanguageEmoji(word.source_language)} <b>${word.original_word}</b>\n` +
        `${getLanguageEmoji(word.target_language)} ${word.translated_word}\n\n` +
        `📦 Box: ${word.box_number}/5\n\n` +
        `🎓 O'rganish uchun: ${WEBAPP_URL}`,
      parse_mode: "HTML",
    },
  }));

  await answerInlineQuery(token, queryId, results);
}

// ============ CALLBACK QUERY HANDLER ============
async function handleCallbackQuery(supabase: any, token: string, callbackQuery: any) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  // Answer immediately to remove loading
  answerCallbackQuery(token, callbackQuery.id);

  // Handle time settings
  if (data.startsWith("time_")) {
    const time = data.replace("time_", "");
    await handleSetReminderTime(supabase, token, chatId, time);
    return;
  }

  // Handle quiz answer
  if (data.startsWith("quiz_")) {
    await handleQuizAnswer(supabase, token, chatId, messageId, data);
    return;
  }

  // Use switch for other callbacks
  const handlers: Record<string, () => Promise<void>> = {
    "open_app": async () => { await sendMessage(token, chatId, "📱 <b>Ilovani ochish</b>", getWebAppButton()); },
    "my_stats": () => handleStatsCommand(supabase, token, chatId),
    "words_to_review": () => handleWordsToReviewCommand(supabase, token, chatId),
    "my_streak": () => handleStreakCommand(supabase, token, chatId),
    "my_rank": () => handleRankCommand(supabase, token, chatId),
    "help": () => sendHelpMessage(token, chatId),
    "settings": () => sendSettingsMenu(supabase, token, chatId),
    "notif_on": () => handleToggleNotifications(supabase, token, chatId, true),
    "notif_off": () => handleToggleNotifications(supabase, token, chatId, false),
    "set_time": () => sendTimeSettingsInfo(token, chatId),
    "weekly_report": () => handleWeeklyReport(supabase, token, chatId),
    "challenge": () => handleChallengeCommand(supabase, token, chatId),
    "join_challenge": () => handleJoinChallenge(supabase, token, chatId),
    "back_to_menu": async () => { await sendMessage(token, chatId, "📋 <b>Asosiy menyu</b>", getMainMenuKeyboard()); },
    "check_channels": () => handleCheckChannels(supabase, token, chatId),
    "contest": () => handleContestCommand(supabase, token, chatId),
    "join_contest": () => handleJoinContest(supabase, token, chatId),
    "my_contest_stats": () => handleMyContestStats(supabase, token, chatId),
    "quiz": () => handleQuizCommand(supabase, token, chatId),
    "quiz_next": () => sendQuizQuestion(supabase, token, chatId),
    "quiz_stop": () => handleQuizStop(supabase, token, chatId),
  };

  const handler = handlers[data];
  if (handler) await handler();
}

// Handle channel check callback
async function handleCheckChannels(supabase: any, token: string, chatId: number) {
  const channelsOk = await checkRequiredChannels(supabase, token, chatId);
  if (channelsOk) {
    await sendWelcomeMessage(token, chatId);
  }
}

// ============ TEXT COMMAND HANDLER ============
async function handleTextCommand(supabase: any, token: string, chatId: number, text: string, message: any) {
  const username = message.from?.username;

  // Handle /add command
  if (text.startsWith("/add ") || text.startsWith("/add\n")) {
    await handleAddWordCommand(supabase, token, chatId, text.slice(5).trim());
    return;
  }

  // Simple command routing
  const commands: Record<string, () => Promise<void>> = {
    "/start": () => handleStartCommand(supabase, token, chatId, text, username),
    "/menu": async () => { await sendMessage(token, chatId, "📋 <b>Asosiy menyu</b>", getMainMenuKeyboard()); },
    "/help": () => sendHelpMessage(token, chatId),
    "/status": () => handleStatusCommand(supabase, token, chatId),
    "/stats": () => handleStatsCommand(supabase, token, chatId),
    "/review": () => handleWordsToReviewCommand(supabase, token, chatId),
    "/streak": () => handleStreakCommand(supabase, token, chatId),
    "/rank": () => handleRankCommand(supabase, token, chatId),
    "/challenge": () => handleChallengeCommand(supabase, token, chatId),
    "/contest": () => handleContestCommand(supabase, token, chatId),
    "/konkurs": () => handleContestCommand(supabase, token, chatId),
    "/quiz": () => handleQuizCommand(supabase, token, chatId),
    "/app": async () => { await sendMessage(token, chatId, "📱 <b>Leitner App</b>", getWebAppButton()); },
  };

  // Check for exact match or command with bot username
  for (const [cmd, handler] of Object.entries(commands)) {
    if (text === cmd || text.startsWith(cmd + " ") || text.startsWith(cmd + "@")) {
      await handler();
      return;
    }
  }
}

// ============ QUIZ HANDLERS ============

async function handleQuizCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!\n\nProfil → Telegram → Ulash", getWebAppButton());
    return;
  }

  // Get user's word count
  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.userId);

  if (!count || count < 4) {
    await sendMessage(
      token, chatId,
      "❌ <b>So'z kam!</b>\n\n" +
      `Sizda ${count || 0} ta so'z bor.\n` +
      "Quiz uchun kamida 4 ta so'z kerak.\n\n" +
      "📱 Ilovada so'z qo'shing yoki:\n" +
      "<code>/add so'z - tarjima</code>",
      getWebAppButton()
    );
    return;
  }

  // Get words to review count
  const { count: reviewCount } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.userId)
    .lte("next_review_time", new Date().toISOString());

  await sendMessage(
    token, chatId,
    `🎯 <b>Quiz Mode</b>\n\n` +
    `📚 Jami so'zlar: ${count}\n` +
    `📖 Takrorlash kerak: ${reviewCount || 0}\n\n` +
    `Quiz boshlash uchun tugmani bosing!`,
    {
      inline_keyboard: [
        [{ text: "🎯 Quiz boshlash", callback_data: "quiz_next" }],
        [{ text: "⬅️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function sendQuizQuestion(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  // Get user's language
  const { data: userLang } = await supabase
    .from("user_languages")
    .select("id")
    .eq("user_id", profile.userId)
    .limit(1)
    .maybeSingle();

  if (!userLang) {
    await sendMessage(token, chatId, "❌ Avval ilovada til tanlang!", getWebAppButton());
    return;
  }

  // Get words to review first, then random words
  const { data: wordsToReview } = await supabase
    .from("words")
    .select("id, original_word, translated_word, box_number")
    .eq("user_id", profile.userId)
    .lte("next_review_time", new Date().toISOString())
    .order("next_review_time", { ascending: true })
    .limit(10);

  // Get random words for options
  const { data: allWords } = await supabase
    .from("words")
    .select("id, original_word, translated_word")
    .eq("user_id", profile.userId)
    .limit(50);

  if (!allWords || allWords.length < 4) {
    await sendMessage(token, chatId, "❌ So'zlar yetarli emas. Kamida 4 ta so'z kerak.", getMainMenuKeyboard());
    return;
  }

  // Pick the word to quiz (prioritize words to review)
  let targetWord;
  if (wordsToReview && wordsToReview.length > 0) {
    targetWord = wordsToReview[Math.floor(Math.random() * wordsToReview.length)];
  } else {
    targetWord = allWords[Math.floor(Math.random() * allWords.length)];
  }

  // Generate wrong options
  const wrongWords = allWords
    .filter((w: any) => w.id !== targetWord.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options = [
    { text: targetWord.translated_word, isCorrect: true },
    ...wrongWords.map((w: any) => ({ text: w.translated_word, isCorrect: false }))
  ].sort(() => Math.random() - 0.5);

  // Cache the quiz for verification
  quizCache.set(chatId, {
    wordId: targetWord.id,
    correctAnswer: targetWord.translated_word,
    options: options.map(o => o.text),
    expires: Date.now() + QUIZ_CACHE_TTL,
  });

  const boxEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][targetWord.box_number - 1] || "📦";

  await sendMessage(
    token, chatId,
    `🎯 <b>So'zni toping:</b>\n\n` +
    `📝 <b>${targetWord.original_word}</b>\n\n` +
    `${boxEmoji} Box ${targetWord.box_number}`,
    {
      inline_keyboard: [
        ...options.map((opt, i) => [
          { text: `${["A", "B", "C", "D"][i]}. ${opt.text}`, callback_data: `quiz_${i}_${opt.isCorrect ? "1" : "0"}` }
        ]),
        [
          { text: "⏭ O'tkazish", callback_data: "quiz_next" },
          { text: "🛑 Tugatish", callback_data: "quiz_stop" }
        ],
      ],
    }
  );
}

async function handleQuizAnswer(supabase: any, token: string, chatId: number, messageId: number, data: string) {
  const parts = data.split("_");
  const optionIndex = parseInt(parts[1]);
  const isCorrect = parts[2] === "1";
  
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) return;

  const cached = quizCache.get(chatId);
  if (!cached || cached.expires < Date.now()) {
    await sendMessage(token, chatId, "⏰ Quiz vaqti tugadi. Qaytadan boshlang.", {
      inline_keyboard: [[{ text: "🎯 Qayta boshlash", callback_data: "quiz" }]]
    });
    return;
  }

  const selectedAnswer = cached.options[optionIndex];
  const correctAnswer = cached.correctAnswer;

  // Get user's language
  const { data: userLang } = await supabase
    .from("user_languages")
    .select("id")
    .eq("user_id", profile.userId)
    .limit(1)
    .maybeSingle();

  if (!userLang) return;

  // Update word stats
  if (isCorrect) {
    // Move to next box (max 5)
    const { data: word } = await supabase
      .from("words")
      .select("box_number")
      .eq("id", cached.wordId)
      .maybeSingle();

    const currentBox = word?.box_number || 1;
    const newBox = Math.min(currentBox + 1, 5);
    
    // Calculate next review time based on box
    const reviewIntervals = [1, 3, 7, 14, 30]; // days
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + reviewIntervals[newBox - 1]);

    await supabase
      .from("words")
      .update({
        box_number: newBox,
        times_correct: supabase.rpc("increment"),
        times_reviewed: supabase.rpc("increment"),
        last_reviewed: new Date().toISOString(),
        next_review_time: nextReview.toISOString(),
      })
      .eq("id", cached.wordId);

    // Update user stats
    await supabase
      .from("user_stats")
      .update({
        today_reviewed: supabase.rpc("increment"),
        today_correct: supabase.rpc("increment"),
      })
      .eq("user_id", profile.userId)
      .eq("user_language_id", userLang.id);

  } else {
    // Move to box 1
    await supabase
      .from("words")
      .update({
        box_number: 1,
        times_incorrect: supabase.rpc("increment"),
        times_reviewed: supabase.rpc("increment"),
        last_reviewed: new Date().toISOString(),
        next_review_time: new Date().toISOString(),
      })
      .eq("id", cached.wordId);

    await supabase
      .from("user_stats")
      .update({
        today_reviewed: supabase.rpc("increment"),
      })
      .eq("user_id", profile.userId)
      .eq("user_language_id", userLang.id);
  }

  // Clear quiz cache
  quizCache.delete(chatId);

  // Edit message to show result
  const resultMessage = isCorrect
    ? `✅ <b>To'g'ri!</b>\n\n📝 ${correctAnswer}`
    : `❌ <b>Noto'g'ri!</b>\n\n` +
      `Siz: ${selectedAnswer}\n` +
      `✅ To'g'ri: <b>${correctAnswer}</b>`;

  await editMessage(token, chatId, messageId, resultMessage, {
    inline_keyboard: [
      [{ text: "➡️ Keyingi savol", callback_data: "quiz_next" }],
      [{ text: "🛑 Tugatish", callback_data: "quiz_stop" }],
    ],
  });
}

async function handleQuizStop(supabase: any, token: string, chatId: number) {
  quizCache.delete(chatId);
  
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "Quiz tugatildi!", getMainMenuKeyboard());
    return;
  }

  // Get today's stats
  const { data: stats } = await supabase
    .from("user_stats")
    .select("today_reviewed, today_correct")
    .eq("user_id", profile.userId);

  const todayReviewed = stats?.reduce((sum: number, s: any) => sum + (s.today_reviewed || 0), 0) || 0;
  const todayCorrect = stats?.reduce((sum: number, s: any) => sum + (s.today_correct || 0), 0) || 0;
  const accuracy = todayReviewed > 0 ? Math.round((todayCorrect / todayReviewed) * 100) : 0;

  await sendMessage(
    token, chatId,
    `🎉 <b>Quiz tugatildi!</b>\n\n` +
    `📊 <b>Bugungi natijalar:</b>\n` +
    `• Takrorlangan: ${todayReviewed} ta\n` +
    `• To'g'ri: ${todayCorrect} ta\n` +
    `• Aniqlik: ${accuracy}%\n\n` +
    `Ajoyib ish! Davom eting! 💪`,
    getMainMenuKeyboard()
  );
}

// ============ COMMAND HANDLERS ============

async function handleStartCommand(supabase: any, token: string, chatId: number, text: string, username?: string) {
  const parts = text.split(" ");
  
  if (parts.length > 1) {
    const param = parts[1];
    
    // Check if it's a contest referral link (starts with cref_)
    if (param.startsWith("cref_")) {
      const [contestShortId, referrerUserId] = param.replace("cref_", "").split("_");
      await handleContestReferral(supabase, token, chatId, contestShortId, referrerUserId, username);
      return;
    }
    
    // Check if it's a referral link (starts with ref_)
    if (param.startsWith("ref_")) {
      const refCode = param.replace("ref_", "");
      await trackReferralVisit(supabase, refCode, chatId, username);
    }
    
    // Check if it's a user connection link (base64 encoded)
    try {
      const decoded = atob(param);
      const [userId] = decoded.split(":");
      
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            telegram_chat_id: chatId,
            telegram_username: username,
            telegram_connected_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        await supabase
          .from("notification_settings")
          .upsert({ user_id: userId, telegram_enabled: true }, { onConflict: "user_id" });

        // Clear cache
        profileCache.delete(chatId);

        await sendMessage(
          token, chatId,
          "✅ <b>Muvaffaqiyatli ulandi!</b>\n\n" +
          "Endi siz eslatmalar olasiz va bot orqali so'z qo'shishingiz mumkin.\n\n" +
          "💡 <b>Foydali:</b>\n" +
          "• /add so'z - tarjima - tezkor so'z qo'shish\n" +
          "• /quiz - so'z takrorlash\n" +
          "• @Leitner_robot yozing - so'zlarni ulashing\n" +
          "• /challenge - haftalik musobaqaga qo'shiling\n" +
          "• /contest - konkursda qatnashing",
          getMainMenuKeyboard()
        );
        return;
      }
    } catch (e) {
      console.log("Param parsing:", e);
    }
  }

  // Check for required channels before showing welcome
  const channelsCheck = await checkRequiredChannels(supabase, token, chatId);
  if (!channelsCheck) {
    return; // User needs to join channels first
  }

  await sendWelcomeMessage(token, chatId);
}

// Handle contest referral
async function handleContestReferral(supabase: any, token: string, chatId: number, contestShortId: string, referrerUserId: string, username?: string) {
  try {
    // Find the contest
    const { data: contest } = await supabase
      .from("contests")
      .select("id, title, image_url, is_active, end_date")
      .ilike("id", `${contestShortId}%`)
      .eq("is_active", true)
      .gt("end_date", new Date().toISOString())
      .maybeSingle();

    if (!contest) {
      await sendMessage(token, chatId, "❌ Konkurs topilmadi yoki tugagan.", getMainMenuKeyboard());
      return;
    }

    // Check if this user already exists in the system
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (existingProfile) {
      // User already registered, just show contest info
      await handleContestCommand(supabase, token, chatId);
      return;
    }

    // Send contest info with image if available
    const message =
      `🏆 <b>${contest.title}</b>\n\n` +
      `Siz konkursga taklif qilindingiz!\n\n` +
      `Qatnashish uchun:\n` +
      `1️⃣ Ilovada ro'yxatdan o'ting\n` +
      `2️⃣ Profildan Telegramni ulang\n` +
      `3️⃣ Kamida 1 ta so'z qo'shing\n\n` +
      `Shundan so'ng siz konkurs ishtirokchisi bo'lasiz!`;

    if (contest.image_url) {
      await sendPhoto(token, chatId, contest.image_url, message, {
        inline_keyboard: [
          [{ text: "📱 Ro'yxatdan o'tish", web_app: { url: WEBAPP_URL } }],
          [{ text: "🏆 Konkurs haqida", callback_data: "contest" }],
        ],
      });
    } else {
      await sendMessage(token, chatId, message, {
        inline_keyboard: [
          [{ text: "📱 Ro'yxatdan o'tish", web_app: { url: WEBAPP_URL } }],
          [{ text: "🏆 Konkurs haqida", callback_data: "contest" }],
        ],
      });
    }
  } catch (e) {
    console.error("Contest referral error:", e);
    await sendWelcomeMessage(token, chatId);
  }
}

// Track referral visit
async function trackReferralVisit(supabase: any, refCode: string, chatId: number, username?: string) {
  try {
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, is_active")
      .eq("code", refCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!referral) {
      console.log(`Referral not found or inactive: ${refCode}`);
      return;
    }

    await supabase.from("referral_visits").insert({
      referral_id: referral.id,
      ip_hash: String(chatId),
      user_agent: username || "telegram",
    });

    console.log(`Referral visit tracked: ${refCode}`);
  } catch (e) {
    console.error("Track referral error:", e);
  }
}

// Check if user has joined required channels
async function checkRequiredChannels(supabase: any, token: string, chatId: number): Promise<boolean> {
  const { data: channels } = await supabase
    .from("required_channels")
    .select("*")
    .eq("is_active", true);

  if (!channels || channels.length === 0) {
    return true;
  }

  const notJoined: any[] = [];
  
  for (const channel of channels) {
    const isMember = await checkChannelMembership(token, channel.channel_id, chatId);
    if (!isMember) {
      notJoined.push(channel);
    }
  }

  if (notJoined.length > 0) {
    const channelButtons: any[] = notJoined.map((ch: any) => [
      { text: `📢 ${ch.channel_name}`, url: ch.channel_url }
    ]);
    channelButtons.push([{ text: "✅ Tekshirish", callback_data: "check_channels" }]);

    await sendMessage(
      token, chatId,
      "👋 <b>Salom!</b>\n\n" +
      "Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n" +
      notJoined.map((ch: any) => `📢 ${ch.channel_name}`).join("\n"),
      { inline_keyboard: channelButtons }
    );
    return false;
  }

  return true;
}

// Check if user is member of a channel
async function checkChannelMembership(token: string, channelId: string, userId: number): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${channelId}&user_id=${userId}`
    );
    const data = await response.json();
    
    if (data.ok) {
      const status = data.result.status;
      return ["member", "administrator", "creator"].includes(status);
    }
    return false;
  } catch (e) {
    console.error("Check membership error:", e);
    return true;
  }
}

async function handleAddWordCommand(supabase: any, token: string, chatId: number, input: string) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!\n\nProfil → Telegram → Ulash", getWebAppButton());
    return;
  }

  const separators = [" - ", " = ", " : ", "-", "=", ":"];
  let word = "", translation = "";

  for (const sep of separators) {
    if (input.includes(sep)) {
      const parts = input.split(sep);
      if (parts.length >= 2) {
        word = parts[0].trim();
        translation = parts.slice(1).join(sep).trim();
        break;
      }
    }
  }

  if (!word || !translation) {
    await sendMessage(
      token, chatId,
      "❌ <b>Noto'g'ri format</b>\n\n" +
      "To'g'ri format:\n" +
      "<code>/add so'z - tarjima</code>\n\n" +
      "Misol:\n" +
      "<code>/add hello - salom</code>\n" +
      "<code>/add computer - kompyuter</code>"
    );
    return;
  }

  const { data: userLang } = await supabase
    .from("user_languages")
    .select("id, source_language, target_language")
    .eq("user_id", profile.userId)
    .limit(1)
    .maybeSingle();

  if (!userLang) {
    await sendMessage(token, chatId, "❌ Avval ilovada til tanlang!", getWebAppButton());
    return;
  }

  const { data: existing } = await supabase
    .from("words")
    .select("id")
    .eq("user_id", profile.userId)
    .eq("original_word", word.toLowerCase())
    .maybeSingle();

  if (existing) {
    await sendMessage(token, chatId, `⚠️ <b>"${word}"</b> allaqachon mavjud!`);
    return;
  }

  const { error } = await supabase.from("words").insert({
    user_id: profile.userId,
    user_language_id: userLang.id,
    original_word: word,
    translated_word: translation,
    source_language: userLang.source_language,
    target_language: userLang.target_language,
  });

  if (error) {
    console.error("Add word error:", error);
    await sendMessage(token, chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    return;
  }

  await sendMessage(
    token, chatId,
    `✅ <b>So'z qo'shildi!</b>\n\n` +
    `${getLanguageEmoji(userLang.source_language)} <b>${word}</b>\n` +
    `${getLanguageEmoji(userLang.target_language)} ${translation}\n\n` +
    `📦 Box 1 ga joylashtirildi`,
    {
      inline_keyboard: [
        [{ text: "🎯 Quiz boshlash", callback_data: "quiz" }],
        [{ text: "📚 Ilovada o'rganish", web_app: { url: WEBAPP_URL } }],
      ],
    }
  );
}

async function handleChallengeCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { data: challengeId } = await supabase.rpc("get_or_create_weekly_challenge");

  const [challengeResult, participantsResult, userParticipation] = await Promise.all([
    supabase.from("weekly_challenges").select("*").eq("id", challengeId).maybeSingle(),
    supabase
      .from("weekly_challenge_participants")
      .select("user_id, xp_earned, words_reviewed, days_active")
      .eq("challenge_id", challengeId)
      .order("xp_earned", { ascending: false })
      .limit(10),
    supabase
      .from("weekly_challenge_participants")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", profile.userId)
      .maybeSingle(),
  ]);

  const challenge = challengeResult.data;
  const participants = participantsResult.data || [];
  const isJoined = !!userParticipation.data;

  const userIds = participants.map((p: any) => p.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);

  const endDate = new Date(challenge.week_end);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  let leaderboard = "";
  participants.forEach((p: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    const name = profileMap.get(p.user_id) || "Noma'lum";
    const isMe = p.user_id === profile.userId;
    leaderboard += `${medal} ${isMe ? "<b>" : ""}${name}${isMe ? "</b>" : ""} - ${p.xp_earned} XP\n`;
  });

  const message = 
    `🏆 <b>Haftalik Challenge</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📅 ${challenge.week_start} - ${challenge.week_end}\n` +
    `⏰ ${daysLeft} kun qoldi\n` +
    `👥 ${participants.length} ishtirokchi\n\n` +
    `📊 <b>Liderlar:</b>\n` +
    (leaderboard || "Hali ishtirokchilar yo'q\n") +
    `\n` +
    (isJoined 
      ? `✅ Siz qatnashyapsiz!\n💎 Sizning XP: ${userParticipation.data.xp_earned}`
      : `❌ Siz hali qo'shilmagansiz`);

  await sendMessage(token, chatId, message, {
    inline_keyboard: [
      isJoined 
        ? [{ text: "📱 O'ynashni davom ettirish", web_app: { url: WEBAPP_URL } }]
        : [{ text: "🚀 Qo'shilish", callback_data: "join_challenge" }],
      [{ text: "⬅️ Orqaga", callback_data: "back_to_menu" }],
    ],
  });
}

async function handleJoinChallenge(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { data: challengeId } = await supabase.rpc("get_or_create_weekly_challenge");

  const { error } = await supabase
    .from("weekly_challenge_participants")
    .upsert({
      challenge_id: challengeId,
      user_id: profile.userId,
      xp_earned: 0,
      words_reviewed: 0,
      days_active: 0,
    }, { onConflict: "challenge_id,user_id" });

  if (error) {
    console.error("Join challenge error:", error);
    await sendMessage(token, chatId, "❌ Xatolik yuz berdi.");
    return;
  }

  await sendMessage(
    token, chatId,
    "🎉 <b>Challenge'ga qo'shildingiz!</b>\n\n" +
    "Bu hafta eng ko'p XP yig'ing va g'olib bo'ling! 🏆\n\n" +
    "💡 XP yig'ish uchun:\n" +
    "• So'zlarni takrorlang (/quiz)\n" +
    "• Har kuni o'ynang (streak bonus)\n" +
    "• To'g'ri javob bering",
    {
      inline_keyboard: [
        [{ text: "🎯 Quiz boshlash", callback_data: "quiz" }],
        [{ text: "🏆 Reytingni ko'rish", callback_data: "challenge" }],
      ],
    }
  );
}

async function handleStatsCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level, streak, total_words, learned_words, today_reviewed, today_correct")
    .eq("user_id", profile.userId);

  if (!stats?.length) {
    await sendMessage(token, chatId, "📊 Hali statistika yo'q. So'z qo'shishni boshlang!");
    return;
  }

  const totalXp = stats.reduce((sum: number, s: any) => sum + (s.xp || 0), 0);
  const maxLevel = Math.max(...stats.map((s: any) => s.level || 1));
  const maxStreak = Math.max(...stats.map((s: any) => s.streak || 0));
  const totalWords = stats.reduce((sum: number, s: any) => sum + (s.total_words || 0), 0);
  const learnedWords = stats.reduce((sum: number, s: any) => sum + (s.learned_words || 0), 0);
  const todayReviewed = stats.reduce((sum: number, s: any) => sum + (s.today_reviewed || 0), 0);
  const todayCorrect = stats.reduce((sum: number, s: any) => sum + (s.today_correct || 0), 0);

  await sendMessage(
    token, chatId,
    `📊 <b>${profile.fullName || "Sizning"} statistikangiz</b>\n\n` +
    `⭐ Daraja: ${maxLevel}\n💎 XP: ${totalXp.toLocaleString()}\n🔥 Streak: ${maxStreak} kun\n\n` +
    `📚 Jami: ${totalWords} | ✅ O'rganilgan: ${learnedWords}\n` +
    `📅 Bugun: ${todayReviewed} | 🎯 To'g'ri: ${todayCorrect}`,
    getMainMenuKeyboard()
  );
}

async function handleWordsToReviewCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.userId)
    .lte("next_review_time", new Date().toISOString());

  await sendMessage(
    token, chatId,
    count! > 0
      ? `📚 <b>Takrorlash kerak:</b> ${count} ta so'z\n\nQuiz orqali takrorlang!`
      : "🎉 <b>Ajoyib!</b> Hozircha takrorlash kerak so'z yo'q!",
    count! > 0
      ? { inline_keyboard: [[{ text: "🎯 Quiz boshlash", callback_data: "quiz" }], [{ text: "📱 Ilova", web_app: { url: WEBAPP_URL } }]] }
      : getWebAppButton()
  );
}

async function handleStreakCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { data: stats } = await supabase
    .from("user_stats")
    .select("streak")
    .eq("user_id", profile.userId);

  const maxStreak = stats?.reduce((max: number, s: any) => Math.max(max, s.streak || 0), 0) || 0;
  
  const messages = [
    [0, "Har kuni o'rganib streak'ingizni oshiring! 💪"],
    [7, "Yaxshi boshladingiz! Davom eting! 💪"],
    [30, "Zo'r natija! Siz muntazamsiz! 🌟"],
    [100, "Ajoyib! Siz haqiqiy o'rganuvchisiz! 🏆"],
    [Infinity, "Incredible! Siz chempionsiz! 👑"],
  ];

  const msg = messages.find(([threshold]) => maxStreak < threshold)![1];

  await sendMessage(
    token, chatId,
    `🔥 <b>Sizning streak:</b> ${maxStreak} kun\n\n${msg}`,
    getMainMenuKeyboard()
  );
}

async function handleRankCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { data: allStats } = await supabase.from("user_stats").select("user_id, xp");

  const userXpMap = new Map<string, number>();
  for (const stat of allStats || []) {
    userXpMap.set(stat.user_id, (userXpMap.get(stat.user_id) || 0) + (stat.xp || 0));
  }

  const sorted = Array.from(userXpMap.entries()).sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([userId]) => userId === profile.userId) + 1;
  const myXp = userXpMap.get(profile.userId) || 0;

  const emoji = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank <= 10 ? "🏆" : "📊";
  const msg = rank === 1 ? "🎉 Siz birinchi o'rindasiz!" : 
              rank <= 3 ? "🌟 Top 3 dasiz!" : 
              rank <= 10 ? "💪 Top 10 ichida!" : "📈 Ko'proq XP yig'ing!";

  await sendMessage(
    token, chatId,
    `${emoji} <b>Reytingdagi o'rningiz</b>\n\n🏅 O'rin: <b>#${rank}</b> / ${sorted.length}\n💎 XP: ${myXp.toLocaleString()}\n\n${msg}`,
    getMainMenuKeyboard()
  );
}

async function handleStatusCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (profile) {
    await sendMessage(
      token, chatId,
      `✅ <b>Hisob ulangan!</b>\n\n👤 ${profile.fullName || "Foydalanuvchi"}\n\n📱 Eslatmalar faol`,
      getMainMenuKeyboard()
    );
  } else {
    await sendMessage(token, chatId, "❌ <b>Hisob ulanmagan.</b>\n\nProfil → Telegram → Ulash", getWebAppButton());
  }
}

async function handleWeeklyReport(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [dailyResult, statsResult] = await Promise.all([
    supabase
      .from("daily_stats")
      .select("date, words_reviewed, words_correct, xp_earned")
      .eq("user_id", profile.userId)
      .gte("date", oneWeekAgo.toISOString().split('T')[0]),
    supabase
      .from("user_stats")
      .select("xp, level, streak, total_words, learned_words")
      .eq("user_id", profile.userId),
  ]);

  const dailyStats = dailyResult.data || [];
  const userStats = statsResult.data || [];

  let totalReviewed = 0, totalCorrect = 0, totalXp = 0, daysActive = 0;
  for (const stat of dailyStats) {
    totalReviewed += stat.words_reviewed || 0;
    totalCorrect += stat.words_correct || 0;
    totalXp += stat.xp_earned || 0;
    if ((stat.words_reviewed || 0) > 0) daysActive++;
  }

  const currentXp = userStats.reduce((sum: number, s: any) => sum + (s.xp || 0), 0);
  const currentLevel = Math.max(...userStats.map((s: any) => s.level || 1));
  const currentStreak = Math.max(...userStats.map((s: any) => s.streak || 0));
  const totalWords = userStats.reduce((sum: number, s: any) => sum + (s.total_words || 0), 0);
  const learnedWords = userStats.reduce((sum: number, s: any) => sum + (s.learned_words || 0), 0);

  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
  const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;
  const progressBar = "▓".repeat(Math.round(progressPercent / 10)) + "░".repeat(10 - Math.round(progressPercent / 10));

  let weekBreakdown = "";
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStat = dailyStats.find((s: any) => s.date === dateStr);
    weekBreakdown += (dayStat?.words_reviewed || 0) > 0 ? "🟢 " : "⚪️ ";
  }

  const motivation = daysActive >= 5 ? "🌟 Ajoyib hafta!" : daysActive >= 3 ? "👍 Yaxshi!" : "💪 Ko'proq mashq!";

  await sendMessage(
    token, chatId,
    `📊 <b>Haftalik Hisobot</b>\n━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>${profile.fullName || 'Foydalanuvchi'}</b>\n\n` +
    `📅 Oxirgi 7 kun:\n${weekBreakdown}\n\n` +
    `📈 Hafta:\n• ${totalReviewed} takrorlangan (${accuracy}%)\n• +${totalXp} XP\n• ${daysActive}/7 kun\n\n` +
    `🏆 Holat:\n• ⭐️ ${currentLevel} daraja | 💎 ${currentXp} XP\n• 🔥 ${currentStreak} kun streak\n\n` +
    `📚 Progress:\n${progressBar} ${progressPercent}%\n${learnedWords}/${totalWords} so'z\n\n${motivation}`,
    getMainMenuKeyboard()
  );
}

async function handleToggleNotifications(supabase: any, token: string, chatId: number, enabled: boolean) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  await supabase
    .from("notification_settings")
    .upsert({ user_id: profile.userId, telegram_enabled: enabled }, { onConflict: "user_id" });

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("daily_reminder_time")
    .eq("user_id", profile.userId)
    .maybeSingle();

  const msg = enabled ? "🔔 <b>Bildirishnomalar yoqildi!</b>" : "🔕 <b>Bildirishnomalar o'chirildi.</b>";
  await sendMessage(token, chatId, msg, getSettingsKeyboard(enabled, settings?.daily_reminder_time?.slice(0, 5)));
}

async function handleSetReminderTime(supabase: any, token: string, chatId: number, time: string) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  await supabase
    .from("notification_settings")
    .upsert({ user_id: profile.userId, daily_reminder_time: time, telegram_enabled: true }, { onConflict: "user_id" });

  await sendMessage(
    token, chatId,
    `✅ <b>Eslatma vaqti: ${time}</b>\n\nHar kuni shu vaqtda eslatma olasiz.`,
    getSettingsKeyboard(true, time)
  );
}

// ============ CONTEST HANDLERS ============

async function handleContestCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  const { data: contest } = await supabase
    .from("contests")
    .select("*")
    .eq("is_active", true)
    .lte("start_date", new Date().toISOString())
    .gt("end_date", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!contest) {
    await sendMessage(token, chatId, "📢 Hozirda faol konkurs yo'q.\n\nYangi konkurslar haqida xabar olish uchun kanalimizga obuna bo'ling!", getMainMenuKeyboard());
    return;
  }

  const endDate = new Date(contest.end_date);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const { count: participantCount } = await supabase
    .from("contest_participants")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", contest.id);

  let isParticipating = false;
  let userStats = null;
  let userRank = 0;
  let referralLink = "";

  if (profile) {
    const { data: participation } = await supabase
      .from("contest_participants")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("user_id", profile.userId)
      .maybeSingle();

    isParticipating = !!participation;
    userStats = participation;

    if (isParticipating) {
      const { data: allParticipants } = await supabase
        .from("contest_participants")
        .select("user_id, referral_count")
        .eq("contest_id", contest.id)
        .order("referral_count", { ascending: false });

      userRank = (allParticipants?.findIndex((p: any) => p.user_id === profile.userId) || 0) + 1;
      referralLink = `https://t.me/Leitner_robot?start=cref_${contest.id.slice(0, 8)}_${profile.userId.slice(0, 8)}`;
    }
  }

  const { data: leaders } = await supabase
    .from("contest_participants")
    .select("user_id, referral_count, telegram_username")
    .eq("contest_id", contest.id)
    .gt("referral_count", 0)
    .order("referral_count", { ascending: false })
    .limit(5);

  const leaderUserIds = leaders?.map((l: any) => l.user_id) || [];
  const { data: leaderProfiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", leaderUserIds);

  const profileMap = new Map(leaderProfiles?.map((p: any) => [p.user_id, p.full_name]) || []);

  let leaderboard = "";
  leaders?.forEach((l: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    const name = profileMap.get(l.user_id) || l.telegram_username || "Noma'lum";
    const isMe = profile && l.user_id === profile.userId;
    leaderboard += `${medal} ${isMe ? "<b>" : ""}${name}${isMe ? "</b>" : ""} - ${l.referral_count} ta\n`;
  });

  const prizes = contest.prizes?.map((p: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    return `${medal} ${p.prize}`;
  }).join("\n") || "";

  let message = 
    `🏆 <b>${contest.title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    (contest.description ? `${contest.description}\n\n` : "") +
    `⏰ ${daysLeft} kun qoldi\n` +
    `👥 ${participantCount || 0} ishtirokchi\n\n` +
    `🎁 <b>Sovg'alar:</b>\n${prizes}\n\n` +
    (leaderboard ? `📊 <b>Top 5:</b>\n${leaderboard}\n` : "");

  if (isParticipating && userStats) {
    message += `\n✅ <b>Siz qatnashyapsiz!</b>\n` +
      `📊 O'rningiz: #${userRank}\n` +
      `👥 Takliflaringiz: ${userStats.referral_count} ta\n\n` +
      `🔗 Sizning havolangiz:\n<code>${referralLink}</code>`;
  }

  const keyboard = isParticipating
    ? {
        inline_keyboard: [
          [{ text: "📋 Havolani nusxalash", callback_data: "copy_contest_link" }],
          [{ text: "📊 Statistikam", callback_data: "my_contest_stats" }],
          [{ text: "⬅️ Orqaga", callback_data: "back_to_menu" }],
        ],
      }
    : {
        inline_keyboard: [
          [{ text: "🚀 Qatnashish", callback_data: "join_contest" }],
          [{ text: "⬅️ Orqaga", callback_data: "back_to_menu" }],
        ],
      };

  // Send with photo if available
  if (contest.image_url) {
    await sendPhoto(token, chatId, contest.image_url, message, keyboard);
  } else {
    await sendMessage(token, chatId, message, keyboard);
  }
}

async function handleJoinContest(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!\n\nProfil → Telegram → Ulash", getWebAppButton());
    return;
  }

  const { data: contest } = await supabase
    .from("contests")
    .select("id, title")
    .eq("is_active", true)
    .gt("end_date", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!contest) {
    await sendMessage(token, chatId, "❌ Hozirda faol konkurs yo'q.", getMainMenuKeyboard());
    return;
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("telegram_username")
    .eq("user_id", profile.userId)
    .maybeSingle();

  const { error } = await supabase
    .from("contest_participants")
    .upsert({
      contest_id: contest.id,
      user_id: profile.userId,
      telegram_chat_id: chatId,
      telegram_username: profileData?.telegram_username,
    }, { onConflict: "contest_id,user_id" });

  if (error) {
    console.error("Join contest error:", error);
    await sendMessage(token, chatId, "❌ Xatolik yuz berdi.");
    return;
  }

  const referralLink = `https://t.me/Leitner_robot?start=cref_${contest.id.slice(0, 8)}_${profile.userId.slice(0, 8)}`;

  await sendMessage(
    token, chatId,
    `🎉 <b>Konkursga qo'shildingiz!</b>\n\n` +
    `🏆 ${contest.title}\n\n` +
    `Do'stlaringizni taklif qiling va sovg'a yutib oling!\n\n` +
    `🔗 <b>Sizning havolangiz:</b>\n<code>${referralLink}</code>\n\n` +
    `⚠️ <b>Muhim:</b> Taklif qilingan do'st kamida 1 ta so'z qo'shishi kerak!`,
    {
      inline_keyboard: [
        [{ text: "🏆 Konkurs sahifasi", callback_data: "contest" }],
        [{ text: "⬅️ Menyu", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleMyContestStats(supabase: any, token: string, chatId: number) {
  await handleContestCommand(supabase, token, chatId);
}

// ============ HELPER FUNCTIONS ============

async function getCachedProfile(supabase: any, chatId: number) {
  const cached = profileCache.get(chatId);
  if (cached && cached.expires > Date.now()) {
    return { userId: cached.userId, fullName: cached.fullName };
  }

  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (data) {
    profileCache.set(chatId, {
      userId: data.user_id,
      fullName: data.full_name || "",
      expires: Date.now() + CACHE_TTL,
    });
    return { userId: data.user_id, fullName: data.full_name };
  }

  return null;
}

function getLanguageEmoji(lang: string): string {
  const emojis: Record<string, string> = { en: "🇬🇧", ru: "🇷🇺", uz: "🇺🇿", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸" };
  return emojis[lang] || "🌐";
}

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
      [{ text: "🎯 Quiz", callback_data: "quiz" }, { text: "📊 Statistika", callback_data: "my_stats" }],
      [{ text: "📚 Takrorlash", callback_data: "words_to_review" }, { text: "🔥 Streak", callback_data: "my_streak" }],
      [{ text: "🎯 Challenge", callback_data: "challenge" }, { text: "🏆 Konkurs", callback_data: "contest" }],
      [{ text: "⚙️ Sozlamalar", callback_data: "settings" }],
    ],
  };
}

function getSettingsKeyboard(notificationsEnabled: boolean, currentTime?: string) {
  return {
    inline_keyboard: [
      [notificationsEnabled 
        ? { text: "🔔 Bildirishnoma: Yoqilgan ✅", callback_data: "notif_off" }
        : { text: "🔕 Bildirishnoma: O'chirilgan ❌", callback_data: "notif_on" }],
      [{ text: `⏰ Vaqt: ${currentTime || '09:00'}`, callback_data: "set_time" }],
      [{ text: "🌅 06:00", callback_data: "time_06:00" }, { text: "🌄 08:00", callback_data: "time_08:00" }, { text: "🌅 09:00", callback_data: "time_09:00" }],
      [{ text: "☀️ 12:00", callback_data: "time_12:00" }, { text: "🌆 18:00", callback_data: "time_18:00" }, { text: "🌙 21:00", callback_data: "time_21:00" }],
      [{ text: "📊 Haftalik hisobot", callback_data: "weekly_report" }],
      [{ text: "⬅️ Orqaga", callback_data: "back_to_menu" }],
    ],
  };
}

function getWebAppButton() {
  return { inline_keyboard: [[{ text: "📱 Leitner App", web_app: { url: WEBAPP_URL } }]] };
}

async function sendWelcomeMessage(token: string, chatId: number) {
  await sendMessage(
    token, chatId,
    "👋 <b>Salom! Leitner App botiga xush kelibsiz!</b>\n\n" +
    "🎓 Imkoniyatlar:\n" +
    "• 📚 So'z qo'shish: <code>/add so'z - tarjima</code>\n" +
    "• 🎯 Quiz: /quiz - so'zlarni takrorlash\n" +
    "• 📤 Inline: @Leitner_robot so'z\n" +
    "• 🏆 Challenge: /challenge\n\n" +
    "📱 Hisobni ulash: Profil → Telegram → Ulash",
    getMainMenuKeyboard()
  );
}

async function sendHelpMessage(token: string, chatId: number) {
  await sendMessage(
    token, chatId,
    "📚 <b>Leitner App Bot - Yordam</b>\n\n" +
    "<b>Buyruqlar:</b>\n" +
    "/add so'z - tarjima - So'z qo'shish\n" +
    "/quiz - So'zlarni takrorlash\n" +
    "/stats - Statistika\n" +
    "/review - Takrorlash kerak so'zlar\n" +
    "/streak - Streak\n" +
    "/rank - Reyting\n" +
    "/challenge - Haftalik musobaqa\n" +
    "/contest - Konkurs\n" +
    "/menu - Menyu\n\n" +
    "<b>Inline:</b>\n" +
    "@Leitner_robot so'z - so'zlarni ulashing",
    getMainMenuKeyboard()
  );
}

async function sendSettingsMenu(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("telegram_enabled, daily_reminder_time")
    .eq("user_id", profile.userId)
    .maybeSingle();

  await sendMessage(
    token, chatId,
    "⚙️ <b>Sozlamalar</b>",
    getSettingsKeyboard(settings?.telegram_enabled || false, settings?.daily_reminder_time?.slice(0, 5))
  );
}

async function sendTimeSettingsInfo(token: string, chatId: number) {
  await sendMessage(token, chatId, "⏰ <b>Eslatma vaqtini tanlang</b>\n\nQuyidagi vaqtlardan birini tanlang:");
}

// ============ TELEGRAM API FUNCTIONS ============

async function sendMessage(token: string, chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) console.error("Send error:", await response.text());
  return response;
}

async function sendPhoto(token: string, chatId: number, photoUrl: string, caption: string, replyMarkup?: any) {
  const body: any = { 
    chat_id: chatId, 
    photo: photoUrl,
    caption,
    parse_mode: "HTML" 
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error("Send photo error:", await response.text());
    // Fallback to text message if photo fails
    return sendMessage(token, chatId, caption, replyMarkup);
  }
  return response;
}

async function editMessage(token: string, chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = { 
    chat_id: chatId, 
    message_id: messageId,
    text, 
    parse_mode: "HTML" 
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) console.error("Edit error:", await response.text());
  return response;
}

async function answerCallbackQuery(token: string, callbackQueryId: string) {
  fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

async function answerInlineQuery(token: string, queryId: string, results: any[]) {
  const response = await fetch(`https://api.telegram.org/bot${token}/answerInlineQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inline_query_id: queryId,
      results,
      cache_time: 10,
      is_personal: true,
    }),
  });

  if (!response.ok) console.error("Inline error:", await response.text());
}
