-- Add tracking so we can send Telegram notifications exactly once per validated referral
ALTER TABLE public.contest_referrals
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ NULL;

-- Speed up polling for "validated but not notified" referrals
CREATE INDEX IF NOT EXISTS idx_contest_referrals_unnotified
ON public.contest_referrals (validated_at)
WHERE is_valid = true AND notified_at IS NULL;