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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { type, duel_id, user_id } = await req.json();

    if (type === "duel_invite") {
      await handleDuelInvite(supabase, TELEGRAM_BOT_TOKEN, duel_id, user_id);
    } else if (type === "duel_accepted") {
      await handleDuelAccepted(supabase, TELEGRAM_BOT_TOKEN, duel_id);
    } else if (type === "duel_completed") {
      await handleDuelCompleted(supabase, TELEGRAM_BOT_TOKEN, duel_id);
    } else if (type === "duel_declined") {
      await handleDuelDeclined(supabase, TELEGRAM_BOT_TOKEN, duel_id, user_id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleDuelInvite(supabase: any, token: string, duelId: string, opponentId: string) {
  // Get duel info
  const { data: duel } = await supabase
    .from("word_duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (!duel) return;

  // Get profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, telegram_chat_id")
    .in("user_id", [duel.challenger_id, duel.opponent_id]);

  const challenger = profiles?.find((p: any) => p.user_id === duel.challenger_id);
  const opponent = profiles?.find((p: any) => p.user_id === duel.opponent_id);

  if (!opponent?.telegram_chat_id) return;

  const message = 
    `⚔️ <b>Yangi duel taklifi!</b>\n\n` +
    `👤 <b>${challenger?.full_name || "Kimdir"}</b> sizni duelga chaqirmoqda!\n\n` +
    `📚 ${duel.word_count} so'z\n` +
    `⏰ 24 soat ichida javob bering\n\n` +
    `🎯 Kim tezroq va to'g'ri tarjima qilsa - g'olib!`;

  await sendMessage(token, opponent.telegram_chat_id, message, {
    inline_keyboard: [
      [{ text: "✅ Qabul qilish", web_app: { url: `${WEBAPP_URL}/friends` } }],
      [{ text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
    ],
  });
}

async function handleDuelAccepted(supabase: any, token: string, duelId: string) {
  const { data: duel } = await supabase
    .from("word_duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (!duel) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, telegram_chat_id")
    .in("user_id", [duel.challenger_id, duel.opponent_id]);

  const challenger = profiles?.find((p: any) => p.user_id === duel.challenger_id);
  const opponent = profiles?.find((p: any) => p.user_id === duel.opponent_id);

  // Notify challenger
  if (challenger?.telegram_chat_id) {
    const message = 
      `🎮 <b>Duel qabul qilindi!</b>\n\n` +
      `👤 <b>${opponent?.full_name || "Raqib"}</b> duelingizni qabul qildi!\n\n` +
      `⚔️ ${duel.word_count} so'z - kim g'olib bo'ladi?\n` +
      `🚀 O'ynashni boshlang!`;

    await sendMessage(token, challenger.telegram_chat_id, message, {
      inline_keyboard: [
        [{ text: "🎮 O'ynash", web_app: { url: `${WEBAPP_URL}/friends` } }],
      ],
    });
  }
}

async function handleDuelCompleted(supabase: any, token: string, duelId: string) {
  const { data: duel } = await supabase
    .from("word_duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (!duel) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, telegram_chat_id")
    .in("user_id", [duel.challenger_id, duel.opponent_id]);

  const challenger = profiles?.find((p: any) => p.user_id === duel.challenger_id);
  const opponent = profiles?.find((p: any) => p.user_id === duel.opponent_id);
  const winner = profiles?.find((p: any) => p.user_id === duel.winner_id);
  const isDraw = !duel.winner_id;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const resultText = isDraw 
    ? "🤝 <b>Durrang!</b>" 
    : `🏆 <b>G'olib: ${winner?.full_name || "Noma'lum"}</b>`;

  const message = 
    `⚔️ <b>Duel tugadi!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${resultText}\n\n` +
    `📊 <b>Natijalar:</b>\n` +
    `👤 ${challenger?.full_name || "Challenger"}: ${duel.challenger_score}/${duel.word_count} (${formatTime(duel.challenger_time_ms)})\n` +
    `👤 ${opponent?.full_name || "Opponent"}: ${duel.opponent_score}/${duel.word_count} (${formatTime(duel.opponent_time_ms)})\n\n` +
    (isDraw 
      ? "🎯 Keyingi duelda g'olib aniqlanadi!" 
      : duel.winner_id === duel.challenger_id 
        ? `🎉 Tabriklaymiz, ${challenger?.full_name}!` 
        : `🎉 Tabriklaymiz, ${opponent?.full_name}!`);

  // Notify both players
  for (const profile of [challenger, opponent]) {
    if (profile?.telegram_chat_id) {
      const isWinner = profile.user_id === duel.winner_id;
      const emoji = isDraw ? "🤝" : isWinner ? "🎉" : "😢";
      
      await sendMessage(token, profile.telegram_chat_id, message, {
        inline_keyboard: [
          [{ text: `${emoji} Batafsil ko'rish`, web_app: { url: `${WEBAPP_URL}/friends` } }],
          [{ text: "⚔️ Qayta duel", web_app: { url: `${WEBAPP_URL}/friends` } }],
        ],
      });
    }
  }
}

async function handleDuelDeclined(supabase: any, token: string, duelId: string, declinerId: string) {
  const { data: duel } = await supabase
    .from("word_duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (!duel) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, telegram_chat_id")
    .in("user_id", [duel.challenger_id, duel.opponent_id]);

  const challenger = profiles?.find((p: any) => p.user_id === duel.challenger_id);
  const decliner = profiles?.find((p: any) => p.user_id === declinerId);

  if (challenger?.telegram_chat_id) {
    const message = 
      `❌ <b>Duel rad etildi</b>\n\n` +
      `👤 ${decliner?.full_name || "Raqib"} duel taklifingizni rad etdi.\n\n` +
      `💡 Boshqa do'stingizni duelga chaqiring!`;

    await sendMessage(token, challenger.telegram_chat_id, message, {
      inline_keyboard: [
        [{ text: "⚔️ Yangi duel", web_app: { url: `${WEBAPP_URL}/friends` } }],
      ],
    });
  }
}

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
