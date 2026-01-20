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

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify admin status from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, includeButton, buttonText, targetGroup, imageUrl } = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Broadcasting message to ${targetGroup || 'all'} users...`);
    console.log(`Image included: ${!!imageUrl}`);

    // Get all users with Telegram connected
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    const { data: users, error: usersError } = await query;

    if (usersError) {
      throw usersError;
    }

    let targetUsers = users || [];

    // Filter by target group if specified
    if (targetGroup === 'active') {
      // Get users active in last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: activeUserIds } = await supabase
        .from("user_stats")
        .select("user_id")
        .gte("last_active_date", weekAgo);
      
      const activeIds = new Set(activeUserIds?.map(u => u.user_id) || []);
      targetUsers = targetUsers.filter(u => activeIds.has(u.user_id));
    } else if (targetGroup === 'inactive') {
      // Get users inactive for more than 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: activeUserIds } = await supabase
        .from("user_stats")
        .select("user_id")
        .gte("last_active_date", weekAgo);
      
      const activeIds = new Set(activeUserIds?.map(u => u.user_id) || []);
      targetUsers = targetUsers.filter(u => !activeIds.has(u.user_id));
    } else if (targetGroup === 'streak') {
      // Get users with active streaks
      const { data: streakUserIds } = await supabase
        .from("user_stats")
        .select("user_id")
        .gte("streak", 1);
      
      const streakIds = new Set(streakUserIds?.map(u => u.user_id) || []);
      targetUsers = targetUsers.filter(u => streakIds.has(u.user_id));
    }

    console.log(`Found ${targetUsers.length} target users`);

    let successCount = 0;
    let failedCount = 0;
    const WEBAPP_URL = "https://leitner.lovable.app";

    // Determine if we're sending a photo or text message
    const hasImage = imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:'));

    for (const targetUser of targetUsers) {
      try {
        const replyMarkup = includeButton ? {
          inline_keyboard: [
            [{ text: buttonText || "📚 Ilovani ochish", web_app: { url: WEBAPP_URL } }],
          ],
        } : undefined;

        let response;

        if (hasImage) {
          // Send photo with caption
          if (imageUrl.startsWith('data:')) {
            // Base64 image - need to send as multipart/form-data
            // For simplicity, we'll skip base64 and only support URLs
            // Send as text message with image link
            const messageWithImage = `🖼️ <a href="${imageUrl}">Rasm</a>\n\n${message}`;
            response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: targetUser.telegram_chat_id,
                text: message,
                parse_mode: "HTML",
                reply_markup: replyMarkup,
              }),
            });
          } else {
            // URL-based image
            response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: targetUser.telegram_chat_id,
                photo: imageUrl,
                caption: message,
                parse_mode: "HTML",
                reply_markup: replyMarkup,
              }),
            });
          }
        } else {
          // Send text message only
          response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetUser.telegram_chat_id,
              text: message,
              parse_mode: "HTML",
              reply_markup: replyMarkup,
            }),
          });
        }

        if (response.ok) {
          successCount++;
        } else {
          const errorText = await response.text();
          console.error(`Failed to send to ${targetUser.telegram_chat_id}:`, errorText);
          failedCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error sending to user ${targetUser.user_id}:`, error);
        failedCount++;
      }
    }

    console.log(`Broadcast complete: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_users: targetUsers.length,
        sent: successCount,
        failed: failedCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error broadcasting message:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
