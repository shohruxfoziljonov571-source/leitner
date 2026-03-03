import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ReferralData {
  totalReferrals: number;
  validReferrals: number;
  referralCode: string | null;
  referralUrl: string;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const REQUIRED_REFERRALS = 10;

export const useReferrals = (): ReferralData => {
  const { user } = useAuth();
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [validReferrals, setValidReferrals] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get friend_code from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('friend_code')
        .eq('user_id', user.id)
        .single();

      setReferralCode(profile?.friend_code || null);

      // Count referrals - table may not be in generated types yet
      const { data: referrals } = await supabase
        .from('user_referrals')
        .select('id, is_valid')
        .eq('referrer_user_id', user.id);

      if (referrals) {
        setTotalReferrals(referrals.length);
        setValidReferrals(referrals.filter(r => r.is_valid).length);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const referralUrl = referralCode
    ? `https://t.me/Leitner_robot?start=ref_${referralCode}`
    : '';

  return {
    totalReferrals,
    validReferrals,
    referralCode,
    referralUrl,
    isLoading,
    refetch: fetchData,
  };
};

export { REQUIRED_REFERRALS };
