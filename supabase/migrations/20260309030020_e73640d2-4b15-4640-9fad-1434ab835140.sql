
-- CLEAN DUPLICATE RLS ON quiz_sessions (12 -> 4)
DROP POLICY IF EXISTS "Users can create quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can create their quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can delete their quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can update their quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view their quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_delete" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_insert" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_select" ON public.quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions_update" ON public.quiz_sessions;

CREATE POLICY "quiz_sessions_select" ON public.quiz_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz_sessions_insert" ON public.quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_sessions_update" ON public.quiz_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_sessions_delete" ON public.quiz_sessions FOR DELETE USING (auth.uid() = user_id);

-- CLEAN DUPLICATE RLS ON contest_participants (7 -> 4)
DROP POLICY IF EXISTS "Admins can manage participants" ON public.contest_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.contest_participants;
DROP POLICY IF EXISTS "Users can join contests" ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_delete" ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_insert" ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_select" ON public.contest_participants;
DROP POLICY IF EXISTS "contest_participants_update" ON public.contest_participants;

CREATE POLICY "contest_participants_select" ON public.contest_participants FOR SELECT USING (true);
CREATE POLICY "contest_participants_insert" ON public.contest_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contest_participants_update" ON public.contest_participants FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "contest_participants_delete" ON public.contest_participants FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- CLEAN DUPLICATE RLS ON required_channels (9 -> 4)
DROP POLICY IF EXISTS "Admins can delete channels" ON public.required_channels;
DROP POLICY IF EXISTS "Admins can insert channels" ON public.required_channels;
DROP POLICY IF EXISTS "Admins can update channels" ON public.required_channels;
DROP POLICY IF EXISTS "Admins can view all channels" ON public.required_channels;
DROP POLICY IF EXISTS "Anyone can view active channels" ON public.required_channels;
DROP POLICY IF EXISTS "required_channels_delete" ON public.required_channels;
DROP POLICY IF EXISTS "required_channels_insert" ON public.required_channels;
DROP POLICY IF EXISTS "required_channels_select" ON public.required_channels;
DROP POLICY IF EXISTS "required_channels_update" ON public.required_channels;

CREATE POLICY "required_channels_select" ON public.required_channels FOR SELECT USING ((is_active = true) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "required_channels_insert" ON public.required_channels FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "required_channels_update" ON public.required_channels FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "required_channels_delete" ON public.required_channels FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ADD ADMIN SELECT POLICIES
CREATE POLICY "admin_profiles_select" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_daily_stats_select" ON public.daily_stats FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_words_select" ON public.words FOR SELECT USING (has_role(auth.uid(), 'admin'));
