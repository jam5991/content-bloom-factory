-- Add new columns to brand_assets table for enhanced brand extraction
ALTER TABLE public.brand_assets 
ADD COLUMN personality JSONB,
ADD COLUMN confidence_scores JSONB;

-- Add comments to document the structure of these JSON fields
COMMENT ON COLUMN public.brand_assets.personality IS 'Brand personality assessment with fields: primary_trait, secondary_traits, industry_context, design_approach';
COMMENT ON COLUMN public.brand_assets.confidence_scores IS 'Confidence scores for extracted elements: name, colors, typography, logo, personality, overall';