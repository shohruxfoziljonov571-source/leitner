-- Add mnemonic_hint field to words table for user associations
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS mnemonic_hint TEXT;

-- Create memory palaces table
CREATE TABLE public.memory_palaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rooms_count INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms within palaces
CREATE TABLE public.palace_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  palace_id UUID NOT NULL REFERENCES public.memory_palaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link words to rooms (placements)
CREATE TABLE public.room_word_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.palace_rooms(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  visual_note TEXT, -- User's visualization description
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, word_id)
);

-- Create word stories table for story method
CREATE TABLE public.word_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  story_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link words to stories
CREATE TABLE public.story_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.word_stories(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, word_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.memory_palaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palace_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_word_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_words ENABLE ROW LEVEL SECURITY;

-- Memory Palaces policies
CREATE POLICY "Users can view their own palaces" ON public.memory_palaces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own palaces" ON public.memory_palaces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own palaces" ON public.memory_palaces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own palaces" ON public.memory_palaces FOR DELETE USING (auth.uid() = user_id);

-- Palace Rooms policies (through palace ownership)
CREATE POLICY "Users can view rooms in their palaces" ON public.palace_rooms FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.memory_palaces WHERE id = palace_rooms.palace_id AND user_id = auth.uid()));
CREATE POLICY "Users can create rooms in their palaces" ON public.palace_rooms FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.memory_palaces WHERE id = palace_rooms.palace_id AND user_id = auth.uid()));
CREATE POLICY "Users can update rooms in their palaces" ON public.palace_rooms FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.memory_palaces WHERE id = palace_rooms.palace_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete rooms in their palaces" ON public.palace_rooms FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.memory_palaces WHERE id = palace_rooms.palace_id AND user_id = auth.uid()));

-- Room Word Placements policies
CREATE POLICY "Users can view their word placements" ON public.room_word_placements FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.palace_rooms pr 
    JOIN public.memory_palaces mp ON mp.id = pr.palace_id 
    WHERE pr.id = room_word_placements.room_id AND mp.user_id = auth.uid()
  ));
CREATE POLICY "Users can create word placements" ON public.room_word_placements FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.palace_rooms pr 
    JOIN public.memory_palaces mp ON mp.id = pr.palace_id 
    WHERE pr.id = room_word_placements.room_id AND mp.user_id = auth.uid()
  ));
CREATE POLICY "Users can update word placements" ON public.room_word_placements FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.palace_rooms pr 
    JOIN public.memory_palaces mp ON mp.id = pr.palace_id 
    WHERE pr.id = room_word_placements.room_id AND mp.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete word placements" ON public.room_word_placements FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.palace_rooms pr 
    JOIN public.memory_palaces mp ON mp.id = pr.palace_id 
    WHERE pr.id = room_word_placements.room_id AND mp.user_id = auth.uid()
  ));

-- Word Stories policies
CREATE POLICY "Users can view their own stories" ON public.word_stories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own stories" ON public.word_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stories" ON public.word_stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stories" ON public.word_stories FOR DELETE USING (auth.uid() = user_id);

-- Story Words policies
CREATE POLICY "Users can view words in their stories" ON public.story_words FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.word_stories WHERE id = story_words.story_id AND user_id = auth.uid()));
CREATE POLICY "Users can add words to their stories" ON public.story_words FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.word_stories WHERE id = story_words.story_id AND user_id = auth.uid()));
CREATE POLICY "Users can update words in their stories" ON public.story_words FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.word_stories WHERE id = story_words.story_id AND user_id = auth.uid()));
CREATE POLICY "Users can remove words from their stories" ON public.story_words FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.word_stories WHERE id = story_words.story_id AND user_id = auth.uid()));