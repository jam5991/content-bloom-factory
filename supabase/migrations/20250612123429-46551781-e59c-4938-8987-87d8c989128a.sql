-- Create tables for chat history and RAG-powered agentic system

-- Social media platforms enum
CREATE TYPE public.social_platform AS ENUM (
  'instagram',
  'facebook', 
  'linkedin',
  'twitter',
  'tiktok',
  'youtube'
);

-- Content tone enum
CREATE TYPE public.content_tone AS ENUM (
  'professional',
  'casual',
  'friendly',
  'authoritative',
  'humorous',
  'inspirational'
);

-- Content status enum
CREATE TYPE public.content_status AS ENUM (
  'generated',
  'approved',
  'rejected',
  'modified',
  'published'
);

-- Social media apps/accounts table
CREATE TABLE public.social_media_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  account_name TEXT NOT NULL,
  account_handle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, account_name)
);

-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  social_media_account_id UUID NOT NULL REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  session_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Content generations table
CREATE TABLE public.content_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  social_media_account_id UUID NOT NULL REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  description TEXT,
  tone content_tone,
  audience TEXT,
  hashtags TEXT,
  generated_content TEXT NOT NULL,
  status content_status NOT NULL DEFAULT 'generated',
  user_feedback TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Content approvals tracking table
CREATE TABLE public.content_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_generation_id UUID NOT NULL REFERENCES public.content_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved BOOLEAN NOT NULL,
  feedback TEXT,
  modified_content TEXT,
  approval_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_generation_id, user_id)
);

-- Knowledge base for RAG (stores successful patterns)
CREATE TABLE public.rag_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  content_type TEXT NOT NULL,
  successful_pattern TEXT NOT NULL,
  context_metadata JSONB NOT NULL DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 1,
  success_rate FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_media_accounts
CREATE POLICY "Users can view their own social media accounts" 
ON public.social_media_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social media accounts" 
ON public.social_media_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social media accounts" 
ON public.social_media_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social media accounts" 
ON public.social_media_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" 
ON public.chat_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from their sessions" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their sessions" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  )
);

-- RLS Policies for content_generations
CREATE POLICY "Users can view their own content generations" 
ON public.content_generations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content generations" 
ON public.content_generations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content generations" 
ON public.content_generations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content generations" 
ON public.content_generations 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for content_approvals
CREATE POLICY "Users can view their own content approvals" 
ON public.content_approvals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content approvals" 
ON public.content_approvals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content approvals" 
ON public.content_approvals 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for rag_knowledge_base
CREATE POLICY "Users can view their own RAG knowledge" 
ON public.rag_knowledge_base 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own RAG knowledge" 
ON public.rag_knowledge_base 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RAG knowledge" 
ON public.rag_knowledge_base 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_social_media_accounts_user_platform ON public.social_media_accounts(user_id, platform);
CREATE INDEX idx_chat_sessions_user_account ON public.chat_sessions(user_id, social_media_account_id);
CREATE INDEX idx_chat_messages_session_created ON public.chat_messages(session_id, created_at);
CREATE INDEX idx_content_generations_user_status ON public.content_generations(user_id, status);
CREATE INDEX idx_content_generations_platform_tone ON public.content_generations(social_media_account_id, tone);
CREATE INDEX idx_content_approvals_approved ON public.content_approvals(approved, approval_date);
CREATE INDEX idx_rag_knowledge_platform_type ON public.rag_knowledge_base(platform, content_type);
CREATE INDEX idx_rag_knowledge_success_rate ON public.rag_knowledge_base(success_rate DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_social_media_accounts_updated_at
    BEFORE UPDATE ON public.social_media_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_generations_updated_at
    BEFORE UPDATE ON public.content_generations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rag_knowledge_base_updated_at
    BEFORE UPDATE ON public.rag_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();