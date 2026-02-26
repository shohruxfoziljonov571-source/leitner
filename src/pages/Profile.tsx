import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Save, Send, Check, X, Loader2, Copy, RefreshCw, Bell, BellOff, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  telegram_connected_at: string | null;
}

interface NotificationSettings {
  telegram_enabled: boolean;
  daily_reminder_time: string | null;
}

const TELEGRAM_BOT_USERNAME = 'Leitner_robot';

const Profile: React.FC = () => {
  const { t } = useLanguage();
  const { user, isTelegramUser, telegramUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [showTelegramCommand, setShowTelegramCommand] = useState(false);
  const [telegramCommand, setTelegramCommand] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchNotificationSettings();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, bio, avatar_url, telegram_chat_id, telegram_username, telegram_connected_at')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('telegram_enabled, daily_reminder_time')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setNotificationSettings(data || { telegram_enabled: false, daily_reminder_time: '09:00' });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profil saqlandi!');
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          telegram_enabled: enabled,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setNotificationSettings(prev => prev ? { ...prev, telegram_enabled: enabled } : null);
      toast.success(enabled ? 'Bildirishnomalar yoqildi' : 'Bildirishnomalar o\'chirildi');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleUpdateReminderTime = async (time: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          daily_reminder_time: time,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setNotificationSettings(prev => prev ? { ...prev, daily_reminder_time: time } : null);
      toast.success(`Eslatma vaqti ${time} ga o'zgartirildi`);
    } catch (error) {
      console.error('Error updating reminder time:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const generateTelegramLink = () => {
    const linkToken = btoa(`${user?.id}:${Date.now()}`);
    return { 
      url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${linkToken}`,
      command: `/start ${linkToken}`
    };
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllari qabul qilinadi');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + '?t=' + Date.now();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Rasm yangilandi! 📸');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Rasm yuklanmadi: ' + (error?.message || 'Xatolik yuz berdi'));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
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
    await fetchProfile();
    await fetchNotificationSettings();
    if (profile?.telegram_chat_id) {
      toast.success('Telegram ulandi!');
      setShowTelegramCommand(false);
    } else {
      toast.info('Hali ulanmagan. Buyruqni botga yubordingizmi?');
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!user) return;

    if (!confirm('Telegram ulanishini uzmoqchimisiz?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_chat_id: null,
          telegram_username: null,
          telegram_connected_at: null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase
        .from('notification_settings')
        .update({ telegram_enabled: false })
        .eq('user_id', user.id);

      toast.success('Telegram uzildi');
      fetchProfile();
      fetchNotificationSettings();
    } catch (error) {
      console.error('Error disconnecting Telegram:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const openTelegramBot = () => {
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTelegramConnected = !!profile?.telegram_chat_id;
  const displayAvatar = profile?.avatar_url || (isTelegramUser && telegramUser?.photo_url);
  const displayName = fullName || profile?.full_name || (isTelegramUser && telegramUser ? `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}` : '');

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 max-w-lg">
        {/* Header — compact */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display font-bold text-xl text-foreground">
            Profil
          </h1>
        </motion.div>

        {/* Avatar — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="relative shrink-0">
            <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-card">
              {displayAvatar ? (
                <AvatarImage src={displayAvatar as string} alt={displayName} />
              ) : null}
              <AvatarFallback className="gradient-primary text-primary-foreground text-xl">
                {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            {!isTelegramUser && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-card rounded-full shadow-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">{displayName || 'Foydalanuvchi'}</h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {isTelegramUser && telegramUser && (
              <div className="mt-1 flex items-center gap-1.5">
                <Send className="w-3 h-3 text-[hsl(var(--telegram))]" />
                <span className="text-xs text-muted-foreground">
                  {telegramUser.username ? `@${telegramUser.username}` : 'Telegram orqali'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm">Ism</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ismingizni kiriting"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="O'zingiz haqingizda yozing..."
              maxLength={500}
              className="min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full gap-2 gradient-primary text-primary-foreground"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Saqlash
          </Button>
        </motion.div>

        {/* Telegram Connection */}
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
                  : isTelegramUser && telegramUser?.username
                  ? `@${telegramUser.username} (avtomatik)`
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
                    {displayAvatar && <AvatarImage src={displayAvatar as string} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                      {displayName?.charAt(0)?.toUpperCase() || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{displayName || 'Telegram foydalanuvchi'}</p>
                    <p className="text-xs text-muted-foreground">
                      @{profile?.telegram_username || telegramUser?.username || 'username'}
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

              {/* Reminder Time Setting */}
              {(isTelegramConnected || isTelegramUser) && notificationSettings?.telegram_enabled && (
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

              {/* Bot Settings Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={openTelegramBot}
                className="w-full gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Bot orqali sozlash
              </Button>

              {/* Disconnect Button */}
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

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <h4 className="font-medium text-sm text-primary mb-2">📱 Telegram bot haqida</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• So'zlarni takrorlash eslatmalari</li>
            <li>• Statistika va streak ma'lumotlari</li>
            <li>• Bot orqali bildirishnomalarni sozlash</li>
            <li>• /menu - barcha buyruqlarni ko'rish</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
