import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Save, Send, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const TELEGRAM_BOT_USERNAME = 'Leitner_robot'; // User should replace with actual bot

const Profile: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
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

  const generateTelegramLink = () => {
    // Create a unique token for linking
    const linkToken = btoa(`${user?.id}:${Date.now()}`);
    return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${linkToken}`;
  };

  const handleConnectTelegram = () => {
    const link = generateTelegramLink();
    window.open(link, '_blank');
    toast.info('Telegram bot ochildi. /start bosing va hisobingiz bog\'lanadi.');
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

      toast.success('Telegram uzildi');
      fetchProfile();
    } catch (error) {
      console.error('Error disconnecting Telegram:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            Profil 👤
          </h1>
          <p className="text-muted-foreground">Shaxsiy ma'lumotlaringiz</p>
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center shadow-elevated">
              <User className="w-12 h-12 text-primary-foreground" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-card rounded-full shadow-card flex items-center justify-center hover:bg-muted transition-colors">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Ism</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ismingizni kiriting"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
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
            <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-[#0088cc]" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Telegram</h3>
              <p className="text-sm text-muted-foreground">
                {profile?.telegram_username 
                  ? `@${profile.telegram_username} ulangan`
                  : 'Bildirishnomalar uchun ulang'}
              </p>
            </div>
            {profile?.telegram_chat_id && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>

          {profile?.telegram_chat_id ? (
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 rounded-xl text-sm">
                <p className="text-muted-foreground">Ulangan: @{profile.telegram_username}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(profile.telegram_connected_at!).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleDisconnectTelegram}
                className="w-full gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="w-4 h-4" />
                Uzish
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectTelegram}
              className="w-full gap-2 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white"
            >
              <Send className="w-4 h-4" />
              Telegram bot bilan ulash
            </Button>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <h4 className="font-medium text-sm text-primary mb-2">📱 Telegram haqida</h4>
          <p className="text-sm text-muted-foreground">
            Telegram bot orqali so'zlarni takrorlash eslatmalarini olasiz. Bot sizga qachon qaysi so'zlarni takrorlash kerakligini xabar qiladi.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
