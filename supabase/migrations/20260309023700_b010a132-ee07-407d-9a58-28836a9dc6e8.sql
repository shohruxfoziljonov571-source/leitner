
-- ============================================
-- 1. FIX quiz_sessions: Drop ALL old policies, keep only 4 clean PERMISSIVE
-- ============================================

-- Drop ALL existing policies (old RESTRICTIVE + new ones from failed migration)
DROP POLICY IF EXISTS "Users can create quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can create their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_select" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_insert" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_update" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_delete" ON public.quiz_sessions;

-- Create 4 clean PERMISSIVE policies
CREATE POLICY "quiz_sessions_select" ON public.quiz_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "quiz_sessions_insert" ON public.quiz_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_sessions_update" ON public.quiz_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_sessions_delete" ON public.quiz_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- 2. FIX contest_participants: Drop ALL old, create clean PERMISSIVE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage participants " ON public.contest_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants " ON public.contest_participants;
DROP POLICY IF EXISTS "Users can join contests " ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_admin" ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_insert" ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_select" ON public.contest_participants;

CREATE POLICY "contest_participants_select" ON public.contest_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contest_participants_insert" ON public.contest_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contest_participants_update" ON public.contest_participants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "contest_participants_delete" ON public.contest_participants
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. CREATE DB TRIGGERS
-- ============================================

-- handle_new_user trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- validate contest referrals on word insert
CREATE OR REPLACE TRIGGER on_word_insert_validate_contest_referral
  AFTER INSERT ON public.words
  FOR EACH ROW EXECUTE FUNCTION public.validate_contest_referrals_on_word();

-- validate user referrals on word insert
CREATE OR REPLACE TRIGGER on_word_insert_validate_user_referral
  AFTER INSERT ON public.words
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_referral_on_word();

-- ============================================
-- 4. ad_clicks: Add admin SELECT policy
-- ============================================

DROP POLICY IF EXISTS "ad_clicks_admin_select" ON public.ad_clicks;
CREATE POLICY "ad_clicks_admin_select" ON public.ad_clicks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. FIX required_channels: Replace RESTRICTIVE with PERMISSIVE
-- ============================================

DROP POLICY IF EXISTS "Admins can view all channels " ON public.required_channels;
DROP POLICY IF EXISTS "Anyone can view active channels " ON public.required_channels;
DROP POLICY IF EXISTS "Admins can insert channels " ON public.required_channels;
DROP POLICY IF EXISTS "Admins can update channels " ON public.required_channels;
DROP POLICY IF EXISTS "Admins can delete channels " ON public.required_channels;

CREATE POLICY "required_channels_select" ON public.required_channels
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "required_channels_insert" ON public.required_channels
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "required_channels_update" ON public.required_channels
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "required_channels_delete" ON public.required_channels
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
