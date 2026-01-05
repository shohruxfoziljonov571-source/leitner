import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Handle /start command with deep link
    if (update.message?.text?.startsWith("/start")) {
      const chatId = update.message.chat.id;
      const username = update.message.from?.username || null;
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
                "✅ Muvaffaqiyatli ulandi!\n\n" +
                "Endi siz so'zlarni takrorlash eslatmalarini shu yerda olasiz.\n\n" +
                "🔔 Eslatmalar sozlamalarini ilovada boshqarishingiz mumkin."
              );
            }
          }
        } catch (e) {
          console.error("Error parsing deep link:", e);
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            "👋 Salom! Leitner App botiga xush kelibsiz!\n\n" +
            "Bu bot orqali so'zlarni takrorlash eslatmalarini olasiz.\n\n" +
            "📱 Ilovadan botni ulash uchun:\n" +
            "Profil → Telegram → Ulash tugmasini bosing"
          );
        }
      } else {
        // No deep link - just a regular /start
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          "👋 Salom! Leitner App botiga xush kelibsiz!\n\n" +
          "Bu bot orqali so'zlarni takrorlash eslatmalarini olasiz.\n\n" +
          "📱 Ilovadan botni ulash uchun:\n" +
          "Profil → Telegram → Ulash tugmasini bosing"
        );
      }
    }

    // Handle /help command
    if (update.message?.text === "/help") {
      const chatId = update.message.chat.id;
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        "📚 Leitner App Bot\n\n" +
        "Bu bot sizga so'zlarni takrorlash vaqti kelganda eslatma yuboradi.\n\n" +
        "Buyruqlar:\n" +
        "/start - Botni ishga tushirish\n" +
        "/status - Ulanish holatini tekshirish\n" +
        "/help - Yordam\n\n" +
        "❓ Savollar uchun: Ilovadagi Sozlamalar bo'limiga o'ting"
      );
    }

    // Handle /status command
    if (update.message?.text === "/status") {
      const chatId = update.message.chat.id;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("telegram_chat_id", chatId)
        .maybeSingle();

      if (profile) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `✅ Hisob ulangan!\n\n👤 ${profile.full_name || "Foydalanuvchi"}\n\n📱 Eslatmalar faol`
        );
      } else {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          "❌ Hisob ulanmagan.\n\n📱 Ilovadan botni ulash uchun:\nProfil → Telegram → Ulash"
        );
      }
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
