-- Drop old check constraints that only allowed limited languages
ALTER TABLE public.user_languages DROP CONSTRAINT IF EXISTS user_languages_source_language_check;
ALTER TABLE public.user_languages DROP CONSTRAINT IF EXISTS user_languages_target_language_check;

-- Add new check constraints with all 15 supported languages
ALTER TABLE public.user_languages ADD CONSTRAINT user_languages_source_language_check 
  CHECK (source_language IN ('uz', 'ru', 'en', 'de', 'fr', 'es', 'ar', 'ko', 'ja', 'zh', 'tr', 'it', 'pt', 'hi', 'fa'));

ALTER TABLE public.user_languages ADD CONSTRAINT user_languages_target_language_check 
  CHECK (target_language IN ('uz', 'ru', 'en', 'de', 'fr', 'es', 'ar', 'ko', 'ja', 'zh', 'tr', 'it', 'pt', 'hi', 'fa'));

-- Also update words table check constraints for consistency
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_source_language_check;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_target_language_check;

ALTER TABLE public.words ADD CONSTRAINT words_source_language_check 
  CHECK (source_language IN ('uz', 'ru', 'en', 'de', 'fr', 'es', 'ar', 'ko', 'ja', 'zh', 'tr', 'it', 'pt', 'hi', 'fa'));

ALTER TABLE public.words ADD CONSTRAINT words_target_language_check 
  CHECK (target_language IN ('uz', 'ru', 'en', 'de', 'fr', 'es', 'ar', 'ko', 'ja', 'zh', 'tr', 'it', 'pt', 'hi', 'fa'));