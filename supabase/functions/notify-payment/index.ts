import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_CHAT_ID = 6772074562;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { payment_id } = await req.json();

    if (!payment_id) throw new Error("payment_id required");

    // Get payment details
    const { data: payment, error: payError } = await supabase
      .from("premium_payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (payError || !payment) throw new Error("Payment not found");

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, telegram_username, telegram_chat_id")
      .eq("user_id", payment.user_id)
      .single();

    const userName = profile?.full_name || "Nomsiz";
    const tgUsername = profile?.telegram_username ? `@${profile.telegram_username}` : "—";

    const planLabels: Record<string, string> = {
      monthly: "1 oy",
      quarterly: "3 oy",
      yearly: "1 yil",
    };

    const text =
      `💰 <b>Yangi to'lov!</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Foydalanuvchi:</b> ${userName}\n` +
      `📱 <b>Telegram:</b> ${tgUsername}\n` +
      `📋 <b>Reja:</b> ${planLabels[payment.plan] || payment.plan}\n` +
      `💵 <b>Summa:</b> ${Number(payment.amount).toLocaleString()} so'm\n` +
      `📅 <b>Sana:</b> ${new Date(payment.created_at).toLocaleString("uz-UZ")}\n\n` +
      `⏳ Tasdiqlash yoki rad etish uchun tugmalarni bosing:`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "✅ Tasdiqlash", callback_data: `pay_approve_${payment_id}` },
          { text: "❌ Rad etish", callback_data: `pay_reject_${payment_id}` },
        ],
      ],
    };

    // Send receipt photo if available
    if (payment.receipt_url) {
      const { data: signedUrlData } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(payment.receipt_url, 3600);

      if (signedUrlData?.signedUrl) {
        // Send photo with caption
        const photoBody = {
          chat_id: ADMIN_CHAT_ID,
          photo: signedUrlData.signedUrl,
          caption: text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        };

        const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(photoBody),
        });

        if (photoRes.ok) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // If photo fails, fall through to text-only
      }
    }

    // Send text-only message
    const msgBody = {
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    };

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msgBody),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
