-- Challenge rewards table for tracking winner rewards
CREATE TABLE public.challenge_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 3),
  badge_type TEXT NOT NULL, -- 'gold', 'silver', 'bronze'
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id),
  UNIQUE(challenge_id, rank)
);

-- Word duels table
CREATE TABLE public.word_duels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  opponent_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined', 'expired')),
  word_count INTEGER NOT NULL DEFAULT 5,
  challenger_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  challenger_time_ms INTEGER DEFAULT 0,
  opponent_time_ms INTEGER DEFAULT 0,
  winner_id UUID,
  current_word_index INTEGER DEFAULT 0,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Duel responses for tracking individual word answers
CREATE TABLE public.duel_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duel_id UUID NOT NULL REFERENCES public.word_duels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  word_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(duel_id, user_id, word_index)
);

-- Enable RLS
ALTER TABLE public.challenge_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge_rewards
CREATE POLICY "Users can view all rewards" ON public.challenge_rewards
  FOR SELECT USING (true);

CREATE POLICY "System can insert rewards" ON public.challenge_rewards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can claim their own rewards" ON public.challenge_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for word_duels
CREATE POLICY "Users can view their duels" ON public.word_duels
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create duels" ON public.word_duels
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants can update duels" ON public.word_duels
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- RLS policies for duel_responses
CREATE POLICY "Duel participants can view responses" ON public.duel_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.word_duels d 
      WHERE d.id = duel_id AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their responses" ON public.duel_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for duels
ALTER PUBLICATION supabase_realtime ADD TABLE public.word_duels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_responses;

-- Function to process weekly challenge winners
CREATE OR REPLACE FUNCTION public.process_challenge_winners(p_challenge_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_rank INTEGER := 0;
  v_bonus_xp INTEGER;
  v_badge_type TEXT;
BEGIN
  -- Get top 3 participants
  FOR v_participant IN
    SELECT user_id, xp_earned
    FROM weekly_challenge_participants
    WHERE challenge_id = p_challenge_id
    ORDER BY xp_earned DESC
    LIMIT 3
  LOOP
    v_rank := v_rank + 1;
    
    -- Determine badge and bonus XP based on rank
    CASE v_rank
      WHEN 1 THEN
        v_badge_type := 'gold';
        v_bonus_xp := 500;
      WHEN 2 THEN
        v_badge_type := 'silver';
        v_bonus_xp := 300;
      WHEN 3 THEN
        v_badge_type := 'bronze';
        v_bonus_xp := 150;
    END CASE;
    
    -- Insert reward (ignore if already exists)
    INSERT INTO challenge_rewards (challenge_id, user_id, rank, badge_type, bonus_xp)
    VALUES (p_challenge_id, v_participant.user_id, v_rank, v_badge_type, v_bonus_xp)
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;