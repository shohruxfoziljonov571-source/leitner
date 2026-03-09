import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import ProfileForm from '@/components/profile/ProfileForm';
import TelegramConnection from '@/components/profile/TelegramConnection';

interface ProfileData {
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

const Profile: React.FC = () => {
  const { t } = useLanguage();
  const { user, isTelegramUser, telegramUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');

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

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchNotificationSettings();
    }
  }, [user]);

  const handleRefresh = () => {
    fetchProfile();
    fetchNotificationSettings();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayAvatar = profile?.avatar_url || (isTelegramUser && telegramUser?.photo_url) || null;
  const displayName = fullName || profile?.full_name || (isTelegramUser && telegramUser ? `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}` : '') || '';

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display font-bold text-xl text-foreground">Profil</h1>
        </motion.div>

        <ProfileForm
          userId={user!.id}
          fullName={fullName}
          setFullName={setFullName}
          bio={bio}
          setBio={setBio}
          displayAvatar={displayAvatar}
          displayName={displayName}
          email={user?.email}
          isTelegramUser={isTelegramUser}
          telegramUsername={telegramUser?.username}
          onProfileUpdate={handleRefresh}
        />

        <TelegramConnection
          userId={user!.id}
          profile={profile}
          notificationSettings={notificationSettings}
          isTelegramUser={isTelegramUser}
          displayAvatar={displayAvatar}
          displayName={displayName}
          onRefresh={handleRefresh}
        />

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
