import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Subscription {
  id: string;
  plan: 'free' | 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled';
  starts_at: string;
  expires_at: string | null;
}

interface PremiumLimits {
  maxWordsPerDay: number;
  maxQuizPerDay: number;
  maxCategories: number;
  maxLanguages: number;
  hasAIReview: boolean;
  hasDictation: boolean;
  hasBooks: boolean;
  hasMnemonics: boolean;
  hasExcelImport: boolean;
  hasAdvancedStats: boolean;
  hasDuels: boolean;
  hasQuizModes: boolean;
}

const FREE_LIMITS: PremiumLimits = {
  maxWordsPerDay: Infinity,
  maxQuizPerDay: Infinity,
  maxCategories: 3,
  maxLanguages: 1,
  hasAIReview: false,
  hasDictation: false,
  hasBooks: false,
  hasMnemonics: false,
  hasExcelImport: false,
  hasAdvancedStats: false,
  hasDuels: false,
  hasQuizModes: false,
};

const PREMIUM_LIMITS: PremiumLimits = {
  maxWordsPerDay: Infinity,
  maxQuizPerDay: Infinity,
  maxCategories: Infinity,
  maxLanguages: Infinity,
  hasAIReview: true,
  hasDictation: true,
  hasBooks: true,
  hasMnemonics: true,
  hasExcelImport: true,
  hasAdvancedStats: true,
  hasDuels: true,
  hasQuizModes: true,
};

interface PremiumContextType {
  isPremium: boolean;
  subscription: Subscription | null;
  limits: PremiumLimits;
  isLoading: boolean;
  hasPendingPayment: boolean;
  refetch: () => Promise<void>;
  checkFeature: (feature: keyof PremiumLimits) => boolean;
  daysUntilExpiry: number | null;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const [{ data: subData }, { data: pending }] = await Promise.all([
        supabase.rpc('get_active_subscription', { p_user_id: user.id }),
        supabase
          .from('premium_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .limit(1),
      ]);

      // RPC returns array, take first
      const sub = Array.isArray(subData) ? subData[0] : subData;
      if (sub) {
        setSubscription(sub as Subscription);
      }

      setHasPendingPayment((pending?.length || 0) > 0);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPremium = subscription?.plan !== 'free' && subscription?.plan !== undefined && subscription?.status === 'active';
  const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;

  const checkFeature = (feature: keyof PremiumLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    return true;
  };

  const daysUntilExpiry = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <PremiumContext.Provider value={{
      isPremium,
      subscription,
      limits,
      isLoading,
      hasPendingPayment,
      refetch: fetchSubscription,
      checkFeature,
      daysUntilExpiry,
    }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};
