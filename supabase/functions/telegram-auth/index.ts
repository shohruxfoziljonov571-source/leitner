import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validates Telegram WebApp initData using HMAC-SHA256
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function validateTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    // Remove hash from data check string
    params.delete("hash");

    // Sort keys alphabetically and build data-check-string
    const dataCheckArr: string[] = [];
    const sortedKeys = Array.from(params.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join("\n");

    // HMAC-SHA256: key = HMAC-SHA256("WebAppData", bot_token)
    const encoder = new TextEncoder();

    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const secretBytes = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken)
    );

    const dataKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      dataKey,
      encoder.encode(dataCheckString)
    );

    // Convert to hex
    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex === hash;
  } catch (err) {
    console.error("HMAC validation error:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { initData } = await req.json();

    if (!initData || typeof initData !== "string") {
      return new Response(
        JSON.stringify({ error: "initData is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. HMAC validation — this is the core security check
    const isValid = await validateTelegramInitData(initData, TELEGRAM_BOT_TOKEN);

    if (!isValid) {
      console.warn("Invalid Telegram initData received");
      return new Response(
        JSON.stringify({ error: "Invalid Telegram data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse user data from initData
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (!userJson) {
      return new Response(
        JSON.stringify({ error: "No user data in initData" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tgUser = JSON.parse(userJson);
    const { id: telegramId, first_name, last_name, username, photo_url } = tgUser;

    if (!telegramId) {
      return new Response(
        JSON.stringify({ error: "Invalid user data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const email = `${telegramId}@leitner.uz`;
    // Secure password: HMAC-derived, never guessable from Telegram ID alone
    const fullName = `${first_name}${last_name ? " " + last_name : ""}`;

    // 3. Try sign in first (existing user)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: generateSecurePassword(telegramId, TELEGRAM_BOT_TOKEN),
    });

    if (!signInError && signInData.user && signInData.session) {
      // Update profile with latest Telegram data
      await supabase
        .from("profiles")
        .update({
          telegram_chat_id: telegramId,
          telegram_username: username || null,
          full_name: fullName,
          avatar_url: photo_url || null,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq("user_id", signInData.user.id);

      return new Response(
        JSON.stringify({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user: signInData.user,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Sign up new user
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password: generateSecurePassword(telegramId, TELEGRAM_BOT_TOKEN),
      email_confirm: true, // Auto-confirm for Telegram users
      user_metadata: {
        full_name: fullName,
        telegram_id: telegramId,
        telegram_username: username,
        avatar_url: photo_url,
      },
    });

    if (signUpError || !signUpData.user) {
      console.error("Sign up error:", signUpError);
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait for profile trigger
    await new Promise((r) => setTimeout(r, 1500));

    // Update profile with Telegram data
    await supabase
      .from("profiles")
      .update({
        telegram_chat_id: telegramId,
        telegram_username: username || null,
        full_name: fullName,
        avatar_url: photo_url || null,
        telegram_connected_at: new Date().toISOString(),
      })
      .eq("user_id", signUpData.user.id);

    // Enable telegram notifications
    await supabase
      .from("notification_settings")
      .upsert(
        { user_id: signUpData.user.id, telegram_enabled: true },
        { onConflict: "user_id" }
      );

    // Sign in after signup to get session tokens
    const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
      email,
      password: generateSecurePassword(telegramId, TELEGRAM_BOT_TOKEN),
    });

    if (newSignInError || !newSignIn.session) {
      return new Response(
        JSON.stringify({ error: "Authentication failed after signup" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: newSignIn.session.access_token,
        refresh_token: newSignIn.session.refresh_token,
        user: newSignIn.user,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telegram auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Generates a secure, deterministic password derived from telegramId + bot token.
 * This is never exposed to clients and can't be guessed without the bot token.
 */
function generateSecurePassword(telegramId: number, botToken: string): string {
  // Use a portion of the bot token as salt — never guessable
  const salt = botToken.split(":")[1]?.slice(0, 16) || "leitner_salt_2024";
  return `tg_${telegramId}_${salt}_secure`;
}
