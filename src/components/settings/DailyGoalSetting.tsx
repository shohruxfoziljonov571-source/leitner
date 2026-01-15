import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { toast } from 'sonner';

const GOAL_OPTIONS = [5, 10, 15, 20, 30, 50];

const DailyGoalSetting: React.FC = () => {
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalGoal, setOriginalGoal] = useState(10);

  useEffect(() => {
    const fetchGoal = async () => {
      if (!user || !activeLanguage) return;

      const { data } = await supabase
        .from('user_stats')
        .select('daily_goal')
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id)
        .maybeSingle();

      if (data?.daily_goal) {
        setDailyGoal(data.daily_goal);
        setOriginalGoal(data.daily_goal);
      }
    };

    fetchGoal();
  }, [user, activeLanguage]);

  const handleGoalChange = (value: number) => {
    setDailyGoal(value);
    setHasChanges(value !== originalGoal);
  };

  const handleSave = async () => {
    if (!user || !activeLanguage) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_stats')
        .update({ daily_goal: dailyGoal })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      if (error) throw error;

      setOriginalGoal(dailyGoal);
      setHasChanges(false);
      toast.success(`Kunlik maqsad ${dailyGoal} so'zga o'zgartirildi!`);
    } catch (error) {
      console.error('Error saving daily goal:', error);
      toast.error('Xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">Kunlik maqsad</h3>
          <p className="text-sm text-muted-foreground">
            Har kuni nechta so'z takrorlashni belgilang
          </p>
        </div>
      </div>

      {/* Current goal display */}
      <div className="text-center py-4">
        <motion.div
          key={dailyGoal}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-bold text-primary"
        >
          {dailyGoal}
        </motion.div>
        <p className="text-muted-foreground mt-1">so'z / kun</p>
      </div>

      {/* Quick select buttons */}
      <div className="grid grid-cols-3 gap-2">
        {GOAL_OPTIONS.map((goal) => (
          <Button
            key={goal}
            variant={dailyGoal === goal ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleGoalChange(goal)}
            className="h-10"
          >
            {goal}
          </Button>
        ))}
      </div>

      {/* Slider for custom value */}
      <div className="px-2 py-4">
        <Slider
          value={[dailyGoal]}
          onValueChange={([value]) => handleGoalChange(value)}
          min={1}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>1</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Motivation text */}
      <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-xl">
        {dailyGoal <= 10 ? (
          <span>🌱 Yaxshi boshlang'ich! Har kuni oz-ozdan o'rganing.</span>
        ) : dailyGoal <= 20 ? (
          <span>💪 Zo'r! O'rtacha tezlikda o'rganasiz.</span>
        ) : dailyGoal <= 30 ? (
          <span>🔥 Jiddiy yondashuv! Tez rivojlanasiz.</span>
        ) : (
          <span>🚀 Super intensiv! Siz haqiqiy chempionsiz!</span>
        )}
      </div>

      {/* Save button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full gap-2"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default DailyGoalSetting;
