import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileFormProps {
  userId: string;
  fullName: string;
  setFullName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  displayAvatar: string | null;
  displayName: string;
  email: string | undefined;
  isTelegramUser: boolean;
  telegramUsername?: string;
  onProfileUpdate: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  userId, fullName, setFullName, bio, setBio,
  displayAvatar, displayName, email, isTelegramUser,
  telegramUsername, onProfileUpdate,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Profil saqlandi! ✅');
      onProfileUpdate();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Rasm 2MB dan kichik bo\'lishi kerak');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const timestampedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: timestampedUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast.success('Rasm yangilandi! 📸');
      onProfileUpdate();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Rasm yuklanmadi: ' + (error?.message || 'Xatolik yuz berdi'));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="relative shrink-0">
          <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-card">
            {displayAvatar ? (
              <AvatarImage src={displayAvatar} alt={displayName} />
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
          <p className="text-sm text-muted-foreground truncate">{email}</p>
          {isTelegramUser && telegramUsername && (
            <p className="text-xs text-muted-foreground mt-0.5">@{telegramUsername}</p>
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
    </>
  );
};

export default ProfileForm;
