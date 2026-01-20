-- Create contest-images bucket for contest banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-images', 'contest-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view contest images (public bucket)
CREATE POLICY "Contest images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'contest-images');

-- Allow admins to upload contest images
CREATE POLICY "Admins can upload contest images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contest-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update contest images
CREATE POLICY "Admins can update contest images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contest-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete contest images
CREATE POLICY "Admins can delete contest images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contest-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add unique constraint to contest_participants for upsert
ALTER TABLE contest_participants 
ADD CONSTRAINT contest_participants_contest_user_unique 
UNIQUE (contest_id, user_id);

-- Create quiz_sessions table to track bot quiz state
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id bigint NOT NULL,
  user_id uuid NOT NULL,
  user_language_id uuid NOT NULL,
  current_word_id uuid,
  words_reviewed integer DEFAULT 0,
  words_correct integer DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage quiz sessions (service role)
CREATE POLICY "Service can manage quiz sessions"
ON public.quiz_sessions FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_quiz_sessions_chat_id ON public.quiz_sessions (telegram_chat_id);
CREATE INDEX idx_quiz_sessions_active ON public.quiz_sessions (is_active, telegram_chat_id);