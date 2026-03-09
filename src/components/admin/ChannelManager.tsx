import React, { useState } from 'react';
import { Plus, ExternalLink, Trash2, ToggleLeft, ToggleRight, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ChannelManagerProps {
  channels: Array<{
    id: string;
    channel_id: string;
    channel_name: string;
    channel_username: string;
    channel_url: string;
    is_active: boolean;
  }>;
  addChannel: (channel: any) => Promise<{ success: boolean; error?: string }>;
  toggleChannel: (id: string, isActive: boolean) => Promise<{ success: boolean }>;
  deleteChannel: (id: string) => Promise<{ success: boolean }>;
}

const ChannelManager = ({ channels, addChannel, toggleChannel, deleteChannel }: ChannelManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    channel_id: '',
    channel_name: '',
    channel_username: '',
    channel_url: ''
  });

  const handleAdd = async () => {
    if (!form.channel_id || !form.channel_name || !form.channel_username) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    const result = await addChannel(form);
    if (result.success) {
      toast.success("Kanal qo'shildi");
      setForm({ channel_id: '', channel_name: '', channel_username: '', channel_url: '' });
      setIsOpen(false);
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Majburiy kanallar</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Kanal qo'shish</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yangi kanal qo'shish</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Kanal ID</Label><Input value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} placeholder="-1001234567890" /></div>
              <div><Label>Kanal nomi</Label><Input value={form.channel_name} onChange={(e) => setForm({ ...form, channel_name: e.target.value })} placeholder="Leitner Study" /></div>
              <div><Label>Username</Label><Input value={form.channel_username} onChange={(e) => setForm({ ...form, channel_username: e.target.value })} placeholder="leitner_study" /></div>
              <div><Label>URL</Label><Input value={form.channel_url} onChange={(e) => setForm({ ...form, channel_url: e.target.value })} placeholder="https://t.me/leitner_study" /></div>
              <Button onClick={handleAdd} className="w-full">Qo'shish</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Hali kanallar qo'shilmagan</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${channel.is_active ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                    <div>
                      <p className="font-medium">{channel.channel_name}</p>
                      <p className="text-sm text-muted-foreground">@{channel.channel_username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => window.open(channel.channel_url, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleChannel(channel.id, !channel.is_active)}>
                      {channel.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteChannel(channel.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelManager;
