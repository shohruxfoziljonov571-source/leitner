
-- Tighten insert policy: only authenticated users can create referrals
DROP POLICY "Service can insert referrals" ON public.user_referrals;
CREATE POLICY "Authenticated users can insert referrals" ON public.user_referrals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten update policy: only referrer or system
DROP POLICY "Service can update referrals" ON public.user_referrals;
CREATE POLICY "Users can update own referrals" ON public.user_referrals
  FOR UPDATE USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
