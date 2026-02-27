import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Clock, Eye, Loader2, Crown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Payment {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  currency: string;
  receipt_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  profiles?: { full_name: string | null; telegram_username: string | null } | null;
}

interface SubStats {
  total: number;
  pending: number;
  approved: number;
  revenue: number;
}

const PaymentManager: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<SubStats>({ total: 0, pending: 0, approved: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('premium_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for each payment
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enriched = (data || []).map(p => ({
        ...p,
        profiles: profileMap.get(p.user_id) || null,
      }));

      setPayments(enriched);

      // Fetch stats
      const [
        { count: total },
        { count: pending },
        { count: approved },
      ] = await Promise.all([
        supabase.from('premium_payments').select('*', { count: 'exact', head: true }),
        supabase.from('premium_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('premium_payments').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      const { data: revenueData } = await supabase
        .from('premium_payments')
        .select('amount')
        .eq('status', 'approved');

      const revenue = revenueData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        revenue,
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error("To'lovlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const viewReceipt = async (payment: Payment) => {
    setSelectedPayment(payment);
    setAdminNote(payment.admin_note || '');

    if (payment.receipt_url) {
      const { data } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(payment.receipt_url, 3600);
      setReceiptUrl(data?.signedUrl || null);
    } else {
      setReceiptUrl(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment || !user) return;
    setActionLoading(true);

    try {
      // Update payment status
      const { error: payError } = await supabase
        .from('premium_payments')
        .update({
          status: 'approved',
          admin_note: adminNote || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (payError) throw payError;

      // Calculate expiry date
      const durationDays = selectedPayment.plan === 'monthly' ? 30 : selectedPayment.plan === 'quarterly' ? 90 : 365;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Upsert subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: selectedPayment.user_id,
          plan: selectedPayment.plan,
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (subError) throw subError;

      toast.success("To'lov tasdiqlandi! Foydalanuvchi Premium oldi.");
      setSelectedPayment(null);
      fetchPayments();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error("Tasdiqlashda xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !user) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('premium_payments')
        .update({
          status: 'rejected',
          admin_note: adminNote || 'Rad etildi',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast.success("To'lov rad etildi");
      setSelectedPayment(null);
      fetchPayments();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error("Rad etishda xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('uz-UZ', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-accent border-accent"><Clock className="w-3 h-3 mr-1" />Kutilmoqda</Badge>;
      case 'approved': return <Badge className="bg-primary text-primary-foreground"><Check className="w-3 h-3 mr-1" />Tasdiqlangan</Badge>;
      case 'rejected': return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rad etilgan</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Jami to'lovlar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-accent">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Kutilmoqda</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Tasdiqlangan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">${stats.revenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Jami daromad</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
          <TabsTrigger value="approved">Tasdiqlangan</TabsTrigger>
          <TabsTrigger value="rejected">Rad etilgan</TabsTrigger>
          <TabsTrigger value="all">Barchasi</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Payments list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            To'lovlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                To'lovlar topilmadi
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {payment.profiles?.full_name || 'Nomsiz'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.plan} — ${payment.amount} • {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(payment.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewReceipt(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>To'lov tafsilotlari</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Foydalanuvchi</p>
                  <p className="font-medium">{selectedPayment.profiles?.full_name || 'Nomsiz'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telegram</p>
                  <p className="font-medium">@{selectedPayment.profiles?.telegram_username || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reja</p>
                  <p className="font-medium">{selectedPayment.plan}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Summa</p>
                  <p className="font-medium">${selectedPayment.amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {statusBadge(selectedPayment.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Sana</p>
                  <p className="font-medium">{formatDate(selectedPayment.created_at)}</p>
                </div>
              </div>

              {/* Receipt preview */}
              {receiptUrl && (
                <div className="border rounded-xl overflow-hidden">
                  <img
                    src={receiptUrl}
                    alt="To'lov cheki"
                    className="w-full max-h-60 object-contain bg-muted"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 text-center text-xs text-primary hover:underline"
                  >
                    To'liq ko'rish →
                  </a>
                </div>
              )}

              {/* Admin note */}
              {selectedPayment.status === 'pending' && (
                <div className="space-y-2">
                  <Label>Admin izoh (ixtiyoriy)</Label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Izoh qo'shing..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {selectedPayment?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                Rad etish
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 gradient-primary text-primary-foreground"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Tasdiqlash
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentManager;
