-- Clean up duplicate quiz sessions (keep most recent per chat_id)
DELETE FROM public.quiz_sessions a
USING public.quiz_sessions b
WHERE a.telegram_chat_id = b.telegram_chat_id
  AND a.id <> b.id
  AND a.last_activity < b.last_activity;

-- Add unique constraint on telegram_chat_id for upsert support
ALTER TABLE public.quiz_sessions ADD CONSTRAINT quiz_sessions_chat_id_unique UNIQUE (telegram_chat_id);