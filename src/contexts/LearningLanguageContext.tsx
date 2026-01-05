import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface UserLanguage {
  id: string;
  source_language: 'uz' | 'ru' | 'en';
  target_language: 'uz' | 'ru' | 'en';
  created_at: string;
}

interface LearningLanguageContextType {
  userLanguages: UserLanguage[];
  activeLanguage: UserLanguage | null;
  setActiveLanguage: (lang: UserLanguage | null) => void;
  isLoading: boolean;
  addLanguage: (source: string, target: string) => Promise<UserLanguage | null>;
  removeLanguage: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const LearningLanguageContext = createContext<LearningLanguageContextType | undefined>(undefined);

export const LearningLanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userLanguages, setUserLanguages] = useState<UserLanguage[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<UserLanguage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchLanguages = async () => {
    if (!user) {
      setUserLanguages([]);
      setActiveLanguage(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_languages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const typedData = (data || []) as UserLanguage[];
      setUserLanguages(typedData);
      
      // Set first language as active if none selected
      if (!activeLanguage && typedData.length > 0) {
        const savedActiveId = localStorage.getItem('active-language-id');
        const savedLang = typedData.find(l => l.id === savedActiveId);
        setActiveLanguage(savedLang || typedData[0]);
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, [user]);

  useEffect(() => {
    if (activeLanguage) {
      localStorage.setItem('active-language-id', activeLanguage.id);
    }
  }, [activeLanguage]);

  const addLanguage = async (source: string, target: string): Promise<UserLanguage | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_languages')
        .insert({
          user_id: user.id,
          source_language: source,
          target_language: target,
        })
        .select()
        .single();

      if (error) throw error;

      const newLang = data as UserLanguage;
      setUserLanguages(prev => [...prev, newLang]);
      
      if (!activeLanguage) {
        setActiveLanguage(newLang);
      }

      // Also create stats for this language
      await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
          user_language_id: newLang.id,
        });

      return newLang;
    } catch (error) {
      console.error('Error adding language:', error);
      return null;
    }
  };

  const removeLanguage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_languages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUserLanguages(prev => prev.filter(l => l.id !== id));
      
      if (activeLanguage?.id === id) {
        const remaining = userLanguages.filter(l => l.id !== id);
        setActiveLanguage(remaining[0] || null);
      }
    } catch (error) {
      console.error('Error removing language:', error);
    }
  };

  return (
    <LearningLanguageContext.Provider value={{
      userLanguages,
      activeLanguage,
      setActiveLanguage,
      isLoading,
      addLanguage,
      removeLanguage,
      refetch: fetchLanguages,
    }}>
      {children}
    </LearningLanguageContext.Provider>
  );
};

export const useLearningLanguage = (): LearningLanguageContextType => {
  const context = useContext(LearningLanguageContext);
  if (!context) {
    throw new Error('useLearningLanguage must be used within a LearningLanguageProvider');
  }
  return context;
};
