-- Create storage bucket for content media
INSERT INTO storage.buckets (id, name, public) VALUES ('content-media', 'content-media', false);

-- Create storage policies for content media
CREATE POLICY "Users can view their own media files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own media files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'content-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'content-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'content-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create media files table to track uploaded files
CREATE TABLE public.media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on media_files
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_files
CREATE POLICY "Users can view their own media files" 
ON public.media_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own media files" 
ON public.media_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media files" 
ON public.media_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media files" 
ON public.media_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create junction table for content generations and media files
CREATE TABLE public.content_generation_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_generation_id UUID NOT NULL REFERENCES public.content_generations(id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_generation_id, media_file_id)
);

-- Enable RLS on content_generation_media
ALTER TABLE public.content_generation_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_generation_media
CREATE POLICY "Users can view their own content media links" 
ON public.content_generation_media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.content_generations 
    WHERE id = content_generation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own content media links" 
ON public.content_generation_media 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.content_generations 
    WHERE id = content_generation_id AND user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_media_files_user_id ON public.media_files(user_id);
CREATE INDEX idx_content_generation_media_content_id ON public.content_generation_media(content_generation_id);
CREATE INDEX idx_content_generation_media_media_id ON public.content_generation_media(media_file_id);

-- Create trigger for automatic timestamp updates on media_files
CREATE TRIGGER update_media_files_updated_at
    BEFORE UPDATE ON public.media_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();