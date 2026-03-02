
-- User referral tracking table
CREATE TABLE public.user_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_user_id, referred_user_id)
);

-- Enable RLS
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view their referrals" ON public.user_referrals
  FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- Service role / edge functions can insert
CREATE POLICY "Service can insert referrals" ON public.user_referrals
  FOR INSERT WITH CHECK (true);

-- Service role can update referrals
CREATE POLICY "Service can update referrals" ON public.user_referrals
  FOR UPDATE USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage referrals" ON public.user_referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to count valid referrals for a user
CREATE OR REPLACE FUNCTION public.get_valid_referral_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM user_referrals
    WHERE referrer_user_id = p_user_id AND is_valid = true
  );
END;
$$;

-- Trigger: when a new word is inserted, validate any pending referrals for that user
CREATE OR REPLACE FUNCTION public.validate_user_referral_on_word()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_record RECORD;
  ref_count INTEGER;
BEGIN
  -- Only on first word
  IF (SELECT COUNT(*) FROM words WHERE user_id = NEW.user_id) = 1 THEN
    -- Validate pending referrals
    FOR ref_record IN
      SELECT id, referrer_user_id
      FROM user_referrals
      WHERE referred_user_id = NEW.user_id AND is_valid = false
    LOOP
      UPDATE user_referrals
      SET is_valid = true, validated_at = now()
      WHERE id = ref_record.id;

      -- Check if referrer now has 10 valid referrals
      SELECT COUNT(*)::integer INTO ref_count
      FROM user_referrals
      WHERE referrer_user_id = ref_record.referrer_user_id AND is_valid = true;

      IF ref_count >= 10 AND ref_count % 10 = 0 THEN
        -- Grant 1 month premium
        INSERT INTO subscriptions (user_id, plan, status, starts_at, expires_at)
        VALUES (
          ref_record.referrer_user_id,
          'monthly',
          'active',
          now(),
          now() + INTERVAL '30 days'
        )
        ON CONFLICT (user_id) DO UPDATE SET
          plan = 'monthly',
          status = 'active',
          starts_at = now(),
          expires_at = GREATEST(
            COALESCE(subscriptions.expires_at, now()),
            now()
          ) + INTERVAL '30 days',
          updated_at = now();
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Add unique constraint on subscriptions for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE TRIGGER trigger_validate_user_referral
AFTER INSERT ON public.words
FOR EACH ROW
EXECUTE FUNCTION validate_user_referral_on_word();
