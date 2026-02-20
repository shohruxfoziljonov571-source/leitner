import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationSettings {
  enabled: boolean;
  time: string; // HH:MM format
  telegram_enabled: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    time: '09:00',
    telegram_enabled: false,
  });

  // Load settings from DB (primary) with localStorage fallback
  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    if (!user) {
      // fallback to localStorage when not authenticated
      const saved = localStorage.getItem('notification_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Error parsing notification settings:', e);
        }
      }
      return;
    }

    // Load from DB
    supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading notification settings:', error);
          return;
        }
        if (data) {
          setSettings({
            enabled: data.telegram_enabled || false,
            time: data.daily_reminder_time?.slice(0, 5) || '09:00',
            telegram_enabled: data.telegram_enabled,
          });
        }
      });
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Brauzeringiz bildirishnomalarni qo\'llab-quvvatlamaydi');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Bildirishnomalar yoqildi!');
        return true;
      } else if (result === 'denied') {
        toast.error('Bildirishnomalar rad etildi');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const scheduleNotification = useCallback((title: string, body: string, delay: number = 0) => {
    if (permission !== 'granted') return;

    setTimeout(() => {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'leitner-reminder',
        requireInteraction: true,
      });
    }, delay);
  }, [permission]);

  const scheduleDailyReminder = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const delay = reminderTime.getTime() - now.getTime();
    localStorage.setItem('next_reminder', reminderTime.toISOString());

    if (delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        scheduleNotification(
          'Takrorlash vaqti! 📚',
          'So\'zlaringizni takrorlash vaqti keldi. O\'rganishni davom eting!',
        );
      }, delay);
    }
  }, [scheduleNotification]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Persist to DB if authenticated, otherwise localStorage
    if (user) {
      const dbPayload = {
        user_id: user.id,
        telegram_enabled: updated.telegram_enabled,
        daily_reminder_time: updated.time + ':00',
      };

      const { error } = await supabase
        .from('notification_settings')
        .upsert(dbPayload, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving notification settings:', error);
      }
    } else {
      localStorage.setItem('notification_settings', JSON.stringify(updated));
    }

    if (updated.enabled && permission === 'granted') {
      scheduleDailyReminder(updated.time);
    }
  }, [settings, permission, user, scheduleDailyReminder]);

  const testNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.error('Avval ruxsat bering');
      return;
    }

    scheduleNotification(
      'Test bildirish 🎉',
      'Bildirishnomalar to\'g\'ri ishlayapti!',
    );
  }, [permission, scheduleNotification]);

  return {
    isSupported,
    permission,
    settings,
    requestPermission,
    updateSettings,
    scheduleNotification,
    testNotification,
  };
};
