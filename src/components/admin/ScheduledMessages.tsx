import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ScheduledMessage {
  id: string;
  message: string;
  target_group: string;
  include_button: boolean;
  button_text: string;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  total_sent: number;
  total_failed: number;
  created_at: string;
}

const ScheduledMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    target_group: 'all',
    include_button: true,
    button_text: '📚 Ilovani ochish',
    scheduled_date: '',
    scheduled_time: ''
  });

  const targetGroups = [
    { value: 'all', label: 'Barcha' },
    { value: 'active', label: 'Faol' },
    { value: 'inactive', label: 'Nofaol' },
    { value: 'streak', label: 'Streak' }
  ];

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Xabarlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleCreate = async () => {
    if (!formData.message.trim() || !formData.scheduled_date || !formData.scheduled_time) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }

    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
    if (scheduledAt <= new Date()) {
      toast.error("Rejalashtirilgan vaqt kelajakda bo'lishi kerak");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .insert({
          message: formData.message,
          target_group: formData.target_group,
          include_button: formData.include_button,
          button_text: formData.button_text,
          scheduled_at: scheduledAt.toISOString(),
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Xabar rejalashtirildi');
      setIsDialogOpen(false);
      setFormData({
        message: '',
        target_group: 'all',
        include_button: true,
        button_text: '📚 Ilovani ochish',
        scheduled_date: '',
        scheduled_time: ''
      });
      fetchMessages();
    } catch (error: any) {
      console.error('Error creating scheduled message:', error);
      toast.error(error.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xabarni o'chirishni tasdiqlaysizmi?")) return;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Xabar o'chirildi");
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("O'chirishda xatolik");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Kutilmoqda</Badge>;
      case 'sent':
        return <Badge className="bg-primary flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Yuborildi</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Xato</Badge>;
      case 'partial':
        return <Badge variant="outline" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Qisman</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTargetLabel = (value: string) => 
    targetGroups.find(g => g.value === value)?.label || value;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Rejalashtirilgan xabarlar
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Yangi xabar
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Rejalashtirilgan xabarlar yo'q
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(msg.status)}
                          <span className="text-xs text-muted-foreground">
                            {getTargetLabel(msg.target_group)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message.substring(0, 100)}{msg.message.length > 100 ? '...' : ''}</p>
                      </div>
                      {msg.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(msg.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(msg.scheduled_at)}
                      </span>
                      {msg.status !== 'pending' && (
                        <span>
                          Yuborildi: {msg.total_sent} | Xato: {msg.total_failed}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi rejalashtirilgan xabar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Qabul qiluvchilar</Label>
              <RadioGroup 
                value={formData.target_group} 
                onValueChange={(v) => setFormData({ ...formData, target_group: v })}
                className="flex flex-wrap gap-2"
              >
                {targetGroups.map((group) => (
                  <label
                    key={group.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                      formData.target_group === group.value ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <RadioGroupItem value={group.value} />
                    <span className="text-sm">{group.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Xabar matni</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="HTML formatida xabar..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sana</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Vaqt</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Tugma qo'shish</Label>
                <Switch
                  checked={formData.include_button}
                  onCheckedChange={(v) => setFormData({ ...formData, include_button: v })}
                />
              </div>
              {formData.include_button && (
                <Input
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  placeholder="Tugma matni"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rejalashtirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledMessages;
