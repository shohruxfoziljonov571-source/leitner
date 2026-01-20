import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  is_active: boolean;
}

const CATEGORIES = [
  { value: 'words', label: "So'zlar" },
  { value: 'streak', label: 'Streak' },
  { value: 'reviews', label: 'Takrorlar' },
  { value: 'xp', label: 'XP' },
  { value: 'social', label: 'Ijtimoiy' },
  { value: 'special', label: 'Maxsus' }
];

const REQUIREMENT_TYPES = [
  { value: 'total_words', label: "Jami so'zlar" },
  { value: 'learned_words', label: "O'rganilgan so'zlar" },
  { value: 'streak_days', label: 'Streak kunlari' },
  { value: 'total_reviews', label: 'Jami takrorlar' },
  { value: 'xp_earned', label: 'Yig\'ilgan XP' },
  { value: 'friends_count', label: "Do'stlar soni" },
  { value: 'duels_won', label: 'Yutilgan duellar' },
  { value: 'perfect_sessions', label: "100% sessiyalar" }
];

const ICONS = ['🏆', '⭐', '🎯', '🔥', '💪', '📚', '🎉', '👑', '💎', '🚀', '🌟', '🏅', '🥇', '🥈', '🥉'];

const AchievementManager = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: '🏆',
    category: 'words',
    requirement_type: 'total_words',
    requirement_value: 10,
    xp_reward: 50
  });
  const [saving, setSaving] = useState(false);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })
        .order('requirement_value', { ascending: true });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Yutuqlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const openCreateDialog = () => {
    setEditingAchievement(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      icon: '🏆',
      category: 'words',
      requirement_type: 'total_words',
      requirement_value: 10,
      xp_reward: 50
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      requirement_type: achievement.requirement_type,
      requirement_value: achievement.requirement_value,
      xp_reward: achievement.xp_reward
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.description) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }

    setSaving(true);
    try {
      if (editingAchievement) {
        const { error } = await supabase
          .from('achievements')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAchievement.id);

        if (error) throw error;
        toast.success('Yutuq yangilandi');
      } else {
        const { error } = await supabase
          .from('achievements')
          .insert(formData);

        if (error) throw error;
        toast.success("Yutuq qo'shildi");
      }

      setIsDialogOpen(false);
      fetchAchievements();
    } catch (error: any) {
      console.error('Error saving achievement:', error);
      toast.error(error.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (achievement: Achievement) => {
    try {
      const { error } = await supabase
        .from('achievements')
        .update({ is_active: !achievement.is_active })
        .eq('id', achievement.id);

      if (error) throw error;
      fetchAchievements();
    } catch (error) {
      console.error('Error toggling achievement:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const deleteAchievement = async (id: string) => {
    if (!confirm("Yutuqni o'chirishni tasdiqlaysizmi?")) return;

    try {
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Yutuq o'chirildi");
      fetchAchievements();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error("O'chirishda xatolik");
    }
  };

  const getCategoryLabel = (value: string) => 
    CATEGORIES.find(c => c.value === value)?.label || value;

  const getRequirementLabel = (value: string) =>
    REQUIREMENT_TYPES.find(r => r.value === value)?.label || value;

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
            <Trophy className="h-5 w-5" />
            Yutuqlar boshqaruvi
          </CardTitle>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Yangi yutuq
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Hali yutuqlar qo'shilmagan
              </div>
            ) : (
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      !achievement.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{achievement.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{achievement.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {getCategoryLabel(achievement.category)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRequirementLabel(achievement.requirement_type)}: {achievement.requirement_value} | 
                          XP: +{achievement.xp_reward}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(achievement)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(achievement)}
                      >
                        {achievement.is_active ? (
                          <ToggleRight className="h-5 w-5 text-primary" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAchievement(achievement.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAchievement ? 'Yutuqni tahrirlash' : "Yangi yutuq qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kod</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="first_100_words"
                  disabled={!!editingAchievement}
                />
              </div>
              <div className="space-y-2">
                <Label>Ikonka</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="100 ta so'z"
              />
            </div>

            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="100 ta so'z qo'shing"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategoriya</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Talab turi</Label>
                <Select 
                  value={formData.requirement_type} 
                  onValueChange={(v) => setFormData({ ...formData, requirement_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_TYPES.map((req) => (
                      <SelectItem key={req.value} value={req.value}>{req.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Talab qiymati</Label>
                <Input
                  type="number"
                  value={formData.requirement_value}
                  onChange={(e) => setFormData({ ...formData, requirement_value: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>XP mukofot</Label>
                <Input
                  type="number"
                  value={formData.xp_reward}
                  onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AchievementManager;
