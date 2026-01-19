
-- Konkurslar jadvali
CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contest_type TEXT NOT NULL DEFAULT 'referral', -- 'referral', 'xp', 'words', 'streak'
  winner_count INTEGER NOT NULL DEFAULT 3, -- Top 3, Top 10, etc.
  prizes JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{"place": 1, "prize": "50,000 so'm"}, ...]
  min_referrals INTEGER NOT NULL DEFAULT 1, -- Minimum referrals to qualify
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  -- Kontestni yaratgan admin
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Konkurs ishtirokchilari
CREATE TABLE public.contest_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  telegram_chat_id BIGINT,
  telegram_username TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  referral_count INTEGER NOT NULL DEFAULT 0, -- Valid referrallar soni
  xp_earned INTEGER NOT NULL DEFAULT 0,
  words_added INTEGER NOT NULL DEFAULT 0,
  -- Bitta foydalanuvchi bitta konkursda 1 marta qatnashadi
  UNIQUE(contest_id, user_id)
);

-- Valid referrallar (faqat 1+ so'z qo'shgan foydalanuvchilar)
CREATE TABLE public.contest_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL, -- Taklif qiluvchi
  referred_user_id UUID NOT NULL, -- Taklif qilingan
  referred_telegram_chat_id BIGINT,
  is_valid BOOLEAN NOT NULL DEFAULT false, -- 1+ so'z qo'shgandan keyin true
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Bitta foydalanuvchi bitta konkursda 1 marta taklif qilinadi
  UNIQUE(contest_id, referred_user_id)
);

-- RLS Policies for contests
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contests"
ON public.contests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active contests"
ON public.contests FOR SELECT
USING (is_active = true);

-- RLS Policies for contest_participants
ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage participants"
ON public.contest_participants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view participants"
ON public.contest_participants FOR SELECT
USING (true);

CREATE POLICY "Users can join contests"
ON public.contest_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for contest_referrals
ALTER TABLE public.contest_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contest referrals"
ON public.contest_referrals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their referrals"
ON public.contest_referrals FOR SELECT
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- Function: Validate referral when user adds their first word
CREATE OR REPLACE FUNCTION public.validate_contest_referral()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_record RECORD;
BEGIN
  -- Only process when user's first word is added
  IF (SELECT COUNT(*) FROM words WHERE user_id = NEW.user_id) = 1 THEN
    -- Find any unvalidated referral for this user in active contests
    FOR v_referral_record IN 
      SELECT cr.id, cr.contest_id, cr.referrer_user_id
      FROM contest_referrals cr
      JOIN contests c ON c.id = cr.contest_id
      WHERE cr.referred_user_id = NEW.user_id
        AND cr.is_valid = false
        AND c.is_active = true
        AND c.end_date > now()
    LOOP
      -- Mark referral as valid
      UPDATE contest_referrals
      SET is_valid = true, validated_at = now()
      WHERE id = v_referral_record.id;
      
      -- Increment referrer's count in participants
      UPDATE contest_participants
      SET referral_count = referral_count + 1
      WHERE contest_id = v_referral_record.contest_id
        AND user_id = v_referral_record.referrer_user_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for validating referrals
CREATE TRIGGER on_word_added_validate_referral
AFTER INSERT ON public.words
FOR EACH ROW
EXECUTE FUNCTION public.validate_contest_referral();

-- Function: Get active contest for bot
CREATE OR REPLACE FUNCTION public.get_active_contest()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  end_date TIMESTAMP WITH TIME ZONE,
  contest_type TEXT,
  winner_count INTEGER,
  prizes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.title, c.description, c.image_url, 
    c.end_date, c.contest_type, c.winner_count, c.prizes
  FROM contests c
  WHERE c.is_active = true
    AND c.start_date <= now()
    AND c.end_date > now()
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

-- Function: Get contest leaderboard
CREATE OR REPLACE FUNCTION public.get_contest_leaderboard(p_contest_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  telegram_username TEXT,
  referral_count INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.user_id,
    p.full_name,
    cp.telegram_username,
    cp.referral_count,
    ROW_NUMBER() OVER (ORDER BY cp.referral_count DESC, cp.joined_at ASC) as rank
  FROM contest_participants cp
  LEFT JOIN profiles p ON p.user_id = cp.user_id
  WHERE cp.contest_id = p_contest_id
    AND cp.referral_count > 0
  ORDER BY cp.referral_count DESC, cp.joined_at ASC;
END;
$$;

-- Updated timestamps trigger
CREATE TRIGGER update_contests_updated_at
BEFORE UPDATE ON public.contests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
