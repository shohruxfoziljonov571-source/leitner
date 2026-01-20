-- Create function to validate contest referrals when a user adds their first word
CREATE OR REPLACE FUNCTION public.validate_contest_referrals_on_word()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
  contest_record RECORD;
BEGIN
  -- Only trigger for INSERT
  IF TG_OP = 'INSERT' THEN
    -- Find all pending referrals for this user
    FOR referral_record IN 
      SELECT cr.id, cr.contest_id, cr.referrer_user_id
      FROM public.contest_referrals cr
      JOIN public.contests c ON c.id = cr.contest_id
      WHERE cr.referred_user_id = NEW.user_id
        AND cr.is_valid = false
        AND c.is_active = true
        AND c.end_date > NOW()
    LOOP
      -- Mark referral as valid
      UPDATE public.contest_referrals
      SET is_valid = true, validated_at = NOW()
      WHERE id = referral_record.id;
      
      -- Increment referrer's referral_count
      UPDATE public.contest_participants
      SET referral_count = COALESCE(referral_count, 0) + 1
      WHERE contest_id = referral_record.contest_id
        AND user_id = referral_record.referrer_user_id;
      
      RAISE LOG 'Validated contest referral: % for referrer: %', referral_record.id, referral_record.referrer_user_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_validate_contest_referrals ON public.words;

-- Create trigger to validate referrals when word is added
CREATE TRIGGER trigger_validate_contest_referrals
AFTER INSERT ON public.words
FOR EACH ROW
EXECUTE FUNCTION public.validate_contest_referrals_on_word();

-- Create function to increment referral count (for edge function use)
CREATE OR REPLACE FUNCTION public.increment_referral_count(p_contest_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.contest_participants
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE contest_id = p_contest_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;