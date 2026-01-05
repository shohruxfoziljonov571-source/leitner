import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Uy', icon: '🏠', color: 'hsl(200, 70%, 50%)' },
  { name: 'Ofis', icon: '💼', color: 'hsl(220, 70%, 50%)' },
  { name: 'Sayohat', icon: '✈️', color: 'hsl(280, 70%, 50%)' },
  { name: 'Ovqat', icon: '🍽️', color: 'hsl(30, 70%, 50%)' },
  { name: 'Sog\'liq', icon: '🏥', color: 'hsl(0, 70%, 50%)' },
  { name: 'Sport', icon: '⚽', color: 'hsl(120, 70%, 50%)' },
  { name: 'Moda', icon: '👕', color: 'hsl(320, 70%, 50%)' },
  { name: 'Texnologiya', icon: '💻', color: 'hsl(180, 70%, 50%)' },
];

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (category: { name: string; icon: string; color: string }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      toast.success(`"${category.name}" kategoriyasi qo'shildi`);
      return data;
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Kategoriya qo\'shishda xatolik');
      return null;
    }
  }, [user]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('Kategoriya yangilandi');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Yangilashda xatolik');
    }
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Kategoriya o\'chirildi');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('O\'chirishda xatolik');
    }
  }, [user]);

  const initializeDefaultCategories = useCallback(async () => {
    if (!user || categories.length > 0) return;

    try {
      const categoriesToInsert = DEFAULT_CATEGORIES.map(c => ({
        user_id: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      }));

      const { data, error } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select();

      if (error) throw error;

      setCategories(data || []);
      toast.success('Standart kategoriyalar qo\'shildi');
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  }, [user, categories.length]);

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    initializeDefaultCategories,
    refetch: fetchCategories,
  };
};
