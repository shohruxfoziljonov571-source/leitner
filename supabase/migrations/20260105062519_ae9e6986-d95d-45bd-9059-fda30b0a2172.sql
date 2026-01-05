-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferred_language TEXT DEFAULT 'uz' CHECK (preferred_language IN ('uz', 'ru', 'en')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_languages table for tracking which languages user is learning
CREATE TABLE public.user_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL CHECK (source_language IN ('uz', 'ru', 'en')),
  target_language TEXT NOT NULL CHECK (target_language IN ('uz', 'ru', 'en')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_language, target_language)
);

-- Create words table for storing vocabulary
CREATE TABLE public.words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_language_id UUID NOT NULL REFERENCES public.user_languages(id) ON DELETE CASCADE,
  original_word TEXT NOT NULL,
  translated_word TEXT NOT NULL,
  source_language TEXT NOT NULL CHECK (source_language IN ('uz', 'ru', 'en')),
  target_language TEXT NOT NULL CHECK (target_language IN ('uz', 'ru', 'en')),
  example_sentences TEXT[] DEFAULT '{}',
  box_number INTEGER NOT NULL DEFAULT 1 CHECK (box_number BETWEEN 1 AND 5),
  next_review_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  times_reviewed INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  times_incorrect INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reviewed TIMESTAMP WITH TIME ZONE
);

-- Create user_stats table for tracking progress per language
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_language_id UUID NOT NULL REFERENCES public.user_languages(id) ON DELETE CASCADE,
  total_words INTEGER NOT NULL DEFAULT 0,
  learned_words INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  today_reviewed INTEGER NOT NULL DEFAULT 0,
  today_correct INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, user_language_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- User languages policies
CREATE POLICY "Users can view their own languages"
  ON public.user_languages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add languages"
  ON public.user_languages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their languages"
  ON public.user_languages FOR DELETE
  USING (auth.uid() = user_id);

-- Words policies
CREATE POLICY "Users can view their own words"
  ON public.words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add words"
  ON public.words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own words"
  ON public.words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own words"
  ON public.words FOR DELETE
  USING (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view their own stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles timestamp
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();