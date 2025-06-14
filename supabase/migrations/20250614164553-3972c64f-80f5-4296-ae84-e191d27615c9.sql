-- Create table for storing successful brand extractions for learning
CREATE TABLE public.brand_extraction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  website_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  manual_corrections JSONB,
  confidence_scores JSONB NOT NULL,
  extraction_method TEXT NOT NULL,
  success_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for domain-specific extraction patterns
CREATE TABLE public.domain_extraction_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_pattern TEXT NOT NULL,
  extraction_rules JSONB NOT NULL,
  success_rate DECIMAL(5,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for manual color corrections
CREATE TABLE public.brand_color_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_asset_id UUID REFERENCES public.brand_assets(id) ON DELETE CASCADE,
  original_colors JSONB NOT NULL,
  corrected_colors JSONB NOT NULL,
  correction_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_extraction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_extraction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_color_corrections ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_extraction_history
CREATE POLICY "Users can view their own extraction history" 
ON public.brand_extraction_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own extraction history" 
ON public.brand_extraction_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for domain_extraction_patterns (read-only for users)
CREATE POLICY "Users can view domain patterns" 
ON public.domain_extraction_patterns 
FOR SELECT 
USING (true);

-- Create policies for brand_color_corrections
CREATE POLICY "Users can view their own color corrections" 
ON public.brand_color_corrections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own color corrections" 
ON public.brand_color_corrections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_brand_extraction_history_updated_at
BEFORE UPDATE ON public.brand_extraction_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_domain_extraction_patterns_updated_at
BEFORE UPDATE ON public.domain_extraction_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_brand_extraction_history_domain ON public.brand_extraction_history(domain);
CREATE INDEX idx_brand_extraction_history_user_id ON public.brand_extraction_history(user_id);
CREATE INDEX idx_domain_extraction_patterns_domain ON public.domain_extraction_patterns(domain_pattern);
CREATE INDEX idx_brand_color_corrections_brand_asset ON public.brand_color_corrections(brand_asset_id);