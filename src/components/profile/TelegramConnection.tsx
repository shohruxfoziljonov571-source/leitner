import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check, X, Copy, RefreshCw, Bell, BellOff, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TELEGRAM_BOT_USERNAME = 'Leitner_robot';

interface TelegramConnectionProps {
  userId: string;
  profile: {
    telegram_chat_id: number | null;
    telegram_username: string | null;
    telegram_connected_at: string | null;
    avatar_url: string | null;
  } | null;
  notificationSettings: {
    telegram_enabled: boolean;
    daily_reminder_time: string | null;
  } | null;
  isTelegramUser: boolean;
  displayAvatar: string | null;
  displayName: string;
  onRefresh: () => void;
}

const TelegramConnection: React.FC<TelegramConnectionProps> = ({
  userId, profile, notificationSettings, isTelegramUser,
  displayAvatar, displayName, onRefresh,
}) => {
  const [showTelegramCommand, setShowTelegramCommand] = useState(false);
  const [telegramCommand, setTelegramCommand] = useState('');

  const isTelegramConnected = !!profile?.telegram_chat_id;

  const generateTelegramLink = () => {
    const encodedData = btoa(`${userId}:connect`);
    return {
      url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodedData}`,
      command: `/start ${encodedData}`,
    };
  };

  const handleConnectTelegram = () => {
    const { url, command } = generateTelegramLink();
    setTelegramCommand(command);
    setShowTelegramCommand(true);
    window.open(url, '_blank');
    toast.info('Telegram bot ochildi. Quyidagi buyruqni botga yuboring.');
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(telegramCommand);
    toast.success('Nusxalandi! Endi Telegram botga yuboring.');
  };

  const handleRefreshStatus = async () => {
    onRefresh();
    if (profile?.telegram_chat_id) {
      toast.success('Telegram ulandi!');
      setShowTelegramCommand(false);
    } else {
      toast.info('Hali ulanmagan. Buyruqni botga yubordingizmi?');
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('Telegram ulanishini uzmoqchimisiz?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_chat_id: null,
          telegram_username: null,
          telegram_connected_at: null,
        })
        .eq('user_id', userId);

      if (error) throw error;

      await supabase
        .from('notification_settings')
        .update({ telegram_enabled: false })
        .eq('user_id', userId);

      toast.success('Telegram uzildi');
      onRefresh();
    } catch (error) {
      console.error('Error disconnecting Telegram:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          telegram_enabled: enabled,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success(enabled ? 'Bildirishnomalar yoqildi' : 'Bildirishnomalar o\'chirildi');
      onRefresh();
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleUpdateReminderTime = async (time: string) => {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          daily_reminder_time: time,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success(`Eslatma vaqti: ${time}`);
      onRefresh();
    } catch (error) {
      console.error('Error updating reminder time:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-2xl shadow-card p-5 mb-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
          <Send className="w-5 h-5 text-secondary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Telegram</h3>
          <p className="text-sm text-muted-foreground">
            {profile?.telegram_username
              ? `@${profile.telegram_username} ulangan`
              : isTelegramUser
              ? 'Avtomatik ulangan'
              : 'Bildirishnomalar uchun ulang'}
          </p>
        </div>
        {(isTelegramConnected || isTelegramUser) && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {isTelegramConnected || isTelegramUser ? (
        <div className="space-y-3">
          {/* Telegram Info Card */}
          <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/10">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                {displayAvatar && <AvatarImage src={displayAvatar} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                  {displayName?.charAt(0)?.toUpperCase() || 'T'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{displayName || 'Telegram foydalanuvchi'}</p>
                <p className="text-xs text-muted-foreground">
                  @{profile?.telegram_username || 'username'}
                </p>
              </div>
            </div>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              {notificationSettings?.telegram_enabled ? (
                <Bell className="w-4 h-4 text-primary" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">Bildirishnomalar</p>
                <p className="text-[11px] text-muted-foreground">Takrorlash eslatmalari</p>
              </div>
            </div>
            <Switch
              checked={notificationSettings?.telegram_enabled || false}
              onCheckedChange={handleToggleNotifications}
            />
          </div>

          {/* Reminder Time */}
          {notificationSettings?.telegram_enabled && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Eslatma vaqti</p>
                  <p className="text-[11px] text-muted-foreground">Har kuni</p>
                </div>
              </div>
              <Select
                value={notificationSettings?.daily_reminder_time?.slice(0, 5) || '09:00'}
                onValueChange={handleUpdateReminderTime}
              >
                <SelectTrigger className="w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">🌅 06:00</SelectItem>
                  <SelectItem value="07:00">🌄 07:00</SelectItem>
                  <SelectItem value="08:00">🌄 08:00</SelectItem>
                  <SelectItem value="09:00">🌅 09:00</SelectItem>
                  <SelectItem value="10:00">☀️ 10:00</SelectItem>
                  <SelectItem value="12:00">☀️ 12:00</SelectItem>
                  <SelectItem value="14:00">🌤️ 14:00</SelectItem>
                  <SelectItem value="18:00">🌆 18:00</SelectItem>
                  <SelectItem value="20:00">🌙 20:00</SelectItem>
                  <SelectItem value="21:00">🌙 21:00</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bot Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}`, '_blank')}
            className="w-full gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Bot orqali sozlash
          </Button>

          {/* Disconnect */}
          {!isTelegramUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectTelegram}
              className="w-full gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Uzish
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {showTelegramCommand ? (
            <>
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-2">
                  Bu buyruqni Telegram botga yuboring:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded text-xs font-mono break-all">
                    {telegramCommand}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyCommand}
                    className="shrink-0 h-8 w-8"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTelegramCommand(false)}
                  className="flex-1"
                >
                  Bekor qilish
                </Button>
                <Button
                  size="sm"
                  onClick={handleRefreshStatus}
                  className="flex-1 gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekshirish
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={handleConnectTelegram}
              className="w-full gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              <Send className="w-4 h-4" />
              Telegram bot bilan ulash
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TelegramConnection;
