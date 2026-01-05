import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NotificationSettings {
  enabled: boolean;
  time: string; // HH:MM format
}

export const useNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    time: '09:00',
  });

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    // Load settings from localStorage
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing notification settings:', e);
      }
    }
  }, []);

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

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('notification_settings', JSON.stringify(updated));
    
    if (updated.enabled && permission === 'granted') {
      // Schedule daily reminder
      scheduleDailyReminder(updated.time);
    }
  }, [settings, permission]);

  const scheduleDailyReminder = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const delay = reminderTime.getTime() - now.getTime();
    
    // Store in localStorage for service worker
    localStorage.setItem('next_reminder', reminderTime.toISOString());
    
    // For browsers that support it, schedule a timeout
    // In production, this would use a service worker
    if (delay < 24 * 60 * 60 * 1000) { // Only schedule if within 24 hours
      setTimeout(() => {
        scheduleNotification(
          'Takrorlash vaqti! 📚',
          'So\'zlaringizni takrorlash vaqti keldi. O\'rganishni davom eting!',
        );
      }, delay);
    }
  }, [scheduleNotification]);

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
