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

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Checking for contests that just ended...");

    // Find contests that ended in the last hour and are still active
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: endedContests, error: contestError } = await supabase
      .from("contests")
      .select("*")
      .eq("is_active", true)
      .lte("end_date", now)
      .gte("end_date", oneHourAgo);

    if (contestError) {
      console.error("Error fetching contests:", contestError);
      throw contestError;
    }

    if (!endedContests || endedContests.length === 0) {
      console.log("No contests to finalize");
      return new Response(JSON.stringify({ message: "No contests to finalize" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const contest of endedContests) {
      console.log(`Finalizing contest: ${contest.title} (${contest.id})`);

      // Get top participants based on contest type
      let orderColumn = "referral_count";
      if (contest.contest_type === "xp") orderColumn = "xp_earned";
      else if (contest.contest_type === "words") orderColumn = "words_added";

      const { data: topParticipants, error: participantsError } = await supabase
        .from("contest_participants")
        .select("*")
        .eq("contest_id", contest.id)
        .order(orderColumn, { ascending: false })
        .limit(contest.winner_count);

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        continue;
      }

      if (!topParticipants || topParticipants.length === 0) {
        console.log(`No participants for contest: ${contest.id}`);
        continue;
      }

      // Get profile names for winners
      const userIds = topParticipants.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, telegram_chat_id")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { name: p.full_name, chatId: p.telegram_chat_id }]) || []
      );

      // Prepare winners list and send notifications
      const winners = [];
      const prizes = contest.prizes || [];

      for (let i = 0; i < topParticipants.length; i++) {
        const participant = topParticipants[i];
        const profile = profileMap.get(participant.user_id);
        const prize = prizes[i]?.prize || `${i + 1}-o'rin`;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

        winners.push({
          rank: i + 1,
          userId: participant.user_id,
          name: profile?.name || participant.telegram_username || "Noma'lum",
          score: participant[orderColumn] || 0,
          prize,
        });

        // Send Telegram notification to winner
        const chatId = participant.telegram_chat_id || profile?.chatId;
        if (chatId) {
          const message =
            `🎉 <b>Tabriklaymiz!</b>\n\n` +
            `${medal} Siz <b>${contest.title}</b> konkursida <b>${i + 1}-o'rin</b>ni egallladingiz!\n\n` +
            `🏆 <b>Sovg'angiz:</b> ${prize}\n\n` +
            `📊 Sizning natijangiz: ${participant[orderColumn]} ta\n\n` +
            `Sovg'angizni olish uchun admin bilan bog'laning.`;

          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, message);
          console.log(`Notification sent to winner: ${profile?.name || participant.telegram_username}`);
        }
      }

      // Mark contest as inactive
      await supabase
        .from("contests")
        .update({ is_active: false })
        .eq("id", contest.id);

      // Send announcement to all participants
      const { data: allParticipants } = await supabase
        .from("contest_participants")
        .select("telegram_chat_id, user_id")
        .eq("contest_id", contest.id);

      if (allParticipants) {
        const winnersText = winners
          .map((w, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            return `${medal} ${w.name} - ${w.score} ta → ${w.prize}`;
          })
          .join("\n");

        const announcementMessage =
          `🏆 <b>${contest.title} - NATIJALAR!</b>\n\n` +
          `Konkurs tugadi! Mana g'oliblar:\n\n` +
          `${winnersText}\n\n` +
          `🎉 G'oliblarga tabriklar!\n\n` +
          `Keyingi konkurslarda ham ishtirok eting!`;

        // Send to non-winners only (winners already got personal message)
        const winnerUserIds = new Set(winners.map(w => w.userId));
        for (const participant of allParticipants) {
          if (!winnerUserIds.has(participant.user_id) && participant.telegram_chat_id) {
            await sendTelegramMessage(TELEGRAM_BOT_TOKEN, participant.telegram_chat_id, announcementMessage);
          }
        }
      }

      results.push({
        contestId: contest.id,
        contestTitle: contest.title,
        winnersCount: winners.length,
        winners,
      });

      console.log(`Contest finalized: ${contest.title}, Winners: ${winners.length}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Finalized ${results.length} contests`,
        results,
      }),
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

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to send message to ${chatId}:`, error);
    }
    return response.ok;
  } catch (error) {
    console.error(`Error sending message to ${chatId}:`, error);
    return false;
  }
}
