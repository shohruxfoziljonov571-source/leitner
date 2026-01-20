import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

interface ScheduledMessage {
  id: string;
  message: string;
  target_group: string;
  include_button: boolean;
  button_text: string | null;
  scheduled_at: string;
}

async function sendTelegramMessage(chatId: number, text: string, includeButton: boolean, buttonText: string | null): Promise<boolean> {
  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    };

    if (includeButton && buttonText) {
      payload.reply_markup = {
        inline_keyboard: [[
          { text: buttonText, url: 'https://t.me/Leitner_robot/app' }
        ]]
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled messages...');

    // Get pending scheduled messages that are due
    const now = new Date().toISOString();
    const { data: messages, error: messagesError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (messagesError) {
      console.error('Error fetching scheduled messages:', messagesError);
      throw messagesError;
    }

    if (!messages || messages.length === 0) {
      console.log('No scheduled messages to send');
      return new Response(JSON.stringify({ success: true, message: 'No messages to send' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${messages.length} scheduled messages to process`);

    for (const message of messages as ScheduledMessage[]) {
      console.log(`Processing message ${message.id}: ${message.target_group}`);

      // Update status to sending
      await supabase
        .from('scheduled_messages')
        .update({ status: 'sending' })
        .eq('id', message.id);

      // Build query based on target group
      let query = supabase
        .from('profiles')
        .select('telegram_chat_id')
        .not('telegram_chat_id', 'is', null);

      if (message.target_group === 'active_7d') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: activeUsers } = await supabase
          .from('user_stats')
          .select('user_id')
          .gte('last_active_date', sevenDaysAgo.toISOString().split('T')[0]);
        
        const activeUserIds = activeUsers?.map(u => u.user_id) || [];
        if (activeUserIds.length > 0) {
          query = query.in('user_id', activeUserIds);
        } else {
          query = query.eq('user_id', 'no-users');
        }
      } else if (message.target_group === 'inactive_7d') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: inactiveUsers } = await supabase
          .from('user_stats')
          .select('user_id')
          .lt('last_active_date', sevenDaysAgo.toISOString().split('T')[0]);
        
        const inactiveUserIds = inactiveUsers?.map(u => u.user_id) || [];
        if (inactiveUserIds.length > 0) {
          query = query.in('user_id', inactiveUserIds);
        } else {
          query = query.eq('user_id', 'no-users');
        }
      } else if (message.target_group === 'with_streak') {
        const { data: streakUsers } = await supabase
          .from('user_stats')
          .select('user_id')
          .gt('streak', 0);
        
        const streakUserIds = streakUsers?.map(u => u.user_id) || [];
        if (streakUserIds.length > 0) {
          query = query.in('user_id', streakUserIds);
        } else {
          query = query.eq('user_id', 'no-users');
        }
      }
      // 'all' uses default query

      const { data: users, error: usersError } = await query;

      if (usersError) {
        console.error('Error fetching users:', usersError);
        await supabase
          .from('scheduled_messages')
          .update({ status: 'failed' })
          .eq('id', message.id);
        continue;
      }

      let successCount = 0;
      let failCount = 0;

      for (const user of users || []) {
        if (user.telegram_chat_id) {
          const success = await sendTelegramMessage(
            user.telegram_chat_id,
            message.message,
            message.include_button || false,
            message.button_text
          );
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Update message status
      await supabase
        .from('scheduled_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          total_sent: successCount,
          total_failed: failCount
        })
        .eq('id', message.id);

      console.log(`Message ${message.id} sent: ${successCount} success, ${failCount} failed`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: messages.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-scheduled-messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
