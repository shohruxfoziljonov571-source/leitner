import React from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationSettings: React.FC = () => {
  const {
    isSupported,
    permission,
    settings,
    requestPermission,
    updateSettings,
    testNotification,
  } = useNotifications();

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-muted/50 text-center">
        <BellOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Brauzeringiz bildirishnomalarni qo'llab-quvvatlamaydi
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Permission Request */}
      {permission === 'default' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/20"
        >
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium">Bildirishnomalarni yoqish</p>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Kunlik eslatmalar olish uchun ruxsat bering
          </p>
          <Button onClick={requestPermission} size="sm" className="w-full">
            Ruxsat berish
          </Button>
        </motion.div>
      )}

      {permission === 'denied' && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-3 mb-2">
            <BellOff className="w-5 h-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Ruxsat rad etilgan</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Brauzer sozlamalaridan bildirishnomalarni yoqing
          </p>
        </div>
      )}

      {permission === 'granted' && (
        <>
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Kunlik eslatmalar</p>
                <p className="text-sm text-muted-foreground">Takrorlash vaqtini eslatish</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {/* Time Picker */}
          {settings.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-xl bg-muted/50"
            >
              <Label className="text-sm font-medium mb-2 block">
                Eslatma vaqti
              </Label>
              <Input
                type="time"
                value={settings.time}
                onChange={(e) => updateSettings({ time: e.target.value })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Har kuni shu vaqtda eslatma olasiz
              </p>
            </motion.div>
          )}

          {/* Test Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={testNotification}
            className="w-full gap-2"
          >
            <TestTube className="w-4 h-4" />
            Test bildirish
          </Button>
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
