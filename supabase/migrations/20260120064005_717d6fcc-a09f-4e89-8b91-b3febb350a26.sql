-- Audio Dictations table for admin to create dictations
CREATE TABLE public.audio_dictations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  language TEXT NOT NULL DEFAULT 'en',
  audio_text TEXT NOT NULL, -- Original text that should be typed
  audio_url TEXT, -- Optional audio file URL
  duration_seconds INTEGER,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User dictation attempts/submissions
CREATE TABLE public.dictation_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dictation_id UUID NOT NULL REFERENCES public.audio_dictations(id) ON DELETE CASCADE,
  submitted_text TEXT NOT NULL,
  accuracy_percentage DECIMAL(5,2),
  errors_count INTEGER DEFAULT 0,
  ai_feedback TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Books for reading
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  cover_image_url TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  level TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  total_chapters INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Book chapters
CREATE TABLE public.book_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User reading progress
CREATE TABLE public.reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  completed_chapters INTEGER[] DEFAULT '{}',
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.audio_dictations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio_dictations
CREATE POLICY "Anyone can view active dictations" 
ON public.audio_dictations FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage dictations" 
ON public.audio_dictations FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for dictation_submissions
CREATE POLICY "Users can view own submissions" 
ON public.dictation_submissions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit dictations" 
ON public.dictation_submissions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions" 
ON public.dictation_submissions FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for books
CREATE POLICY "Anyone can view active books" 
ON public.books FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage books" 
ON public.books FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for book_chapters
CREATE POLICY "Anyone can view chapters of active books" 
ON public.book_chapters FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.books b 
  WHERE b.id = book_chapters.book_id 
  AND (b.is_active = true OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Admins can manage chapters" 
ON public.book_chapters FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for reading_progress
CREATE POLICY "Users can view own reading progress" 
ON public.reading_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reading progress" 
ON public.reading_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress" 
ON public.reading_progress FOR UPDATE 
USING (auth.uid() = user_id);