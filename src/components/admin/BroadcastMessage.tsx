import React, { useState } from 'react';
import { Send, Users, UserCheck, UserX, Flame, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BroadcastMessage = () => {
  const { session } = useAuth();
  const [message, setMessage] = useState('');
  const [includeButton, setIncludeButton] = useState(true);
  const [buttonText, setButtonText] = useState('📚 Ilovani ochish');
  const [targetGroup, setTargetGroup] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Xabar matni kiritilmagan");
      return;
    }

    if (!session?.access_token) {
      toast.error("Sessiya topilmadi. Iltimos, qayta login qiling.");
      return;
    }

    const confirmed = window.confirm(
      `Haqiqatan ham ${targetGroup === 'all' ? 'barcha' : targetGroup === 'active' ? 'faol' : targetGroup === 'inactive' ? 'nofaol' : 'streak bor'} foydalanuvchilarga xabar yubormoqchimisiz?`
    );

    if (!confirmed) return;

    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('broadcast-message', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          message,
          includeButton,
          buttonText,
          targetGroup
        }
      });

      if (error) throw error;

      setLastResult({
        total: data.total_users,
        sent: data.sent,
        failed: data.failed
      });

      toast.success(`${data.sent} ta foydalanuvchiga xabar yuborildi`);
      setMessage('');
    } catch (error: any) {
      const status = error?.context?.status;
      const body = error?.context?.body;
      console.error('Broadcast error:', { error, status, body });

      if (status === 401) {
        toast.error("Login talab qilinadi (401). Qayta login qiling.");
      } else if (status === 403) {
        toast.error("Admin ruxsati kerak (403).");
      } else {
        toast.error(error?.message || `Xatolik yuz berdi${status ? ` (${status})` : ''}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const targetGroups = [
    { value: 'all', label: 'Barcha foydalanuvchilar', icon: Users, description: 'Telegram ulagan barcha foydalanuvchilar' },
    { value: 'active', label: 'Faol foydalanuvchilar', icon: UserCheck, description: "Oxirgi 7 kunda faol bo'lganlar" },
    { value: 'inactive', label: 'Nofaol foydalanuvchilar', icon: UserX, description: "7 kundan ko'p vaqt nofaol" },
    { value: 'streak', label: 'Streak borlar', icon: Flame, description: 'Hozirda streak bor foydalanuvchilar' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Ommaviy xabar yuborish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Group Selection */}
          <div className="space-y-3">
            <Label>Qabul qiluvchilar</Label>
            <RadioGroup value={targetGroup} onValueChange={setTargetGroup} className="grid grid-cols-2 gap-3">
              {targetGroups.map((group) => (
                <label
                  key={group.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    targetGroup === group.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={group.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <group.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{group.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label>Xabar matni</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="HTML formatida xabar yozing...&#10;&#10;Masalan:&#10;<b>Yangilik!</b>&#10;Yangi funksiyalar qo'shildi 🎉"
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              HTML teglaridan foydalanish mumkin: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;, &lt;a href=""&gt;
            </p>
          </div>

          {/* Button Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-button">Tugma qo'shish</Label>
              <Switch
                id="include-button"
                checked={includeButton}
                onCheckedChange={setIncludeButton}
              />
            </div>
            
            {includeButton && (
              <div className="space-y-2">
                <Label>Tugma matni</Label>
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="📚 Ilovani ochish"
                />
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend} 
            disabled={isSending || !message.trim()}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Xabar yuborish
              </>
            )}
          </Button>

          {/* Result */}
          {lastResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm font-medium">Natija:</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{lastResult.total}</p>
                  <p className="text-xs text-muted-foreground">Jami</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{lastResult.sent}</p>
                  <p className="text-xs text-muted-foreground">Yuborildi</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{lastResult.failed}</p>
                  <p className="text-xs text-muted-foreground">Muvaffaqiyatsiz</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastMessage;
