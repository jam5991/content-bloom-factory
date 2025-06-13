import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrandAsset {
  id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
}

interface PlatformTemplate {
  width: number;
  height: number;
  textArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  logoArea: {
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
  };
}

const PLATFORM_TEMPLATES: Record<string, PlatformTemplate> = {
  instagram: {
    width: 1080,
    height: 1080,
    textArea: { x: 80, y: 200, width: 920, height: 600 },
    logoArea: { x: 40, y: 40, maxWidth: 200, maxHeight: 100 }
  },
  facebook: {
    width: 1200,
    height: 630,
    textArea: { x: 100, y: 150, width: 1000, height: 330 },
    logoArea: { x: 50, y: 50, maxWidth: 250, maxHeight: 80 }
  },
  linkedin: {
    width: 1200,
    height: 627,
    textArea: { x: 100, y: 150, width: 1000, height: 327 },
    logoArea: { x: 50, y: 50, maxWidth: 250, maxHeight: 80 }
  },
  twitter: {
    width: 1200,
    height: 675,
    textArea: { x: 100, y: 150, width: 1000, height: 375 },
    logoArea: { x: 50, y: 50, maxWidth: 250, maxHeight: 80 }
  }
};

async function generateBaseImage(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: prompt,
      size: '1024x1024',
      quality: 'high',
      output_format: 'png'
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].b64_json;
}

function createBrandedImageSVG(
  baseImageB64: string,
  text: string,
  brandAsset: BrandAsset,
  platform: string
): string {
  const template = PLATFORM_TEMPLATES[platform] || PLATFORM_TEMPLATES.instagram;
  
  // Create SVG with branded overlay
  const svg = `
    <svg width="${template.width}" height="${template.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${brandAsset.primary_color};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${brandAsset.accent_color};stop-opacity:0.1" />
        </linearGradient>
      </defs>
      
      <!-- Base AI-generated image -->
      <image 
        href="data:image/png;base64,${baseImageB64}" 
        width="${template.width}" 
        height="${template.height}"
        preserveAspectRatio="xMidYMid slice"
      />
      
      <!-- Brand overlay -->
      <rect width="100%" height="100%" fill="url(#brandGradient)" />
      
      <!-- Text area with brand colors -->
      <rect 
        x="${template.textArea.x}" 
        y="${template.textArea.y}" 
        width="${template.textArea.width}" 
        height="${template.textArea.height}" 
        fill="${brandAsset.secondary_color}" 
        fill-opacity="0.9" 
        rx="20" 
      />
      
      <!-- Main text -->
      <foreignObject 
        x="${template.textArea.x + 40}" 
        y="${template.textArea.y + 40}" 
        width="${template.textArea.width - 80}" 
        height="${template.textArea.height - 80}"
      >
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: ${brandAsset.font_family}, Arial, sans-serif;
          font-size: ${platform === 'twitter' ? '32px' : '42px'};
          font-weight: bold;
          color: ${brandAsset.primary_color};
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          line-height: 1.4;
          word-wrap: break-word;
        ">
          ${text}
        </div>
      </foreignObject>
      
      ${brandAsset.logo_url ? `
      <!-- Logo -->
      <image 
        href="${brandAsset.logo_url}" 
        x="${template.logoArea.x}" 
        y="${template.logoArea.y}" 
        width="${template.logoArea.maxWidth}" 
        height="${template.logoArea.maxHeight}"
        preserveAspectRatio="xMidYMid meet"
      />
      ` : ''}
      
      <!-- Brand accent line -->
      <rect 
        x="0" 
        y="${template.height - 10}" 
        width="100%" 
        height="10" 
        fill="${brandAsset.accent_color}" 
      />
    </svg>
  `;
  
  return svg;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, description, platforms, userId, brandAssetId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user's brand asset
    const { data: brandAsset, error: brandError } = await supabase
      .from('brand_assets')
      .select('*')
      .eq('id', brandAssetId || '')
      .eq('user_id', userId)
      .single();

    if (brandError && brandAssetId) {
      throw new Error('Brand asset not found');
    }

    // Use default brand if none specified
    const activeBrand: BrandAsset = brandAsset || {
      id: 'default',
      primary_color: '#000000',
      secondary_color: '#ffffff',
      accent_color: '#0066cc',
      font_family: 'Arial'
    };

    // Generate base image with AI
    const imagePrompt = `Create a professional background image for social media about: ${topic}. ${description || ''}. Style: modern, clean, suitable for branding overlay.`;
    const baseImageB64 = await generateBaseImage(imagePrompt);

    const brandedContent = [];

    // Create branded version for each platform
    for (const platform of platforms) {
      const platformText = `${topic}${description ? '\n\n' + description : ''}`;
      
      const brandedSVG = createBrandedImageSVG(
        baseImageB64,
        platformText,
        activeBrand,
        platform.toLowerCase()
      );

      // Convert SVG to base64 for easy handling
      const svgB64 = btoa(brandedSVG);

      brandedContent.push({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        imageData: `data:image/svg+xml;base64,${svgB64}`,
        dimensions: PLATFORM_TEMPLATES[platform.toLowerCase()] || PLATFORM_TEMPLATES.instagram
      });
    }

    return new Response(
      JSON.stringify({ 
        brandedContent,
        brandAsset: activeBrand
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating branded content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});