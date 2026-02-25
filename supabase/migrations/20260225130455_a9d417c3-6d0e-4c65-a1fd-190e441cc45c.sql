
-- Add index on words.user_id + user_language_id for faster queries
CREATE INDEX IF NOT EXISTS idx_words_user_language ON public.words (user_id, user_language_id);

-- Add index on words for review queries
CREATE INDEX IF NOT EXISTS idx_words_next_review ON public.words (user_id, user_language_id, next_review_time);

-- Add unique constraint on daily_stats for ON CONFLICT to work properly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_stats_user_language_date_unique'
  ) THEN
    ALTER TABLE public.daily_stats ADD CONSTRAINT daily_stats_user_language_date_unique 
      UNIQUE (user_id, user_language_id, date);
  END IF;
END $$;

-- Add index on profiles.telegram_chat_id for telegram auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles (telegram_chat_id);
