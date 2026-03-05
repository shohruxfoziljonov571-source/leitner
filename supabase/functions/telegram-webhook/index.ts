import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBAPP_URL = "https://leitner.lovable.app";

// Cache for user profiles to reduce DB calls
const profileCache = new Map<number, { userId: string; fullName: string; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Quiz session cache
const quizCache = new Map<number, { wordId: string; correctAnswer: string; options: string[]; expires: number }>();
const QUIZ_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
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

    const parseStart = Date.now();
    const update = await req.json();
    const parseMs = Date.now() - parseStart;

    let kind: "inline_query" | "callback_query" | "text" | "other" = "other";
    let handlerMs = 0;

    // Handle inline queries (for sharing words)
    if (update.inline_query) {
      kind = "inline_query";
      const t0 = Date.now();
      await handleInlineQuery(supabase, TELEGRAM_BOT_TOKEN, update.inline_query);
      handlerMs = Date.now() - t0;
      const totalMs = Date.now() - startTime;
      const slowTag = totalMs >= 1000 ? " SLOW" : "";
      console.log(`[${requestId}]${slowTag} ok kind=${kind} parse=${parseMs}ms handler=${handlerMs}ms total=${totalMs}ms`);
      return quickResponse();
    }

    // Handle chosen inline result
    if (update.chosen_inline_result) {
      const totalMs = Date.now() - startTime;
      const slowTag = totalMs >= 1000 ? " SLOW" : "";
      console.log(`[${requestId}]${slowTag} inline result chosen:`, update.chosen_inline_result.result_id);
      console.log(`[${requestId}]${slowTag} ok kind=other parse=${parseMs}ms handler=0ms total=${totalMs}ms`);
      return quickResponse();
    }

    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const messageText = update.message?.text || "";

    // Handle callback queries with early return
    if (update.callback_query) {
      kind = "callback_query";
      const t0 = Date.now();
      await handleCallbackQuery(supabase, TELEGRAM_BOT_TOKEN, update.callback_query);
      handlerMs = Date.now() - t0;
      const totalMs = Date.now() - startTime;
      const slowTag = totalMs >= 1000 ? " SLOW" : "";
      console.log(`[${requestId}]${slowTag} ok kind=${kind} parse=${parseMs}ms handler=${handlerMs}ms total=${totalMs}ms`);
      return quickResponse();
    }

    // Handle text commands
    if (update.message?.text) {
      kind = "text";
      const t0 = Date.now();
      await handleTextCommand(supabase, TELEGRAM_BOT_TOKEN, chatId, messageText, update.message);
      handlerMs = Date.now() - t0;
    }

    const totalMs = Date.now() - startTime;
    const slowTag = totalMs >= 1000 ? " SLOW" : "";
    console.log(`[${requestId}]${slowTag} ok kind=${kind} parse=${parseMs}ms handler=${handlerMs}ms total=${totalMs}ms`);
    return quickResponse();
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
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

  const results = words.map((word: any, index: number) => {
    const boxStars = "⭐".repeat(word.box_number) + "☆".repeat(5 - word.box_number);
    return {
      type: "article",
      id: `word_${word.id}_${index}`,
      title: `${word.original_word} → ${word.translated_word}`,
      description: `${boxStars} | ${getLanguageEmoji(word.source_language)} → ${getLanguageEmoji(word.target_language)}`,
      input_message_content: {
        message_text: 
          `📖 <b>${word.original_word}</b> — <i>${word.translated_word}</i>\n\n` +
          `${getLanguageEmoji(word.source_language)} → ${getLanguageEmoji(word.target_language)}  │  ${boxStars}\n\n` +
          `<a href="${WEBAPP_URL}">📱 Leitner App</a>`,
        parse_mode: "HTML",
      },
    };
  });

  await answerInlineQuery(token, queryId, results);
}

// ============ CALLBACK QUERY HANDLER ============
async function handleCallbackQuery(supabase: any, token: string, callbackQuery: any) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  // Answer immediately to remove loading
  answerCallbackQuery(token, callbackQuery.id);

  // Handle time settings - edit message
  if (data.startsWith("time_")) {
    const time = data.replace("time_", "");
    await handleSetReminderTime(supabase, token, chatId, messageId, time);
    return;
  }

  // Handle quiz answer
  if (data.startsWith("quiz_")) {
    await handleQuizAnswer(supabase, token, chatId, messageId, data);
    return;
  }

  // Handle payment approval/rejection
  if (data.startsWith("pay_approve_") || data.startsWith("pay_reject_")) {
    await handlePaymentAction(supabase, token, chatId, messageId, data);
    return;
  }

  // Standard handlers - all now edit the current message
  const handlers: Record<string, () => Promise<void>> = {
    "open_app": async () => { await editMessage(token, chatId, messageId, "📱 <b>Ilovani ochish</b>", getWebAppButton()); },
    "my_stats": () => handleStatsCommand(supabase, token, chatId, messageId),
    "words_to_review": () => handleWordsToReviewCommand(supabase, token, chatId, messageId),
    "my_streak": () => handleStreakCommand(supabase, token, chatId, messageId),
    "my_rank": () => handleRankCommand(supabase, token, chatId, messageId),
    "help": () => sendHelpMessage(token, chatId, messageId),
    "settings": () => sendSettingsMenu(supabase, token, chatId, messageId),
    "notif_on": () => handleToggleNotifications(supabase, token, chatId, messageId, true),
    "notif_off": () => handleToggleNotifications(supabase, token, chatId, messageId, false),
    "set_time": () => sendTimeSettingsInfo(token, chatId, messageId),
    "weekly_report": () => handleWeeklyReport(supabase, token, chatId, messageId),
    "challenge": () => handleChallengeCommand(supabase, token, chatId, messageId),
    "join_challenge": () => handleJoinChallenge(supabase, token, chatId, messageId),
    "back_to_menu": async () => { await editMessage(token, chatId, messageId, getMainMenuMessage(), getMainMenuKeyboard()); },
    "check_channels": () => handleCheckChannels(supabase, token, chatId, messageId),
    "contest": () => handleContestCommand(supabase, token, chatId, messageId),
    "join_contest": () => handleJoinContest(supabase, token, chatId, messageId),
    "my_contest_stats": () => handleMyContestStats(supabase, token, chatId, messageId),
    "quiz": () => handleQuizCommand(supabase, token, chatId, messageId),
    "quiz_next": () => sendQuizQuestion(supabase, token, chatId, messageId),
    "quiz_stop": () => handleQuizStop(supabase, token, chatId, messageId),
    "share_contest": () => handleShareContest(supabase, token, chatId, messageId),
  };

  const handler = handlers[data];
  if (handler) await handler();
}

// Helper function to send new message or edit existing one
async function sendOrEdit(token: string, chatId: number, messageId: number | undefined, text: string, replyMarkup?: any): Promise<void> {
  if (messageId) {
    await editMessage(token, chatId, messageId, text, replyMarkup);
  } else {
    await sendMessage(token, chatId, text, replyMarkup);
  }
}

// Handle channel check callback
async function handleCheckChannels(supabase: any, token: string, chatId: number, messageId?: number) {
  const channelsOk = await checkRequiredChannels(supabase, token, chatId);
  if (channelsOk) {
    await sendOrEdit(token, chatId, messageId, 
      getWelcomeText(),
      getMainMenuKeyboard()
    );
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
    "/start": () => handleStartCommand(supabase, token, chatId, text, username, message),
    "/menu": async () => { await sendMessage(token, chatId, getMainMenuMessage(), getMainMenuKeyboard()); },
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

async function handleQuizCommand(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!\n\n📱 Profil → Telegram → Ulash", getWebAppButton());
    return;
  }

  // Get user's word count
  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.userId);

  if (!count || count < 4) {
    await sendOrEdit(
      token, chatId, messageId,
      "❌ <b>So'zlar yetarli emas!</b>\n\n" +
      `📚 Sizda: ${count || 0} ta so'z\n` +
      "🎯 Kerak: kamida 4 ta\n\n" +
      "💡 So'z qo'shish:\n" +
      "<code>/add hello - salom</code>",
      {
        inline_keyboard: [
          [{ text: "📱 Ilovada qo'shish", web_app: { url: WEBAPP_URL }, style: "success" }],
          [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
        ],
      }
    );
    return;
  }

  // Get words to review count
  const { count: reviewCount } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.userId)
    .lte("next_review_time", new Date().toISOString());

  await sendOrEdit(
    token, chatId, messageId,
    `🎯 <b>Quiz Mode</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📚 Jami so'zlar: <b>${count}</b>\n` +
    `📖 Takrorlash kerak: <b>${reviewCount || 0}</b>\n\n` +
    `Tayyor bo'lsangiz, boshlang! 💪`,
    {
      inline_keyboard: [
        [{ text: "▶️ Quiz boshlash", callback_data: "quiz_next", style: "success" }],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function sendQuizQuestion(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
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
    await sendOrEdit(token, chatId, messageId, "❌ Avval ilovada til tanlang!", getWebAppButton());
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
    await sendOrEdit(token, chatId, messageId, "❌ So'zlar yetarli emas. Kamida 4 ta so'z kerak.", getMainMenuKeyboard());
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

  const boxStars = "⭐".repeat(targetWord.box_number) + "☆".repeat(5 - targetWord.box_number);

  await sendOrEdit(
    token, chatId, messageId,
    `🧠 <b>Tarjimani toping:</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📝 <b>${targetWord.original_word}</b>\n\n` +
    `${boxStars}`,
    {
      inline_keyboard: [
        ...options.map((opt, i) => [
          { text: `${["🅰", "🅱", "🅲", "🅳"][i]} ${opt.text}`, callback_data: `quiz_${i}_${opt.isCorrect ? "1" : "0"}` }
        ]),
        [
          { text: "⏭ O'tkazish", callback_data: "quiz_next" },
          { text: "⏹ Tugatish", callback_data: "quiz_stop", style: "danger" }
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
      inline_keyboard: [[{ text: "🎯 Qayta boshlash", callback_data: "quiz", style: "success" }]]
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

  // XP values
  const XP_PER_CORRECT = 10;
  const XP_PER_INCORRECT = 2;
  let xpEarned = 0;

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

    // Update user stats with XP
    xpEarned = XP_PER_CORRECT;
    const { data: currentStats } = await supabase
      .from("user_stats")
      .select("xp, level")
      .eq("user_id", profile.userId)
      .eq("user_language_id", userLang.id)
      .maybeSingle();

    const currentXp = currentStats?.xp || 0;
    const newXp = currentXp + xpEarned;
    // Progressive leveling: level = floor((75 + sqrt(5625 + 300*xp)) / 150)
    const newLevel = Math.floor((75 + Math.sqrt(5625 + 300 * newXp)) / 150);

    await supabase
      .from("user_stats")
      .update({
        today_reviewed: (currentStats?.today_reviewed || 0) + 1,
        today_correct: (currentStats?.today_correct || 0) + 1,
        xp: newXp,
        level: newLevel,
      })
      .eq("user_id", profile.userId)
      .eq("user_language_id", userLang.id);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from("daily_stats")
      .upsert({
        user_id: profile.userId,
        user_language_id: userLang.id,
        date: today,
        words_reviewed: 1,
        words_correct: 1,
        xp_earned: xpEarned,
      }, { 
        onConflict: "user_id,user_language_id,date",
        ignoreDuplicates: false 
      });

    // Update weekly challenge if participating
    const { data: challengeId } = await supabase.rpc("get_or_create_weekly_challenge");
    if (challengeId) {
      await supabase
        .from("weekly_challenge_participants")
        .update({
          xp_earned: supabase.rpc("increment", { amount: xpEarned }),
          words_reviewed: supabase.rpc("increment"),
          words_correct: supabase.rpc("increment"),
        })
        .eq("challenge_id", challengeId)
        .eq("user_id", profile.userId);
    }

  } else {
    // Move to box 1
    xpEarned = XP_PER_INCORRECT;
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

    const { data: currentStats } = await supabase
      .from("user_stats")
      .select("xp, level, today_reviewed")
      .eq("user_id", profile.userId)
      .eq("user_language_id", userLang.id)
      .maybeSingle();

    const currentXp = currentStats?.xp || 0;
    const newXp = currentXp + xpEarned;
    const newLevel = Math.floor((75 + Math.sqrt(5625 + 300 * newXp)) / 150);

    await supabase
      .from("user_stats")
      .update({
        today_reviewed: (currentStats?.today_reviewed || 0) + 1,
        xp: newXp,
        level: newLevel,
      })
      .eq("user_id", profile.userId)
      .eq("user_language_id", userLang.id);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from("daily_stats")
      .upsert({
        user_id: profile.userId,
        user_language_id: userLang.id,
        date: today,
        words_reviewed: 1,
        words_correct: 0,
        xp_earned: xpEarned,
      }, { 
        onConflict: "user_id,user_language_id,date",
        ignoreDuplicates: false 
      });
  }

  // Clear quiz cache
  quizCache.delete(chatId);

  // Edit message to show result with XP earned
  const resultMessage = isCorrect
    ? `✅ <b>To'g'ri!</b>  +${xpEarned} XP 💎\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📝 <b>${correctAnswer}</b>\n\n` +
      `Zo'r! Davom eting! 🔥`
    : `❌ <b>Noto'g'ri!</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Siz: <s>${selectedAnswer}</s>\n` +
      `✅ To'g'ri: <b>${correctAnswer}</b>\n\n` +
      `💡 Bu so'z Box 1 ga qaytdi`;

  await editMessage(token, chatId, messageId, resultMessage, {
    inline_keyboard: [
      [{ text: "➡️ Keyingi savol", callback_data: "quiz_next", style: "success" }],
      [{ text: "⏹ Tugatish", callback_data: "quiz_stop", style: "danger" }],
    ],
  });
}

async function handleQuizStop(supabase: any, token: string, chatId: number, messageId?: number) {
  quizCache.delete(chatId);
  
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "Quiz tugatildi!", getMainMenuKeyboard());
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

  const accuracyEmoji = accuracy >= 80 ? "🏆" : accuracy >= 60 ? "👍" : accuracy >= 40 ? "💪" : "📈";

  await sendOrEdit(
    token, chatId, messageId,
    `🎉 <b>Quiz yakunlandi!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 <b>Bugungi natijalar:</b>\n\n` +
    `   📝 Takrorlangan: <b>${todayReviewed}</b> ta\n` +
    `   ✅ To'g'ri: <b>${todayCorrect}</b> ta\n` +
    `   ${accuracyEmoji} Aniqlik: <b>${accuracy}%</b>\n\n` +
    `Ajoyib ish! Davom eting! 💪`,
    getMainMenuKeyboard()
  );
}

// ============ COMMAND HANDLERS ============

async function handleStartCommand(supabase: any, token: string, chatId: number, text: string, username?: string, message?: any) {
  const parts = text.split(" ");
  const firstName = message?.from?.first_name || "Foydalanuvchi";
  const lastName = message?.from?.last_name || "";
  let premiumRefCode: string | null = null;
  let adClickId: string | null = null;
  
  if (parts.length > 1) {
    const param = parts[1];
    
    // Check if it's an ad click tracking link (starts with ad_)
    if (param.startsWith("ad_")) {
      adClickId = param.replace("ad_", "");
      console.log(`Ad click detected: ${adClickId} from chat ${chatId}`);
    }
    
    // Check if it's a contest referral link (starts with cref_)
    if (param.startsWith("cref_")) {
      const [contestShortId, referrerUserId] = param.replace("cref_", "").split("_");
      await handleContestReferral(supabase, token, chatId, contestShortId, referrerUserId, username);
      return;
    }
    
    // Check if it's a referral link (starts with ref_)
    if (param.startsWith("ref_")) {
      premiumRefCode = param.replace("ref_", "");
      // Also track admin referral visits if matching
      await trackReferralVisit(supabase, premiumRefCode, chatId, username);
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
          "✅ <b>Muvaffaqiyatli ulandi!</b>\n" +
          "━━━━━━━━━━━━━━━━━━\n\n" +
          "Endi siz eslatmalar olasiz va bot orqali o'rganishingiz mumkin.\n\n" +
          "💡 <b>Boshlash uchun:</b>\n" +
          "  • <code>/add so'z - tarjima</code> — tezkor qo'shish\n" +
          "  • /quiz — so'z takrorlash\n" +
          "  • @Leitner_robot — so'zlarni ulashing\n" +
          "  • /challenge — haftalik musobaqa\n" +
          "  • /contest — konkursda qatnashing",
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

  // Check if user already has account linked
  const existingProfile = await getCachedProfile(supabase, chatId);
  
  if (!existingProfile) {
    // Auto-create account for Telegram user
    const autoCreated = await autoCreateTelegramAccount(supabase, chatId, username, firstName, lastName, premiumRefCode);
    
    if (autoCreated) {
      // Map ad click BEFORE sending message (fix: was after early return)
      if (adClickId) {
        await mapAdClickToUser(supabase, adClickId, chatId, username);
      }

      await sendMessage(
        token, chatId,
        `🎉 <b>Xush kelibsiz, ${firstName}!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `Hisobingiz avtomatik yaratildi ✨\n\n` +
        `💡 <b>Nima qilish mumkin:</b>\n` +
        `  • <code>/add hello - salom</code> — so'z qo'shish\n` +
        `  • /quiz — so'zlarni takrorlash\n` +
        `  • @Leitner_robot — so'zlarni ulashing\n\n` +
        `📱 Ilovani to'liq ochish uchun:`,
        getMainMenuKeyboard()
      );
      return;
    }
  } else if (premiumRefCode) {
    // Existing user clicked a referral link - still track it
    await trackPremiumReferral(supabase, premiumRefCode, existingProfile.userId);
  }

  await sendWelcomeMessage(token, chatId);

  // Map ad click to telegram user (for existing users)
  if (adClickId) {
    await mapAdClickToUser(supabase, adClickId, chatId, username);
  }
}

// Map ad click_id to telegram user and trigger conversion
async function mapAdClickToUser(supabase: any, clickId: string, chatId: number, username?: string) {
  try {
    const { data: click, error } = await supabase
      .from("ad_clicks")
      .select("id, conversion_sent")
      .eq("click_id", clickId)
      .maybeSingle();

    if (error || !click) {
      console.log(`Ad click not found: ${clickId}`);
      return;
    }

    // Update with telegram user data
    await supabase
      .from("ad_clicks")
      .update({
        telegram_user_id: chatId,
        telegram_username: username || null,
        channel_joined: true, // They started the bot
      })
      .eq("click_id", clickId);

    // Send conversion event if not already sent
    if (!click.conversion_sent) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
        
        await fetch(`${supabaseUrl}/functions/v1/meta-conversion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ click_id: clickId }),
        });
        console.log(`Conversion event sent for click: ${clickId}`);
      } catch (e) {
        console.error("Failed to send conversion:", e);
      }
    }
  } catch (e) {
    console.error("Map ad click error:", e);
  }
}

// Send any Meta conversion event for a user (finds their ad click)
async function sendMetaConversionForUser(supabase: any, userId: string, eventName: string, value?: number, currency?: string) {
  try {
    // Find the ad click for this user
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.telegram_chat_id) return;

    const { data: click } = await supabase
      .from("ad_clicks")
      .select("click_id")
      .eq("telegram_user_id", profile.telegram_chat_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!click) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const body: any = { click_id: click.click_id, event_name: eventName };
    if (value && currency) {
      body.value = value;
      body.currency = currency;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/meta-conversion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    console.log(`Meta ${eventName} event sent for user ${userId}:`, JSON.stringify(result));
  } catch (e) {
    console.error(`Failed to send Meta ${eventName}:`, e);
  }
}

// Track premium referral (user_referrals table)
async function trackPremiumReferral(supabase: any, refCode: string, referredUserId: string) {
  try {
    // Find referrer by friend_code
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("friend_code", refCode)
      .maybeSingle();

    if (!referrerProfile || referrerProfile.user_id === referredUserId) return;

    // Check if referral already exists
    const { data: existing } = await supabase
      .from("user_referrals")
      .select("id")
      .eq("referrer_user_id", referrerProfile.user_id)
      .eq("referred_user_id", referredUserId)
      .maybeSingle();

    if (existing) return;

    await supabase.from("user_referrals").insert({
      referrer_user_id: referrerProfile.user_id,
      referred_user_id: referredUserId,
    });

    console.log(`Premium referral tracked: ${refCode} -> ${referredUserId}`);
  } catch (e) {
    console.error("Track premium referral error:", e);
  }
}

// Auto-create Telegram account
async function autoCreateTelegramAccount(
  supabase: any, 
  chatId: number, 
  username?: string, 
  firstName?: string, 
  lastName?: string,
  premiumRefCode?: string | null
): Promise<boolean> {
  try {
    console.log(`Auto-creating account for Telegram user: ${chatId} (${firstName})`);
    
    const email = `${chatId}@leitner.uz`;
    const password = `tg_secure_${chatId}_leitner_app_2024`;
    const fullName = `${firstName || ""}${lastName ? " " + lastName : ""}`.trim() || "Telegram User";

    // Try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        telegram_id: chatId,
        telegram_username: username,
      }
    });

    if (signUpError) {
      console.error("Sign up error:", signUpError);
      
      // User might exist, try to find and link
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("user_id", `%`)
        .limit(1);
        
      // Just link by email pattern
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const matchingUser = authUsers?.users?.find((u: any) => u.email === email);
      
      if (matchingUser) {
        await supabase
          .from("profiles")
          .update({
            telegram_chat_id: chatId,
            telegram_username: username || null,
            full_name: fullName,
            telegram_connected_at: new Date().toISOString(),
          })
          .eq("user_id", matchingUser.id);

        // Enable notifications
        await supabase
          .from("notification_settings")
          .upsert({ user_id: matchingUser.id, telegram_enabled: true }, { onConflict: "user_id" });

        // Track premium referral
        if (premiumRefCode) {
          await trackPremiumReferral(supabase, premiumRefCode, matchingUser.id);
        }

        profileCache.delete(chatId);
        return true;
      }
      
      return false;
    }

    if (signUpData?.user) {
      console.log("User created:", signUpData.user.id);
      
      // Wait for profile trigger (reduced for faster response)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with Telegram data
      await supabase
        .from("profiles")
        .update({
          telegram_chat_id: chatId,
          telegram_username: username || null,
          full_name: fullName,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq("user_id", signUpData.user.id);

      // Enable notifications
      await supabase
        .from("notification_settings")
        .upsert({ user_id: signUpData.user.id, telegram_enabled: true }, { onConflict: "user_id" });

      // Create default user language (Uzbek → English)
      const { data: langData } = await supabase
        .from("user_languages")
        .insert({
          user_id: signUpData.user.id,
          source_language: "uz",
          target_language: "en",
        })
        .select()
        .single();

      if (langData) {
        // Create user stats
        await supabase
          .from("user_stats")
          .insert({
            user_id: signUpData.user.id,
            user_language_id: langData.id,
          });
      }

      // Track premium referral
      if (premiumRefCode) {
        await trackPremiumReferral(supabase, premiumRefCode, signUpData.user.id);
      }

      profileCache.delete(chatId);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Auto-create account error:", error);
    return false;
  }
}

// Handle contest referral
async function handleContestReferral(supabase: any, token: string, chatId: number, contestShortId: string, referrerUserId: string, username?: string) {
  try {
    console.log(`Contest referral: contestShortId=${contestShortId}, referrerUserId=${referrerUserId}`);
    
    // Find the contest - search by id starting with the short id
    const { data: allContests } = await supabase
      .from("contests")
      .select("id, title, image_url, is_active, end_date")
      .eq("is_active", true)
      .gt("end_date", new Date().toISOString());
    
    // Find contest matching the short ID
    const contest = allContests?.find((c: any) => c.id.startsWith(contestShortId));
    
    console.log(`Found contests: ${allContests?.length}, matched: ${contest?.id}`);

    if (!contest) {
      // Try to find any active contest as fallback
      const { data: activeContest } = await supabase
        .from("contests")
        .select("id, title, image_url, is_active, end_date")
        .eq("is_active", true)
        .gt("end_date", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      
      if (activeContest) {
        console.log(`Fallback to active contest: ${activeContest.id}`);
        await processContestReferral(supabase, token, chatId, activeContest, referrerUserId, username);
        return;
      }
      
      await sendMessage(token, chatId, "❌ Konkurs topilmadi yoki tugagan.", getMainMenuKeyboard());
      return;
    }
    
    await processContestReferral(supabase, token, chatId, contest, referrerUserId, username);

  } catch (e) {
    console.error("Contest referral error:", e);
    await sendWelcomeMessage(token, chatId);
  }
}

// Process contest referral after finding contest
async function processContestReferral(supabase: any, token: string, chatId: number, contest: any, referrerShortId: string, username?: string) {
  console.log(`Processing contest referral: contestId=${contest.id}, referrerShortId=${referrerShortId}, chatId=${chatId}`);
  
  // Find the full referrer user_id from the short ID
  const { data: allParticipants } = await supabase
    .from("contest_participants")
    .select("user_id")
    .eq("contest_id", contest.id);
  
  // Find participant whose user_id starts with the short ID
  const referrerParticipant = allParticipants?.find((p: any) => 
    p.user_id.toLowerCase().startsWith(referrerShortId.toLowerCase())
  );
  
  if (!referrerParticipant) {
    console.log(`Referrer not found for short ID: ${referrerShortId}, checking all ${allParticipants?.length || 0} participants`);
    await sendContestInviteMessage(token, chatId, contest);
    return;
  }
  
  const referrerUserId = referrerParticipant.user_id;
  console.log(`Found referrer: ${referrerUserId}`);

  // Check if this user already exists in the system
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (existingProfile) {
    // User already has an account
    if (existingProfile.user_id === referrerUserId) {
      console.log("User clicked their own referral link");
      await handleContestCommand(supabase, token, chatId);
      return;
    }
    
    // Check if referral already exists for this user in this contest
    const { data: existingReferral } = await supabase
      .from("contest_referrals")
      .select("id")
      .eq("contest_id", contest.id)
      .eq("referred_user_id", existingProfile.user_id)
      .maybeSingle();
    
    if (!existingReferral) {
      const { error: insertError } = await supabase.from("contest_referrals").insert({
        contest_id: contest.id,
        referrer_user_id: referrerUserId,
        referred_user_id: existingProfile.user_id,
        referred_telegram_chat_id: chatId,
        is_valid: false,
      });
      
      if (insertError) {
        console.error("Error recording referral:", insertError);
      } else {
        console.log(`Referral recorded: referrer=${referrerUserId}, referred=${existingProfile.user_id}`);
        
        const { count: wordCount } = await supabase
          .from("words")
          .select("*", { count: "exact", head: true })
          .eq("user_id", existingProfile.user_id);
        
        if (wordCount && wordCount > 0) {
          await validateContestReferral(supabase, existingProfile.user_id, contest.id, token);
        }
      }
    }
    
    await handleContestCommand(supabase, token, chatId);
    return;
  }

  // New user - show invite message
  await sendContestInviteMessage(token, chatId, contest);
}

// Send contest invite message for new users
async function sendContestInviteMessage(token: string, chatId: number, contest: any) {
  const message =
    `🏆 <b>${contest.title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Siz konkursga taklif qilindingiz! 🎉\n\n` +
    `📋 <b>Qatnashish uchun:</b>\n` +
    `  1️⃣ Ilovada ro'yxatdan o'ting\n` +
    `  2️⃣ Profildan Telegramni ulang\n` +
    `  3️⃣ Kamida 1 ta so'z qo'shing\n\n` +
    `Shundan so'ng siz ishtirokchi bo'lasiz! 💪`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "📱 Ro'yxatdan o'tish", web_app: { url: WEBAPP_URL }, style: "success" }],
      [{ text: "🏆 Konkurs haqida", callback_data: "contest" }],
    ],
  };

  if (contest.image_url) {
    await sendPhoto(token, chatId, contest.image_url, message, keyboard);
  } else {
    await sendMessage(token, chatId, message, keyboard);
  }
}

// Validate contest referral when user adds a word
async function validateContestReferral(supabase: any, userId: string, contestId?: string, token?: string) {
  try {
    const botToken = token || Deno.env.get("TELEGRAM_BOT_TOKEN");
    console.log(`Validating referral for user: ${userId}, contestId: ${contestId || 'any active'}, hasToken: ${!!botToken}`);
    
    let query = supabase
      .from("contest_referrals")
      .select("id, contest_id, referrer_user_id, referred_telegram_chat_id, notified_at")
      .eq("referred_user_id", userId)
      .eq("is_valid", false);
    
    if (contestId) {
      query = query.eq("contest_id", contestId);
    }
    
    const { data: pendingReferrals, error: queryError } = await query;
    
    if (queryError) {
      console.error("Error fetching pending referrals:", queryError);
      return;
    }
    
    if (!pendingReferrals || pendingReferrals.length === 0) {
      console.log("No pending referrals to validate");
      return;
    }
    
    console.log(`Found ${pendingReferrals.length} pending referrals to validate`);
    
    const { data: referredProfile } = await supabase
      .from("profiles")
      .select("full_name, telegram_username")
      .eq("user_id", userId)
      .maybeSingle();
    
    const referredName = referredProfile?.full_name || referredProfile?.telegram_username || "Yangi foydalanuvchi";
    
    for (const referral of pendingReferrals) {
      const { data: contest } = await supabase
        .from("contests")
        .select("id, title, is_active, end_date")
        .eq("id", referral.contest_id)
        .maybeSingle();
      
      if (!contest || !contest.is_active || new Date(contest.end_date) < new Date()) {
        console.log(`Contest ${referral.contest_id} is no longer active`);
        continue;
      }
      
      const { error: updateError } = await supabase
        .from("contest_referrals")
        .update({ 
          is_valid: true, 
          validated_at: new Date().toISOString() 
        })
        .eq("id", referral.id);
      
      if (updateError) {
        console.error("Error validating referral:", updateError);
        continue;
      }
      
      console.log(`Referral ${referral.id} marked as valid`);
      
      const { data: participant } = await supabase
        .from("contest_participants")
        .select("referral_count, telegram_chat_id")
        .eq("contest_id", referral.contest_id)
        .eq("user_id", referral.referrer_user_id)
        .maybeSingle();
      
      if (participant) {
        const newCount = (participant.referral_count || 0) + 1;
        
        await supabase
          .from("contest_participants")
          .update({ referral_count: newCount })
          .eq("contest_id", referral.contest_id)
          .eq("user_id", referral.referrer_user_id);
        
        console.log(`Referral count updated: referrer=${referral.referrer_user_id}, new count=${newCount}`);
        
        if (participant.telegram_chat_id && botToken && !referral.notified_at) {
          const notificationMessage = 
            `🎉 <b>Yangi referral tasdiqlandi!</b>\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `👤 <b>${referredName}</b> sizning havolangiz orqali qo'shildi va birinchi so'zini qo'shdi!\n\n` +
            `🏆 <b>${contest.title}</b>\n` +
            `📊 Sizning referallaringiz: <b>${newCount}</b> ta\n\n` +
            `Ko'proq do'stlaringizni taklif qiling! 💪`;
          
          try {
            console.log(`Sending notification to referrer: chatId=${participant.telegram_chat_id}`);
            
            await sendMessage(botToken, participant.telegram_chat_id, notificationMessage, {
              inline_keyboard: [
                [{ text: "📊 Statistikam", callback_data: "my_contest_stats", style: "primary" }],
                [{ text: "📤 Yana taklif qilish", callback_data: "share_contest", style: "success" }],
              ],
            });
            
            await supabase
              .from("contest_referrals")
              .update({ notified_at: new Date().toISOString() })
              .eq("id", referral.id);
            
            console.log(`Notification sent to referrer: ${participant.telegram_chat_id}`);
          } catch (notifError) {
            console.error("Error sending referral notification:", notifError);
          }
        } else {
          console.log(`Skipping notification: chatId=${participant.telegram_chat_id}, hasToken=${!!botToken}, alreadyNotified=${!!referral.notified_at}`);
        }
      } else {
        console.log(`Referrer not a participant, using RPC: ${referral.referrer_user_id}`);
        const { error: incrementError } = await supabase.rpc("increment_referral_count", {
          p_contest_id: referral.contest_id,
          p_user_id: referral.referrer_user_id
        });
        
        if (incrementError) {
          console.error("Error incrementing referral count:", incrementError);
        }
      }
    }
  } catch (error) {
    console.error("Error in validateContestReferral:", error);
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
    channelButtons.push([{ text: "✅ Tekshirish", callback_data: "check_channels", style: "success" }]);

    await sendMessage(
      token, chatId,
      "👋 <b>Salom!</b>\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n" +
      notJoined.map((ch: any) => `  📢 ${ch.channel_name}`).join("\n"),
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
    await sendMessage(token, chatId, "❌ Avval hisobingizni ulang!\n\n📱 Profil → Telegram → Ulash", getWebAppButton());
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
      "❌ <b>Noto'g'ri format</b>\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "💡 <b>To'g'ri format:</b>\n" +
      "<code>/add so'z - tarjima</code>\n\n" +
      "📝 <b>Misollar:</b>\n" +
      "  <code>/add hello - salom</code>\n" +
      "  <code>/add computer - kompyuter</code>"
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

  // Validate any pending contest referrals for this user (with notification)
  await validateContestReferral(supabase, profile.userId, undefined, token);

  await sendMessage(
    token, chatId,
    `✅ <b>So'z qo'shildi!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `${getLanguageEmoji(userLang.source_language)} <b>${word}</b>\n` +
    `${getLanguageEmoji(userLang.target_language)} <i>${translation}</i>\n\n` +
    `📦 Box 1 ga joylashtirildi`,
    {
      inline_keyboard: [
        [{ text: "🎯 Quiz boshlash", callback_data: "quiz", style: "success" }],
        [{ text: "📱 Ilovada o'rganish", web_app: { url: WEBAPP_URL } }],
      ],
    }
  );
}

async function handleChallengeCommand(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
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
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `  ${i + 1}.`;
    const name = profileMap.get(p.user_id) || "Noma'lum";
    const isMe = p.user_id === profile.userId;
    leaderboard += `${medal} ${isMe ? "<b>" : ""}${name}${isMe ? "</b>" : ""} — ${p.xp_earned} XP\n`;
  });

  const message = 
    `🏆 <b>Haftalik Challenge</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📅 ${challenge.week_start} — ${challenge.week_end}\n` +
    `⏰ <b>${daysLeft}</b> kun qoldi  │  👥 <b>${participants.length}</b> ishtirokchi\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📊 <b>Liderlar:</b>\n` +
    (leaderboard || "  Hali ishtirokchilar yo'q\n") +
    `\n` +
    (isJoined 
      ? `✅ Siz qatnashyapsiz!\n💎 Sizning XP: <b>${userParticipation.data.xp_earned}</b>`
      : `❌ Siz hali qo'shilmagansiz`);

  await sendOrEdit(token, chatId, messageId, message, {
    inline_keyboard: [
      isJoined 
        ? [{ text: "📱 O'ynashni davom ettirish", web_app: { url: WEBAPP_URL }, style: "success" }]
        : [{ text: "🚀 Qo'shilish", callback_data: "join_challenge", style: "success" }],
      [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
    ],
  });
}

async function handleJoinChallenge(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
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
    await sendOrEdit(token, chatId, messageId, "❌ Xatolik yuz berdi.");
    return;
  }

  await sendOrEdit(
    token, chatId, messageId,
    "🎉 <b>Challenge'ga qo'shildingiz!</b>\n" +
    "━━━━━━━━━━━━━━━━━━\n\n" +
    "So'zlarni takrorlang va XP yig'ing! 💪\n\n" +
    "Eng ko'p XP yig'gan ishtirokchilar\nmukofotlanadi! 🏆",
    {
      inline_keyboard: [
        [{ text: "🎯 Quiz boshlash", callback_data: "quiz", style: "success" }],
        [{ text: "📱 Ilovada o'rganish", web_app: { url: WEBAPP_URL } }],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleStatsCommand(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const [statsResult, wordsResult] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", profile.userId),
    supabase.from("words").select("*", { count: "exact", head: true }).eq("user_id", profile.userId),
  ]);

  const stats = statsResult.data || [];
  const totalWords = wordsResult.count || 0;

  const totalXp = stats.reduce((sum: number, s: any) => sum + (s.xp || 0), 0);
  const level = Math.floor((75 + Math.sqrt(5625 + 300 * totalXp)) / 150);
  const streak = Math.max(...stats.map((s: any) => s.streak || 0), 0);
  const todayReviewed = stats.reduce((sum: number, s: any) => sum + (s.today_reviewed || 0), 0);
  const todayCorrect = stats.reduce((sum: number, s: any) => sum + (s.today_correct || 0), 0);
  const learnedWords = stats.reduce((sum: number, s: any) => sum + (s.learned_words || 0), 0);
  
  // Level progress
  const xpForCurrentLevel = level <= 1 ? 0 : Math.floor(((150 * level - 75) * (150 * level - 75) - 5625) / 300);
  const xpForNextLevel = Math.floor(((150 * (level + 1) - 75) * (150 * (level + 1) - 75) - 5625) / 300);
  const levelProgress = xpForNextLevel > xpForCurrentLevel 
    ? Math.round(((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100) 
    : 0;
  const progressBar = "▓".repeat(Math.round(levelProgress / 10)) + "░".repeat(10 - Math.round(levelProgress / 10));

  await sendOrEdit(
    token, chatId, messageId,
    `📊 <b>Sizning statistikangiz</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>${profile.fullName || 'Foydalanuvchi'}</b>\n\n` +
    `⭐️ Daraja: <b>${level}</b>  │  💎 XP: <b>${totalXp.toLocaleString()}</b>\n` +
    `${progressBar} ${levelProgress}%\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📚 So'zlar: <b>${totalWords}</b>  │  🎓 O'rganilgan: <b>${learnedWords}</b>\n` +
    `🔥 Streak: <b>${streak}</b> kun\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>Bugun:</b>\n` +
    `  📝 Takrorlangan: <b>${todayReviewed}</b>\n` +
    `  ✅ To'g'ri: <b>${todayCorrect}</b>`,
    {
      inline_keyboard: [
        [{ text: "📊 Haftalik hisobot", callback_data: "weekly_report", style: "primary" }],
        [
          { text: "🏅 Reyting", callback_data: "my_rank" }, 
          { text: "🔥 Streak", callback_data: "my_streak" }
        ],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleWordsToReviewCommand(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.userId)
    .lte("next_review_time", new Date().toISOString());

  if (count! > 0) {
    await sendOrEdit(
      token, chatId, messageId,
      `📚 <b>Takrorlash kerak</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📖 <b>${count}</b> ta so'z kutmoqda!\n\n` +
      `Quiz orqali takrorlang 🎯`,
      {
        inline_keyboard: [
          [{ text: "🎯 Quiz boshlash", callback_data: "quiz", style: "success" }],
          [{ text: "📱 Ilova", web_app: { url: WEBAPP_URL } }],
          [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
        ],
      }
    );
  } else {
    await sendOrEdit(
      token, chatId, messageId,
      `🎉 <b>Ajoyib!</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Hozircha takrorlash kerak so'z yo'q! ✨\n\n` +
      `Yangi so'zlar qo'shing yoki keyinroq qaytib keling.`,
      {
        inline_keyboard: [
          [{ text: "📱 Leitner App", web_app: { url: WEBAPP_URL } }],
          [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
        ],
      }
    );
  }
}

async function handleStreakCommand(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!");
    return;
  }

  const { data: stats } = await supabase
    .from("user_stats")
    .select("streak")
    .eq("user_id", profile.userId);

  const maxStreak = stats?.reduce((max: number, s: any) => Math.max(max, s.streak || 0), 0) || 0;
  
  const fireEmojis = maxStreak >= 100 ? "🔥🔥🔥🔥🔥" : 
                     maxStreak >= 30 ? "🔥🔥🔥🔥" : 
                     maxStreak >= 7 ? "🔥🔥🔥" : 
                     maxStreak >= 3 ? "🔥🔥" : "🔥";
  
  const messages = [
    [0, "Har kuni o'rganib streak'ingizni oshiring! 💪"],
    [7, "Yaxshi boshladingiz! Davom eting! 💪"],
    [30, "Zo'r natija! Siz muntazamsiz! 🌟"],
    [100, "Ajoyib! Siz haqiqiy o'rganuvchisiz! 🏆"],
    [Infinity, "Incredible! Siz chempionsiz! 👑"],
  ];

  const msg = messages.find(([threshold]) => maxStreak < threshold)![1];

  await sendOrEdit(
    token, chatId, messageId,
    `${fireEmojis}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `<b>Sizning streak:</b> <b>${maxStreak}</b> kun\n\n` +
    `${msg}`,
    {
      inline_keyboard: [
        [{ text: "🎯 Quiz", callback_data: "quiz", style: "success" }, { text: "📊 Statistika", callback_data: "my_stats" }],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleRankCommand(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!");
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

  // Show top 5
  const topUserIds = sorted.slice(0, 5).map(([id]) => id);
  const { data: topProfiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", topUserIds);
  
  const topProfileMap = new Map(topProfiles?.map((p: any) => [p.user_id, p.full_name]) || []);

  let leaderboard = "";
  sorted.slice(0, 5).forEach(([userId, xp], i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `  ${i + 1}.`;
    const name = topProfileMap.get(userId) || "Noma'lum";
    const isMe = userId === profile.userId;
    leaderboard += `${medal} ${isMe ? "<b>" : ""}${name}${isMe ? "</b>" : ""} — ${xp.toLocaleString()} XP\n`;
  });

  const emoji = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank <= 10 ? "🏆" : "📊";

  await sendOrEdit(
    token, chatId, messageId,
    `${emoji} <b>Reyting</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 <b>Top 5:</b>\n` +
    leaderboard +
    `\n━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Siz:</b> #${rank} / ${sorted.length}\n` +
    `💎 XP: <b>${myXp.toLocaleString()}</b>`,
    {
      inline_keyboard: [
        [{ text: "📊 Statistika", callback_data: "my_stats", style: "primary" }],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleStatusCommand(supabase: any, token: string, chatId: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (profile) {
    await sendMessage(
      token, chatId,
      `✅ <b>Hisob ulangan!</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 ${profile.fullName || "Foydalanuvchi"}\n` +
      `📱 Eslatmalar faol`,
      getMainMenuKeyboard()
    );
  } else {
    await sendMessage(token, chatId, "❌ <b>Hisob ulanmagan.</b>\n\n📱 Profil → Telegram → Ulash", getWebAppButton());
  }
}

async function handleWeeklyReport(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
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
  const currentLevel = Math.floor((75 + Math.sqrt(5625 + 300 * currentXp)) / 150);
  const currentStreak = Math.max(...userStats.map((s: any) => s.streak || 0));
  const totalWords = userStats.reduce((sum: number, s: any) => sum + (s.total_words || 0), 0);
  const learnedWords = userStats.reduce((sum: number, s: any) => sum + (s.learned_words || 0), 0);

  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
  const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;
  const progressBar = "▓".repeat(Math.round(progressPercent / 10)) + "░".repeat(10 - Math.round(progressPercent / 10));

  // Week activity visualization
  const dayNames = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  let weekBreakdown = "";
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStat = dailyStats.find((s: any) => s.date === dateStr);
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    weekBreakdown += (dayStat?.words_reviewed || 0) > 0 ? `${dayNames[dayIndex]}🟢 ` : `${dayNames[dayIndex]}⚪ `;
  }

  const motivation = daysActive >= 5 ? "🌟 Ajoyib hafta!" : daysActive >= 3 ? "👍 Yaxshi natija!" : "💪 Ko'proq mashq qiling!";

  await sendOrEdit(
    token, chatId, messageId,
    `📊 <b>Haftalik Hisobot</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>${profile.fullName || 'Foydalanuvchi'}</b>\n\n` +
    `📅 <b>Oxirgi 7 kun:</b>\n${weekBreakdown}\n\n` +
    `📈 <b>Hafta natijalari:</b>\n` +
    `  📝 ${totalReviewed} takrorlangan (${accuracy}%)\n` +
    `  💎 +${totalXp} XP\n` +
    `  📅 ${daysActive}/7 faol kun\n\n` +
    `🏆 <b>Umumiy holat:</b>\n` +
    `  ⭐️ ${currentLevel}-daraja  │  💎 ${currentXp} XP\n` +
    `  🔥 ${currentStreak} kun streak\n\n` +
    `📚 <b>Progress:</b>\n` +
    `  ${progressBar} ${progressPercent}%\n` +
    `  ${learnedWords}/${totalWords} so'z\n\n` +
    `${motivation}`,
    {
      inline_keyboard: [
        [{ text: "📊 Statistika", callback_data: "my_stats", style: "primary" }],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleToggleNotifications(supabase: any, token: string, chatId: number, messageId: number | undefined, enabled: boolean) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
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

  const msg = enabled 
    ? "🔔 <b>Bildirishnomalar yoqildi!</b>" 
    : "🔕 <b>Bildirishnomalar o'chirildi.</b>";
  await sendOrEdit(token, chatId, messageId, msg, getSettingsKeyboard(enabled, settings?.daily_reminder_time?.slice(0, 5)));
}

async function handleSetReminderTime(supabase: any, token: string, chatId: number, messageId: number | undefined, time: string) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  await supabase
    .from("notification_settings")
    .upsert({ user_id: profile.userId, daily_reminder_time: time, telegram_enabled: true }, { onConflict: "user_id" });

  await sendOrEdit(
    token, chatId, messageId,
    `✅ <b>Eslatma vaqti: ${time}</b>\n\nHar kuni shu vaqtda eslatma olasiz. ⏰`,
    getSettingsKeyboard(true, time)
  );
}

// ============ CONTEST HANDLERS ============

async function handleContestCommand(supabase: any, token: string, chatId: number, messageId?: number) {
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
    await sendOrEdit(token, chatId, messageId, 
      "📢 <b>Hozirda faol konkurs yo'q</b>\n\n" +
      "Yangi konkurslar haqida xabar olish uchun kanalimizga obuna bo'ling!", 
      getMainMenuKeyboard()
    );
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
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `  ${i + 1}.`;
    const name = profileMap.get(l.user_id) || l.telegram_username || "Noma'lum";
    const isMe = profile && l.user_id === profile.userId;
    leaderboard += `${medal} ${isMe ? "<b>" : ""}${name}${isMe ? "</b>" : ""} — ${l.referral_count} ta\n`;
  });

  const prizes = contest.prizes?.map((p: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `  ${i + 1}.`;
    return `${medal} ${p.prize}`;
  }).join("\n") || "";

  let message = 
    `🏆 <b>${contest.title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    (contest.description ? `${contest.description}\n\n` : "") +
    `⏰ ${daysLeft} kun qoldi  │  👥 ${participantCount || 0} ishtirokchi\n\n` +
    `🎁 <b>Sovg'alar:</b>\n${prizes}\n\n` +
    (leaderboard ? `📊 <b>Top 5:</b>\n${leaderboard}\n` : "");

  if (isParticipating && userStats) {
    message += `\n✅ <b>Siz qatnashyapsiz!</b>\n` +
      `📊 O'rningiz: #${userRank}\n` +
      `👥 Takliflaringiz: <b>${userStats.referral_count}</b> ta\n\n` +
      `🔗 <b>Havolangiz:</b>\n<code>${referralLink}</code>`;
  }

  const keyboard = isParticipating
    ? {
        inline_keyboard: [
          [{ text: "📤 Ulashish", callback_data: "share_contest", style: "success" }],
          [{ text: "📊 Statistikam", callback_data: "my_contest_stats", style: "primary" }],
          [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
        ],
      }
    : {
        inline_keyboard: [
          [{ text: "🚀 Qatnashish", callback_data: "join_contest", style: "success" }],
          [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
        ],
      };

  if (contest.image_url && !messageId) {
    await sendPhoto(token, chatId, contest.image_url, message, keyboard);
  } else {
    await sendOrEdit(token, chatId, messageId, message, keyboard);
  }
}

async function handleJoinContest(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!\n\n📱 Profil → Telegram → Ulash", getWebAppButton());
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
    await sendOrEdit(token, chatId, messageId, "❌ Hozirda faol konkurs yo'q.", getMainMenuKeyboard());
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
    await sendOrEdit(token, chatId, messageId, "❌ Xatolik yuz berdi.");
    return;
  }

  const referralLink = `https://t.me/Leitner_robot?start=cref_${contest.id.slice(0, 8)}_${profile.userId.slice(0, 8)}`;

  await sendOrEdit(
    token, chatId, messageId,
    `🎉 <b>Konkursga qo'shildingiz!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🏆 ${contest.title}\n\n` +
    `Do'stlaringizni taklif qiling va sovg'a yutib oling!\n\n` +
    `🔗 <b>Sizning havolangiz:</b>\n<code>${referralLink}</code>\n\n` +
    `⚠️ Taklif qilingan do'st kamida 1 ta so'z qo'shishi kerak!`,
    {
      inline_keyboard: [
        [{ text: "📤 Ulashish", callback_data: "share_contest", style: "success" }],
        [{ text: "🏆 Konkurs sahifasi", callback_data: "contest", style: "primary" }],
        [{ text: "◀️ Menyu", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function handleMyContestStats(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);

  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!\n\n📱 Profil → Telegram → Ulash", getWebAppButton());
    return;
  }

  const { data: contest } = await supabase
    .from("contests")
    .select("id, title, end_date, min_referrals, contest_type")
    .eq("is_active", true)
    .lte("start_date", new Date().toISOString())
    .gt("end_date", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!contest) {
    await sendOrEdit(token, chatId, messageId, "📢 Hozirda faol konkurs yo'q.", getMainMenuKeyboard());
    return;
  }

  const [
    participationRes,
    totalParticipantsRes,
    validReferralsRes,
    pendingReferralsRes,
    leaderboardRes,
  ] = await Promise.all([
    supabase
      .from("contest_participants")
      .select("referral_count, words_added, xp_earned, joined_at")
      .eq("contest_id", contest.id)
      .eq("user_id", profile.userId)
      .maybeSingle(),
    supabase
      .from("contest_participants")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contest.id),
    supabase
      .from("contest_referrals")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contest.id)
      .eq("referrer_user_id", profile.userId)
      .eq("is_valid", true),
    supabase
      .from("contest_referrals")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contest.id)
      .eq("referrer_user_id", profile.userId)
      .eq("is_valid", false),
    supabase.rpc("get_contest_leaderboard", { p_contest_id: contest.id }),
  ]);

  const participation = participationRes.data;

  if (!participation) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval konkursga qo'shiling!", {
      inline_keyboard: [[{ text: "🚀 Qatnashish", callback_data: "join_contest", style: "success" }]],
    });
    return;
  }

  const leaderboard = leaderboardRes.data || [];
  const myRow = leaderboard.find((r: any) => r.user_id === profile.userId);
  const myRank = myRow?.rank || 0;

  const endDate = new Date(contest.end_date);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const referralCount = participation.referral_count || 0;
  const validReferrals = validReferralsRes.count || 0;
  const pendingReferrals = pendingReferralsRes.count || 0;
  const totalParticipants = totalParticipantsRes.count || 0;
  const minReferrals = contest.min_referrals || 0;
  const remaining = Math.max(0, minReferrals - referralCount);

  const referralLink = `https://t.me/Leitner_robot?start=cref_${contest.id.slice(0, 8)}_${profile.userId.slice(0, 8)}`;

  const metricLabel = contest.contest_type === "referral" ? "👥 Referallar" : "📊 Natija";

  // Build leaderboard text
  let leaderboardText = "";
  if (leaderboard.length > 0) {
    leaderboardText = "\n\n📊 <b>Top 5:</b>\n";
    leaderboard.slice(0, 5).forEach((l: any) => {
      const medal = l.rank === 1 ? "🥇" : l.rank === 2 ? "🥈" : l.rank === 3 ? "🥉" : `  ${l.rank}.`;
      const name = l.full_name || l.telegram_username || "Noma'lum";
      const isMe = l.user_id === profile.userId;
      leaderboardText += `${medal} ${isMe ? "<b>" : ""}${name}${isMe ? "</b>" : ""} — ${l.referral_count} ta\n`;
    });
  }

  const pendingExplanation = pendingReferrals > 0
    ? `\n\n💡 <i>Kutilayotgan referallar — do'stlaringiz 1 ta so'z qo'shganda tasdiqlanadi</i>`
    : "";

  await sendOrEdit(
    token,
    chatId,
    messageId,
    `📊 <b>${contest.title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `⏰ ${daysLeft} kun qoldi  │  👥 ${totalParticipants} ishtirokchi\n\n` +
    `👤 <b>Sizning natijangiz:</b>\n` +
    `  🏅 Reyting: ${myRank ? `<b>#${myRank}</b>` : "—"}\n` +
    `  ${metricLabel}: <b>${referralCount}</b> ta\n` +
    `  ✅ Tasdiqlangan: <b>${validReferrals}</b> ta\n` +
    `  ⏳ Kutilayotgan: <b>${pendingReferrals}</b> ta\n` +
    (minReferrals > 0 ? `  🎯 Maqsad: ${minReferrals} ta (${remaining} ta qoldi)\n` : "") +
    `\n🔗 <b>Havolangiz:</b>\n<code>${referralLink}</code>` +
    pendingExplanation +
    leaderboardText,
    {
      inline_keyboard: [
        [{ text: "📤 Ulashish", callback_data: "share_contest", style: "success" }],
        [{ text: "🏆 Konkurs", callback_data: "contest", style: "primary" }],
        [{ text: "◀️ Menyu", callback_data: "back_to_menu" }],
      ],
    }
  );
}

// Handle share contest - send referral link for sharing
async function handleShareContest(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
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
    await sendOrEdit(token, chatId, messageId, "❌ Hozirda faol konkurs yo'q.", getMainMenuKeyboard());
    return;
  }

  // Check if user is participating
  const { data: participation } = await supabase
    .from("contest_participants")
    .select("referral_count")
    .eq("contest_id", contest.id)
    .eq("user_id", profile.userId)
    .maybeSingle();

  if (!participation) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval konkursga qo'shiling!", {
      inline_keyboard: [
        [{ text: "🚀 Qatnashish", callback_data: "join_contest", style: "success" }],
      ],
    });
    return;
  }

  const referralLink = `https://t.me/Leitner_robot?start=cref_${contest.id.slice(0, 8)}_${profile.userId.slice(0, 8)}`;

  const shareText = 
    `🏆 ${contest.title}\n\n` +
    `Men bu konkursda qatnashyapman! Sen ham qo'shil va sovg'a yutib ol!\n\n` +
    `👉 ${referralLink}`;

  await sendOrEdit(
    token, chatId, messageId,
    `📤 <b>Do'stlaringizga ulashing!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🔗 <b>Sizning havolangiz:</b>\n<code>${referralLink}</code>\n\n` +
    `👥 Sizning takliflaringiz: <b>${participation.referral_count}</b> ta\n\n` +
    `💡 Havolani do'stlaringizga yuboring!`,
    {
      inline_keyboard: [
        [{ text: "📨 Telegram orqali ulashish", url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`, style: "success" }],
        [{ text: "🏆 Konkurs sahifasi", callback_data: "contest", style: "primary" }],
        [{ text: "◀️ Menyu", callback_data: "back_to_menu" }],
      ],
    }
  );
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
  const emojis: Record<string, string> = {
    en: "🇬🇧", ru: "🇷🇺", uz: "🇺🇿", de: "🇩🇪", fr: "🇫🇷",
    es: "🇪🇸", ar: "🇸🇦", ko: "🇰🇷", ja: "🇯🇵", zh: "🇨🇳",
    tr: "🇹🇷", it: "🇮🇹", pt: "🇵🇹", hi: "🇮🇳", fa: "🇮🇷",
  };
  return emojis[lang] || "🌐";
}

function getLanguageName(lang: string): string {
  const names: Record<string, string> = {
    en: "Inglizcha", ru: "Ruscha", uz: "O'zbekcha", de: "Nemischa", fr: "Fransuzcha",
    es: "Ispancha", ar: "Arabcha", ko: "Koreyscha", ja: "Yaponcha", zh: "Xitoycha",
    tr: "Turkcha", it: "Italyancha", pt: "Portugalcha", hi: "Hindcha", fa: "Forscha",
  };
  return names[lang] || lang.toUpperCase();
}

function getMainMenuMessage(): string {
  return (
    `🏠 <b>Asosiy menyu</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Quyidagi bo'limlardan birini tanlang 👇`
  );
}

function getWelcomeText(): string {
  return (
    `👋 <b>Salom! Leitner App'ga xush kelibsiz!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📚 <b>Imkoniyatlar:</b>\n\n` +
    `  📝 So'z qo'shish:\n` +
    `  <code>/add so'z - tarjima</code>\n\n` +
    `  🎯 Quiz: /quiz\n` +
    `  🔍 Inline: @Leitner_robot\n` +
    `  🏆 Challenge: /challenge\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔗 Hisobni ulash:\n` +
    `Profil → Telegram → Ulash`
  );
}

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🎯 Quiz", callback_data: "quiz", style: "success" }, 
        { text: "📚 Takrorlash", callback_data: "words_to_review", style: "success" }
      ],
      [
        { text: "📊 Statistika", callback_data: "my_stats", style: "primary" }, 
        { text: "🔥 Streak", callback_data: "my_streak", style: "primary" }
      ],
      [
        { text: "🏆 Challenge", callback_data: "challenge", style: "primary" }, 
        { text: "🎖 Konkurs", callback_data: "contest", style: "primary" }
      ],
      [{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
      [{ text: "⚙️ Sozlamalar", callback_data: "settings" }],
    ],
  };
}

function getSettingsKeyboard(notificationsEnabled: boolean, currentTime?: string) {
  return {
    inline_keyboard: [
      [notificationsEnabled 
        ? { text: "🔔 Bildirishnoma: Yoqilgan ✅", callback_data: "notif_off", style: "success" }
        : { text: "🔕 Bildirishnoma: O'chirilgan ❌", callback_data: "notif_on", style: "danger" }],
      [{ text: `⏰ Vaqt: ${currentTime || '09:00'}`, callback_data: "set_time" }],
      [
        { text: "🌅 06:00", callback_data: "time_06:00" }, 
        { text: "🌄 08:00", callback_data: "time_08:00" }, 
        { text: "☀️ 09:00", callback_data: "time_09:00" }
      ],
      [
        { text: "🌤 12:00", callback_data: "time_12:00" }, 
        { text: "🌆 18:00", callback_data: "time_18:00" }, 
        { text: "🌙 21:00", callback_data: "time_21:00" }
      ],
      [{ text: "📊 Haftalik hisobot", callback_data: "weekly_report", style: "primary" }],
      [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
    ],
  };
}

function getWebAppButton() {
  return { inline_keyboard: [[{ text: "📱 Leitner App", web_app: { url: WEBAPP_URL } }]] };
}

async function sendWelcomeMessage(token: string, chatId: number) {
  await sendMessage(
    token, chatId,
    getWelcomeText(),
    getMainMenuKeyboard()
  );
}

async function sendHelpMessage(token: string, chatId: number, messageId?: number) {
  await sendOrEdit(
    token, chatId, messageId,
    `📖 <b>Leitner App Bot — Yordam</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📝 <b>So'z qo'shish:</b>\n` +
    `  <code>/add hello - salom</code>\n\n` +
    `🎮 <b>O'yin va o'rganish:</b>\n` +
    `  /quiz — so'zlarni takrorlash\n` +
    `  /challenge — haftalik musobaqa\n` +
    `  /contest — konkurs\n\n` +
    `📊 <b>Statistika:</b>\n` +
    `  /stats — umumiy statistika\n` +
    `  /review — takrorlash kerak so'zlar\n` +
    `  /streak — streak\n` +
    `  /rank — reyting\n\n` +
    `📤 <b>Boshqa:</b>\n` +
    `  /menu — asosiy menyu\n` +
    `  @Leitner_robot — inline so'z ulashish`,
    {
      inline_keyboard: [
        [{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
        [{ text: "◀️ Orqaga", callback_data: "back_to_menu" }],
      ],
    }
  );
}

async function sendSettingsMenu(supabase: any, token: string, chatId: number, messageId?: number) {
  const profile = await getCachedProfile(supabase, chatId);
  if (!profile) {
    await sendOrEdit(token, chatId, messageId, "❌ Avval hisobingizni ulang!", getWebAppButton());
    return;
  }

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("telegram_enabled, daily_reminder_time")
    .eq("user_id", profile.userId)
    .maybeSingle();

  await sendOrEdit(
    token, chatId, messageId,
    `⚙️ <b>Sozlamalar</b>\n` +
    `━━━━━━━━━━━━━━━━━━`,
    getSettingsKeyboard(settings?.telegram_enabled || false, settings?.daily_reminder_time?.slice(0, 5))
  );
}

async function sendTimeSettingsInfo(token: string, chatId: number, messageId?: number) {
  await sendOrEdit(token, chatId, messageId, 
    "⏰ <b>Eslatma vaqtini tanlang</b>\n" +
    "━━━━━━━━━━━━━━━━━━\n\n" +
    "Quyidagi vaqtlardan birini tanlang:"
  );
}

// ============ PAYMENT APPROVAL HANDLER ============

async function handlePaymentAction(supabase: any, token: string, chatId: number, messageId: number, data: string) {
  const isApprove = data.startsWith("pay_approve_");
  const paymentId = data.replace(isApprove ? "pay_approve_" : "pay_reject_", "");

  // Get payment
  const { data: payment, error } = await supabase
    .from("premium_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (error || !payment) {
    await editMessageOrCaption(token, chatId, messageId, "❌ To'lov topilmadi.");
    return;
  }

  if (payment.status !== "pending") {
    await editMessageOrCaption(token, chatId, messageId, `⚠️ Bu to'lov allaqachon ${payment.status === "approved" ? "tasdiqlangan" : "rad etilgan"}.`);
    return;
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, telegram_chat_id")
    .eq("user_id", payment.user_id)
    .single();

  const userName = profile?.full_name || "Nomsiz";

  if (isApprove) {
    // Update payment status
    const { error: updateErr } = await supabase
      .from("premium_payments")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (updateErr) {
      await editMessageOrCaption(token, chatId, messageId, "❌ Xatolik: " + updateErr.message);
      return;
    }

    // Calculate expiry
    const durationDays = payment.plan === "monthly" ? 30 : payment.plan === "quarterly" ? 90 : 365;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Upsert subscription
    await supabase
      .from("subscriptions")
      .upsert({
        user_id: payment.user_id,
        plan: payment.plan,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    // Update admin message
    await editMessageOrCaption(token, chatId, messageId,
      `✅ <b>To'lov tasdiqlandi!</b>\n\n` +
      `👤 ${userName}\n` +
      `📋 ${payment.plan}\n` +
      `💵 ${Number(payment.amount).toLocaleString()} so'm\n` +
      `📅 Tugash: ${new Date(expiresAt).toLocaleDateString("uz-UZ")}`
    );

    // Notify user via Telegram
    if (profile?.telegram_chat_id) {
      await sendMessage(token, profile.telegram_chat_id,
        `🎉 <b>Tabriklaymiz! Siz Premium oldingiz!</b> 👑\n\n` +
        `📋 Reja: <b>${payment.plan}</b>\n` +
        `📅 Tugash: <b>${new Date(expiresAt).toLocaleDateString("uz-UZ")}</b>\n\n` +
        `Endi barcha funksiyalardan cheksiz foydalanishingiz mumkin! 🚀`,
        { inline_keyboard: [[{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }]] }
      );
    }

    // Send Purchase conversion to Meta Ads
    await sendMetaConversionForUser(supabase, payment.user_id, "Purchase", Number(payment.amount), "UZS");
  } else {
    // Reject
    await supabase
      .from("premium_payments")
      .update({
        status: "rejected",
        admin_note: "Telegram orqali rad etildi",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    await editMessageOrCaption(token, chatId, messageId,
      `❌ <b>To'lov rad etildi</b>\n\n` +
      `👤 ${userName}\n` +
      `💵 ${Number(payment.amount).toLocaleString()} so'm`
    );

    // Notify user
    if (profile?.telegram_chat_id) {
      await sendMessage(token, profile.telegram_chat_id,
        `😔 <b>To'lovingiz rad etildi</b>\n\n` +
        `Iltimos, to'lov ma'lumotlarini tekshirib qaytadan urinib ko'ring.\n` +
        `Savol bo'lsa, admin bilan bog'laning.`,
        { inline_keyboard: [[{ text: "📱 Qayta urinish", web_app: { url: WEBAPP_URL + "/premium" } }]] }
      );
    }
  }
}

// Try editMessageCaption first (for photo messages), fall back to editMessageText
async function editMessageOrCaption(token: string, chatId: number, messageId: number, text: string, replyMarkup?: any) {
  // Try caption edit first (works for photo/document messages)
  const captionBody: any = {
    chat_id: chatId,
    message_id: messageId,
    caption: text,
    parse_mode: "HTML",
  };
  if (replyMarkup) captionBody.reply_markup = replyMarkup;

  const captionRes = await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(captionBody),
  });

  if (captionRes.ok) return captionRes;

  // Fall back to text edit (for text-only messages)
  return editMessage(token, chatId, messageId, text, replyMarkup);
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
