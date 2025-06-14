-- ============================================================================
-- DATABASE DESIGN AUDIT FIXES
-- ============================================================================

-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Link brand_color_corrections to brand_assets
ALTER TABLE public.brand_color_corrections 
ADD CONSTRAINT fk_brand_color_corrections_brand_asset 
FOREIGN KEY (brand_asset_id) REFERENCES public.brand_assets(id) ON DELETE CASCADE;

-- Link content_approvals to content_generations
ALTER TABLE public.content_approvals 
ADD CONSTRAINT fk_content_approvals_content_generation 
FOREIGN KEY (content_generation_id) REFERENCES public.content_generations(id) ON DELETE CASCADE;

-- Link content_generation_media to content_generations
ALTER TABLE public.content_generation_media 
ADD CONSTRAINT fk_content_generation_media_content_generation 
FOREIGN KEY (content_generation_id) REFERENCES public.content_generations(id) ON DELETE CASCADE;

-- Link content_generation_media to media_files
ALTER TABLE public.content_generation_media 
ADD CONSTRAINT fk_content_generation_media_media_file 
FOREIGN KEY (media_file_id) REFERENCES public.media_files(id) ON DELETE CASCADE;

-- Link content_generations to social_media_accounts
ALTER TABLE public.content_generations 
ADD CONSTRAINT fk_content_generations_social_media_account 
FOREIGN KEY (social_media_account_id) REFERENCES public.social_media_accounts(id) ON DELETE CASCADE;

-- Link content_generations to chat_sessions
ALTER TABLE public.content_generations 
ADD CONSTRAINT fk_content_generations_chat_session 
FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE SET NULL;

-- Link chat_sessions to social_media_accounts
ALTER TABLE public.chat_sessions 
ADD CONSTRAINT fk_chat_sessions_social_media_account 
FOREIGN KEY (social_media_account_id) REFERENCES public.social_media_accounts(id) ON DELETE CASCADE;

-- Link chat_messages to chat_sessions
ALTER TABLE public.chat_messages 
ADD CONSTRAINT fk_chat_messages_chat_session 
FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

-- Link media_files to campaigns (optional relationship)
ALTER TABLE public.media_files 
ADD CONSTRAINT fk_media_files_campaign 
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Link profiles to auth.users (proper user profile setup)
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_auth_users 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_brand_color_corrections_brand_asset_id ON public.brand_color_corrections(brand_asset_id);
CREATE INDEX IF NOT EXISTS idx_content_approvals_content_generation_id ON public.content_approvals(content_generation_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_media_content_generation_id ON public.content_generation_media(content_generation_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_media_media_file_id ON public.content_generation_media(media_file_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_social_media_account_id ON public.content_generations(social_media_account_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_session_id ON public.content_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_social_media_account_id ON public.chat_sessions(social_media_account_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_media_files_campaign_id ON public.media_files(campaign_id);

-- Indexes for user_id columns (performance for RLS)
CREATE INDEX IF NOT EXISTS idx_brand_assets_user_id ON public.brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_color_corrections_user_id ON public.brand_color_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_extraction_history_user_id ON public.brand_extraction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_approvals_user_id ON public.content_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_user_id ON public.content_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON public.media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_knowledge_base_user_id ON public.rag_knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_user_id ON public.social_media_accounts(user_id);

-- 3. ADD MISSING RLS POLICIES
-- ============================================================================

-- Complete RLS policies for brand_color_corrections
CREATE POLICY "Users can update their own color corrections" 
ON public.brand_color_corrections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own color corrections" 
ON public.brand_color_corrections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Complete RLS policies for brand_extraction_history
CREATE POLICY "Users can update their own extraction history" 
ON public.brand_extraction_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extraction history" 
ON public.brand_extraction_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Complete RLS policies for content_approvals
CREATE POLICY "Users can delete their own content approvals" 
ON public.content_approvals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Complete RLS policies for content_generation_media
CREATE POLICY "Users can update their own content media links" 
ON public.content_generation_media 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM content_generations 
  WHERE content_generations.id = content_generation_media.content_generation_id 
  AND content_generations.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own content media links" 
ON public.content_generation_media 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM content_generations 
  WHERE content_generations.id = content_generation_media.content_generation_id 
  AND content_generations.user_id = auth.uid()
));

-- Complete RLS policies for rag_knowledge_base
CREATE POLICY "Users can delete their own RAG knowledge" 
ON public.rag_knowledge_base 
FOR DELETE 
USING (auth.uid() = user_id);

-- Complete RLS policies for chat_messages
CREATE POLICY "Users can update messages in their sessions" 
ON public.chat_messages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM chat_sessions 
  WHERE chat_sessions.id = chat_messages.session_id 
  AND chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages in their sessions" 
ON public.chat_messages 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM chat_sessions 
  WHERE chat_sessions.id = chat_messages.session_id 
  AND chat_sessions.user_id = auth.uid()
));

-- Complete RLS policies for profiles
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

-- 4. ADD DOMAIN EXTRACTION PATTERNS POLICIES (currently missing)
-- ============================================================================

CREATE POLICY "Users can insert domain patterns" 
ON public.domain_extraction_patterns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update domain patterns" 
ON public.domain_extraction_patterns 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete domain patterns" 
ON public.domain_extraction_patterns 
FOR DELETE 
USING (true);

-- 5. ADD MISSING TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Update triggers for tables missing them
CREATE TRIGGER update_brand_color_corrections_updated_at
BEFORE UPDATE ON public.brand_color_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_approvals_updated_at
BEFORE UPDATE ON public.content_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_generation_media_updated_at
BEFORE UPDATE ON public.content_generation_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. DATA CONSISTENCY CHECKS AND CONSTRAINTS
-- ============================================================================

-- Ensure user_id columns are not nullable for RLS security
ALTER TABLE public.brand_assets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.brand_color_corrections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.brand_extraction_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.chat_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.content_approvals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.content_generations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.media_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.rag_knowledge_base ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.social_media_accounts ALTER COLUMN user_id SET NOT NULL;