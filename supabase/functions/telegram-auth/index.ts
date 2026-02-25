import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: simple in-memory store (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<{ valid: boolean; authDate?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };

    // Extract auth_date for freshness check
    const authDateStr = params.get("auth_date");
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;

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

    return { valid: signatureHex === hash, authDate };
  } catch (err) {
    console.error("HMAC validation error:", err);
    return { valid: false };
  }
}

/**
 * Generate a deterministic password from telegramId + bot token.
 * Used only server-side — never exposed to clients.
 */
async function generateSecurePassword(
  telegramId: number,
  botToken: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`tg_auth_${telegramId}_${botToken}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `tg_${hashHex.slice(0, 32)}`;
}

/**
 * Wait for profile to be created by trigger, with retry logic
 * instead of a fixed setTimeout.
 */
async function waitForProfile(
  supabaseAdmin: any,
  userId: string,
  maxRetries = 5,
  delayMs = 300
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { initData } = await req.json();

    if (!initData || typeof initData !== "string") {
      return new Response(
        JSON.stringify({ error: "initData is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. HMAC validation + auth_date freshness check
    const { valid, authDate } = await validateTelegramInitData(
      initData,
      TELEGRAM_BOT_TOKEN
    );

    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid Telegram data" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check auth_date freshness — reject data older than 5 minutes
    const MAX_AUTH_AGE_SECONDS = 300;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!authDate || nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
      return new Response(
        JSON.stringify({ error: "Authentication data expired. Please reopen the app." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse user data (with safe JSON parsing)
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (!userJson) {
      return new Response(
        JSON.stringify({ error: "No user data in initData" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let tgUser: any;
    try {
      tgUser = JSON.parse(userJson);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid user data format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { id: telegramId, first_name, last_name, username, photo_url } =
      tgUser;

    if (!telegramId) {
      return new Response(
        JSON.stringify({ error: "Invalid user data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const email = `${telegramId}@leitner.uz`;
    const fullName = `${first_name}${last_name ? " " + last_name : ""}`;
    const password = await generateSecurePassword(
      telegramId,
      TELEGRAM_BOT_TOKEN
    );

    // Helper to sign in and return response
    async function signInAndRespond(userId: string) {
      // Update password to current deterministic one
      await supabaseAdmin.auth.admin.updateUser(userId, {
        password,
        email_confirm: true,
      });

      const { data: signInData, error: signInError } =
        await supabaseAdmin.auth.signInWithPassword({ email, password });

      if (signInError || !signInData.session) {
        console.error("Sign-in error:", signInError);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Update profile with latest Telegram data
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_chat_id: telegramId,
          telegram_username: username || null,
          full_name: fullName,
          avatar_url: photo_url || null,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user: signInData.user,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Check if user exists by telegram_chat_id in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("telegram_chat_id", telegramId)
      .maybeSingle();

    if (existingProfile) {
      return await signInAndRespond(existingProfile.user_id);
    }

    // 4. Check by email using admin API (NOT listUsers!)
    const { data: existingUserData } =
      await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUserData?.user) {
      return await signInAndRespond(existingUserData.user.id);
    }

    // 5. Create new user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Wait for profile trigger with retry instead of fixed delay
    await waitForProfile(supabaseAdmin, newUser.user.id);

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
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.session) {
      return new Response(
        JSON.stringify({ error: "Authentication failed after signup" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: signInData.user,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Telegram auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
