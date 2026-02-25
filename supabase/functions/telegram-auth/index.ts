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

    params.delete("hash");

    const dataCheckArr: string[] = [];
    const sortedKeys = Array.from(params.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join("\n");

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

    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex === hash;
  } catch (err) {
    console.error("HMAC validation error:", err);
    return false;
  }
}

/**
 * Generate a deterministic password from telegramId + bot token.
 * Used only server-side — never exposed to clients.
 */
async function generateSecurePassword(telegramId: number, botToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`tg_auth_${telegramId}_${botToken}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Use first 32 chars of SHA-256 hash as password — strong and deterministic
  return `tg_${hashHex.slice(0, 32)}`;
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

    // 1. HMAC validation
    const isValid = await validateTelegramInitData(initData, TELEGRAM_BOT_TOKEN);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid Telegram data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse user data
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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const email = `${telegramId}@leitner.uz`;
    const fullName = `${first_name}${last_name ? " " + last_name : ""}`;
    const password = await generateSecurePassword(telegramId, TELEGRAM_BOT_TOKEN);

    // 3. Check if user exists by looking up profile with telegram_chat_id
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("telegram_chat_id", telegramId)
      .maybeSingle();

    if (existingProfile) {
      // Existing user — update password to current deterministic one (handles old password migration)
      await supabaseAdmin.auth.admin.updateUser(existingProfile.user_id, {
        password,
        email_confirm: true,
      });

      // Sign in with updated password
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.session) {
        console.error("Sign-in error for existing user:", signInError);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profile with latest Telegram data
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_username: username || null,
          full_name: fullName,
          avatar_url: photo_url || null,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq("user_id", existingProfile.user_id);

      return new Response(
        JSON.stringify({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user: signInData.user,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Also check by email (user may exist without telegram_chat_id set)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // User exists by email — update password and profile
      await supabaseAdmin.auth.admin.updateUser(existingUser.id, {
        password,
        email_confirm: true,
      });

      // Update profile
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_chat_id: telegramId,
          telegram_username: username || null,
          full_name: fullName,
          avatar_url: photo_url || null,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq("user_id", existingUser.id);

      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.session) {
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user: signInData.user,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create new user via admin API (no password exposed to client)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        telegram_id: telegramId,
        telegram_username: username,
        avatar_url: photo_url,
      },
    });

    if (createError || !newUser.user) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait for profile trigger
    await new Promise((r) => setTimeout(r, 1500));

    // Update profile with Telegram data
    await supabaseAdmin
      .from("profiles")
      .update({
        telegram_chat_id: telegramId,
        telegram_username: username || null,
        full_name: fullName,
        avatar_url: photo_url || null,
        telegram_connected_at: new Date().toISOString(),
      })
      .eq("user_id", newUser.user.id);

    // Enable telegram notifications
    await supabaseAdmin
      .from("notification_settings")
      .upsert(
        { user_id: newUser.user.id, telegram_enabled: true },
        { onConflict: "user_id" }
      );

    // Sign in to get session tokens
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return new Response(
        JSON.stringify({ error: "Authentication failed after signup" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: signInData.user,
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
