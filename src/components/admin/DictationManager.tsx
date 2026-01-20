import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Volume2, Play, Pause, FileAudio, Upload, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDictation, setEditingDictation] = useState<Dictation | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    language: 'en',
    audio_text: '',
    audio_url: '',
    duration_seconds: 0,
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type)) {
      toast.error('Faqat audio fayllar (MP3, WAV, OGG, M4A) yuklash mumkin');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fayl hajmi 50MB dan oshmasligi kerak');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `dictations/${fileName}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from('dictation-audio')
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dictation-audio')
        .getPublicUrl(filePath);

      // Get audio duration
      const audio = new Audio(publicUrl);
      audio.onloadedmetadata = () => {
        setFormData(prev => ({
          ...prev,
          audio_url: publicUrl,
          duration_seconds: Math.round(audio.duration)
        }));
      };

      setUploadProgress(100);
      toast.success('Audio fayl yuklandi');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Audio yuklashda xatolik');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemoveAudio = async () => {
    if (formData.audio_url) {
      // Extract file path from URL
      const urlParts = formData.audio_url.split('/');
      const filePath = urlParts.slice(-2).join('/');
      
      try {
        await supabase.storage
          .from('dictation-audio')
          .remove([filePath]);
      } catch (error) {
        console.error('Error removing audio:', error);
      }
    }
    
    setFormData(prev => ({ ...prev, audio_url: '', duration_seconds: 0 }));
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
            audio_url: formData.audio_url || null,
            duration_seconds: formData.duration_seconds || null,
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
            audio_url: formData.audio_url || null,
            duration_seconds: formData.duration_seconds || null,
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

  const handleDelete = async (dictation: Dictation) => {
    if (!confirm('Diktantni o\'chirishni xohlaysizmi?')) return;

    try {
      // Delete audio file if exists
      if (dictation.audio_url) {
        const urlParts = dictation.audio_url.split('/');
        const filePath = urlParts.slice(-2).join('/');
        await supabase.storage.from('dictation-audio').remove([filePath]);
      }

      const { error } = await supabase
        .from('audio_dictations')
        .delete()
        .eq('id', dictation.id);

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
      audio_url: dictation.audio_url || '',
      duration_seconds: dictation.duration_seconds || 0,
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
      audio_url: '',
      duration_seconds: 0,
      is_active: true
    });
    setEditingDictation(null);
  };

  const handlePlayAudio = (dictation: Dictation) => {
    if (dictation.audio_url) {
      // Play uploaded audio
      if (playingAudioId === dictation.id) {
        audioRef.current?.pause();
        setPlayingAudioId(null);
      } else {
        if (audioRef.current) {
          audioRef.current.src = dictation.audio_url;
          audioRef.current.play();
          setPlayingAudioId(dictation.id);
        }
      }
    } else {
      // Use TTS
      if (isSpeaking) {
        stop();
      } else {
        speak(dictation.audio_text, { lang: dictation.language, rate: 0.8 });
      }
    }
  };

  const handlePlayPreview = () => {
    if (formData.audio_url) {
      if (audioRef.current) {
        if (playingAudioId === 'preview') {
          audioRef.current.pause();
          setPlayingAudioId(null);
        } else {
          audioRef.current.src = formData.audio_url;
          audioRef.current.play();
          setPlayingAudioId('preview');
        }
      }
    } else if (formData.audio_text) {
      if (isSpeaking) {
        stop();
      } else {
        speak(formData.audio_text, { lang: formData.language, rate: 0.8 });
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudioId(null)}
        onPause={() => setPlayingAudioId(null)}
      />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Audio Diktantlar</h2>
          <p className="text-sm text-muted-foreground">
            Diktant matnlari va audio fayllarini qo'shing
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

              {/* Audio Upload Section */}
              <div className="space-y-2">
                <Label>Audio fayl (ixtiyoriy)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
                  {formData.audio_url ? (
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <FileAudio className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Audio yuklangan</p>
                          <p className="text-xs text-muted-foreground">
                            {formData.duration_seconds > 0 && formatDuration(formData.duration_seconds)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePlayPreview}
                        >
                          {playingAudioId === 'preview' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAudio}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Yuklanmoqda...' : 'Audio yuklash'}
                      </Button>
                      {isUploading && (
                        <Progress value={uploadProgress} className="h-2" />
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        MP3, WAV, OGG yoki M4A (max 50MB)
                      </p>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Audio yuklamasangiz, matn TTS orqali o'qiladi
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Diktant matni * (AI tekshirish uchun)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePlayPreview}
                    disabled={!formData.audio_text && !formData.audio_url}
                  >
                    {(isSpeaking || playingAudioId === 'preview') ? (
                      <><Pause className="h-4 w-4 mr-1" /> To'xtatish</>
                    ) : (
                      <><Volume2 className="h-4 w-4 mr-1" /> Tinglash</>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={formData.audio_text}
                  onChange={(e) => setFormData({ ...formData, audio_text: e.target.value })}
                  placeholder="Diktant uchun matnni kiriting (foydalanuvchi javobini tekshirish uchun)..."
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
                          {dictation.audio_url && (
                            <Badge variant="secondary" className="gap-1">
                              <FileAudio className="h-3 w-3" />
                              Audio
                            </Badge>
                          )}
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
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{dictation.audio_text.split(/\s+/).filter(Boolean).length} so'z</span>
                          {dictation.duration_seconds && dictation.duration_seconds > 0 && (
                            <span>{formatDuration(dictation.duration_seconds)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlayAudio(dictation)}
                        >
                          {(playingAudioId === dictation.id || (isSpeaking && !dictation.audio_url)) ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
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
                          onClick={() => handleDelete(dictation)}
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
