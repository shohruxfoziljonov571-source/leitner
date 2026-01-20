import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Volume2, Play, Pause, FileAudio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSpeech } from '@/hooks/useSpeech';

interface Dictation {
  id: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  audio_text: string;
  audio_url: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  created_at: string;
}

const DictationManager: React.FC = () => {
  const { user } = useAuth();
  const { speak, stop, isSpeaking } = useSpeech();
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDictation, setEditingDictation] = useState<Dictation | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    language: 'en',
    audio_text: '',
    is_active: true
  });

  useEffect(() => {
    fetchDictations();
  }, []);

  const fetchDictations = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_dictations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDictations(data || []);
    } catch (error) {
      console.error('Error fetching dictations:', error);
      toast.error('Diktantlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.audio_text) {
      toast.error('Sarlavha va matn kiritilishi shart');
      return;
    }

    try {
      if (editingDictation) {
        const { error } = await supabase
          .from('audio_dictations')
          .update({
            title: formData.title,
            description: formData.description || null,
            level: formData.level,
            language: formData.language,
            audio_text: formData.audio_text,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDictation.id);

        if (error) throw error;
        toast.success('Diktant yangilandi');
      } else {
        const { error } = await supabase
          .from('audio_dictations')
          .insert({
            title: formData.title,
            description: formData.description || null,
            level: formData.level,
            language: formData.language,
            audio_text: formData.audio_text,
            is_active: formData.is_active,
            created_by: user?.id
          });

        if (error) throw error;
        toast.success('Diktant qo\'shildi');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchDictations();
    } catch (error) {
      console.error('Error saving dictation:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Diktantni o\'chirishni xohlaysizmi?')) return;

    try {
      const { error } = await supabase
        .from('audio_dictations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Diktant o\'chirildi');
      fetchDictations();
    } catch (error) {
      console.error('Error deleting dictation:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('audio_dictations')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(isActive ? 'Diktant o\'chirildi' : 'Diktant faollashtirildi');
      fetchDictations();
    } catch (error) {
      console.error('Error toggling dictation:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleEdit = (dictation: Dictation) => {
    setEditingDictation(dictation);
    setFormData({
      title: dictation.title,
      description: dictation.description || '',
      level: dictation.level,
      language: dictation.language,
      audio_text: dictation.audio_text,
      is_active: dictation.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      level: 'beginner',
      language: 'en',
      audio_text: '',
      is_active: true
    });
    setEditingDictation(null);
  };

  const handlePlayAudio = (text: string, lang: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, { lang, rate: 0.8 });
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-500/10 text-green-500',
      intermediate: 'bg-yellow-500/10 text-yellow-500',
      advanced: 'bg-red-500/10 text-red-500'
    };
    const labels: Record<string, string> = {
      beginner: 'Boshlang\'ich',
      intermediate: 'O\'rta',
      advanced: 'Yuqori'
    };
    return <Badge className={colors[level]}>{labels[level]}</Badge>;
  };

  if (isLoading) {
    return <div className="animate-pulse text-center py-8">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Audio Diktantlar</h2>
          <p className="text-sm text-muted-foreground">
            Diktant matnlarini qo'shing va boshqaring
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Diktant qo'shish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDictation ? 'Diktantni tahrirlash' : 'Yangi diktant'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sarlavha *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Simple Present Tense"
                />
              </div>

              <div>
                <Label>Tavsif</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Qisqacha izoh"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Daraja</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Boshlang'ich</SelectItem>
                      <SelectItem value="intermediate">O'rta</SelectItem>
                      <SelectItem value="advanced">Yuqori</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Til</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇬🇧 Ingliz tili</SelectItem>
                      <SelectItem value="ru">🇷🇺 Rus tili</SelectItem>
                      <SelectItem value="de">🇩🇪 Nemis tili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Diktant matni *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(formData.audio_text, formData.language)}
                    disabled={!formData.audio_text}
                  >
                    {isSpeaking ? (
                      <><Pause className="h-4 w-4 mr-1" /> To'xtatish</>
                    ) : (
                      <><Volume2 className="h-4 w-4 mr-1" /> Tinglash</>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={formData.audio_text}
                  onChange={(e) => setFormData({ ...formData, audio_text: e.target.value })}
                  placeholder="Diktant uchun matnni kiriting..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.audio_text.split(/\s+/).filter(Boolean).length} so'z
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Faol</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={handleSubmit}>
                  {editingDictation ? 'Saqlash' : 'Qo\'shish'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {dictations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileAudio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Hali diktant qo'shilmagan</p>
              </CardContent>
            </Card>
          ) : (
            dictations.map((dictation) => (
              <motion.div
                key={dictation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={!dictation.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{dictation.title}</h3>
                          {getLevelBadge(dictation.level)}
                          <Badge variant="outline">
                            {dictation.language === 'en' ? '🇬🇧' : dictation.language === 'ru' ? '🇷🇺' : '🇩🇪'}
                          </Badge>
                          {!dictation.is_active && (
                            <Badge variant="secondary">O'chirilgan</Badge>
                          )}
                        </div>
                        {dictation.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {dictation.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {dictation.audio_text.substring(0, 150)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {dictation.audio_text.split(/\s+/).filter(Boolean).length} so'z
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlayAudio(dictation.audio_text, dictation.language)}
                        >
                          {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(dictation)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(dictation.id, dictation.is_active)}
                        >
                          <Switch checked={dictation.is_active} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dictation.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DictationManager;
