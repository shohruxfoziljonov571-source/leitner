-- Create storage buckets for dictation audio files and book PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('dictation-audio', 'dictation-audio', true),
  ('book-pdfs', 'book-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for dictation-audio bucket
-- Anyone can view audio files
CREATE POLICY "Public can view dictation audio"
ON storage.objects
FOR SELECT
USING (bucket_id = 'dictation-audio');

-- Only authenticated admins can upload/update/delete
CREATE POLICY "Admins can upload dictation audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'dictation-audio' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update dictation audio"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'dictation-audio' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete dictation audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'dictation-audio' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- RLS policies for book-pdfs bucket
-- Anyone can view PDFs
CREATE POLICY "Public can view book PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-pdfs');

-- Only authenticated admins can upload/update/delete
CREATE POLICY "Admins can upload book PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'book-pdfs' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update book PDFs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'book-pdfs' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete book PDFs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'book-pdfs' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add pdf_url column to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_pdf_book BOOLEAN DEFAULT false;