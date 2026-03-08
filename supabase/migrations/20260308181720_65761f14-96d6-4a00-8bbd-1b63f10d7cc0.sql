
-- ============================================
-- Fix quiz_sessions: drop ALL 8 RESTRICTIVE policies, create 4 PERMISSIVE ones
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can create their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update their quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view quiz sessions " ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view their quiz sessions " ON public.quiz_sessions;

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
-- Fix contest_participants: drop RESTRICTIVE policies, create PERMISSIVE ones
-- ============================================
DROP POLICY IF EXISTS "Admins can manage participants " ON public.contest_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants " ON public.contest_participants;
DROP POLICY IF EXISTS "Users can join contests " ON public.contest_participants;

CREATE POLICY "contest_participants_select" ON public.contest_participants
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "contest_participants_insert" ON public.contest_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contest_participants_admin" ON public.contest_participants
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
