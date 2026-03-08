
-- 1. Add missing triggers for referral validation on words table
CREATE TRIGGER on_word_insert_validate_contest_referrals
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contest_referrals_on_word();

CREATE TRIGGER on_word_insert_validate_user_referral
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_referral_on_word();

-- 2. Fix quiz_sessions RLS (RESTRICTIVE → PERMISSIVE)
DROP POLICY IF EXISTS "Users can create their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view their quiz sessions " ON public.quiz_sessions;

CREATE POLICY "Users can create quiz sessions"
  ON public.quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete quiz sessions"
  ON public.quiz_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update quiz sessions"
  ON public.quiz_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view quiz sessions"
  ON public.quiz_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Atomic XP increment function (prevents race conditions)
CREATE OR REPLACE FUNCTION public.increment_user_xp(
  p_user_id uuid,
  p_language_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_xp integer;
  v_new_level integer;
BEGIN
  UPDATE user_stats
  SET
    xp = COALESCE(xp, 0) + p_amount,
    level = GREATEST(1, FLOOR((75 + SQRT(5625 + 300.0 * (COALESCE(xp, 0) + p_amount))) / 150)::integer)
  WHERE user_id = p_user_id AND user_language_id = p_language_id
  RETURNING xp, level INTO v_new_xp, v_new_level;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('new_xp', 0, 'new_level', 1);
  END IF;

  RETURN jsonb_build_object('new_xp', v_new_xp, 'new_level', v_new_level);
END;
$$;
