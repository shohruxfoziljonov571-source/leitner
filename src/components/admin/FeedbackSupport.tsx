import React, { useState, useEffect } from 'react';
import { MessageSquare, Reply, CheckCircle, Clock, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Feedback {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  user_name?: string;
}

const CATEGORIES = [
  { value: 'general', label: 'Umumiy' },
  { value: 'bug', label: 'Xatolik' },
  { value: 'feature', label: 'Yangi funksiya' },
  { value: 'question', label: 'Savol' },
  { value: 'complaint', label: 'Shikoyat' }
];

const FeedbackSupport = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFeedbacks = async () => {
    try {
      let query = supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set(data?.map(f => f.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const feedbacksWithNames = data?.map(f => ({
        ...f,
        user_name: profileMap.get(f.user_id) || 'Nomsiz'
      })) || [];

      setFeedbacks(feedbacksWithNames);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Murojaatlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const openResponseDialog = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setResponse(feedback.admin_response || '');
    setIsDialogOpen(true);
  };

  const handleRespond = async () => {
    if (!selectedFeedback || !response.trim()) {
      toast.error('Javob matnini kiriting');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({
          admin_response: response,
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      toast.success('Javob yuborildi');
      setIsDialogOpen(false);
      fetchFeedbacks();
    } catch (error: any) {
      console.error('Error responding:', error);
      toast.error(error.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchFeedbacks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Ochiq</Badge>;
      case 'in_progress':
        return <Badge variant="outline">Jarayonda</Badge>;
      case 'resolved':
        return <Badge className="bg-primary flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Hal qilindi</Badge>;
      case 'closed':
        return <Badge variant="secondary">Yopildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return <Badge variant="outline">{cat?.label || category}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFeedbacks = feedbacks.filter(f => 
    !searchQuery || 
    f.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCount = feedbacks.filter(f => f.status === 'open').length;
  const inProgressCount = feedbacks.filter(f => f.status === 'in_progress').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer" onClick={() => setFilter('open')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{openCount}</p>
            <p className="text-xs text-muted-foreground">Ochiq</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('in_progress')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">Jarayonda</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('resolved')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">Hal qilindi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Foydalanuvchi murojaatlari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Qidirish..."
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="open">Ochiq</SelectItem>
                <SelectItem value="in_progress">Jarayonda</SelectItem>
                <SelectItem value="resolved">Hal qilindi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feedbacks List */}
          <ScrollArea className="h-[400px]">
            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Murojaatlar topilmadi
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedbacks.map((feedback) => (
                  <div key={feedback.id} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(feedback.status)}
                          {getCategoryBadge(feedback.category)}
                          <span className="text-sm font-medium">{feedback.user_name}</span>
                        </div>
                        <p className="font-medium">{feedback.subject}</p>
                        <p className="text-sm text-muted-foreground">{feedback.message}</p>
                      </div>
                    </div>

                    {feedback.admin_response && (
                      <div className="mt-2 p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground mb-1">Admin javobi:</p>
                        <p className="text-sm">{feedback.admin_response}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">{formatDate(feedback.created_at)}</span>
                      <div className="flex gap-2">
                        {feedback.status === 'open' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(feedback.id, 'in_progress')}>
                            Qabul qilish
                          </Button>
                        )}
                        {feedback.status !== 'resolved' && (
                          <Button size="sm" onClick={() => openResponseDialog(feedback)}>
                            <Reply className="h-4 w-4 mr-1" />
                            Javob
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Murojaatga javob</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-medium">{selectedFeedback.subject}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedFeedback.message}</p>
              </div>

              <div className="space-y-2">
                <Label>Javob</Label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Javob yozing..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleRespond} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yuborish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackSupport;
