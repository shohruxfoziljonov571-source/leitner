import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, TrendingUp, Users, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ReferralManagerProps {
  referrals: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    clicks: number;
    registrations: number;
  }>;
  addReferral: (r: any) => Promise<{ success: boolean; error?: string }>;
  toggleReferral: (id: string, isActive: boolean) => Promise<{ success: boolean }>;
  deleteReferral: (id: string) => Promise<{ success: boolean }>;
}

const BOT_USERNAME = 'Leitner_robot';

const ReferralManager = ({ referrals, addReferral, toggleReferral, deleteReferral }: ReferralManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  const handleAdd = async () => {
    if (!form.code || !form.name) {
      toast.error('Kod va nom kiritilishi shart');
      return;
    }
    const result = await addReferral(form);
    if (result.success) {
      toast.success("Referral qo'shildi");
      setForm({ code: '', name: '', description: '' });
      setIsOpen(false);
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
  };

  const copyUrl = (code: string) => {
    navigator.clipboard.writeText(`https://t.me/${BOT_USERNAME}?start=ref_${code}`);
    toast.success('URL nusxalandi');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Referral linklar</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Referral qo'shish</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yangi referral yaratish</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Kod (URL uchun)</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, '_') })} placeholder="instagram_jan2026" /></div>
              <div><Label>Nomi</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Instagram reklama - Yanvar 2026" /></div>
              <div><Label>Izoh (ixtiyoriy)</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="@shohruxdigital orqali" /></div>
              <Button onClick={handleAdd} className="w-full">Yaratish</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {referrals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Hali referrallar yaratilmagan</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {referrals.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${r.is_active ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                    <div>
                      <p className="font-medium">{r.name}</p>
                      {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyUrl(r.code)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleReferral(r.id, !r.is_active)}>
                      {r.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteReferral(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1"><TrendingUp className="h-4 w-4 text-primary" /><span>{r.clicks} bosish</span></div>
                  <div className="flex items-center gap-1"><Users className="h-4 w-4 text-green-500" /><span>{r.registrations} ro'yxat</span></div>
                  <div className="text-muted-foreground">Konversiya: {r.clicks > 0 ? Math.round((r.registrations / r.clicks) * 100) : 0}%</div>
                </div>
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                  https://t.me/{BOT_USERNAME}?start=ref_{r.code}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralManager;
