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
    textArea: { x: 80, y: 300, width: 920, height: 480 },
    logoArea: { x: 60, y: 60, maxWidth: 180, maxHeight: 80 }
  },
  facebook: {
    width: 1200,
    height: 630,
    textArea: { x: 100, y: 180, width: 1000, height: 270 },
    logoArea: { x: 60, y: 60, maxWidth: 200, maxHeight: 70 }
  },
  linkedin: {
    width: 1200,
    height: 627,
    textArea: { x: 100, y: 180, width: 1000, height: 267 },
    logoArea: { x: 60, y: 60, maxWidth: 200, maxHeight: 70 }
  },
  twitter: {
    width: 1200,
    height: 675,
    textArea: { x: 100, y: 200, width: 1000, height: 275 },
    logoArea: { x: 60, y: 60, maxWidth: 180, maxHeight: 70 }
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

function getOptimalTextLayout(text: string, template: PlatformTemplate, platform: string) {
  const wordCount = text.split(' ').length;
  const charCount = text.length;
  
  // Intelligent font sizing based on content length and platform
  let fontSize = 42;
  let lineHeight = 1.4;
  
  if (platform === 'twitter') {
    fontSize = Math.max(28, Math.min(36, 500 / charCount * 8));
  } else if (platform === 'instagram') {
    fontSize = Math.max(32, Math.min(48, 800 / charCount * 10));
  } else {
    fontSize = Math.max(28, Math.min(42, 600 / charCount * 9));
  }
  
  // Adjust line height for readability
  if (fontSize < 32) lineHeight = 1.5;
  if (fontSize > 40) lineHeight = 1.3;
  
  // Calculate optimal text area based on content
  const padding = template.textArea.width * 0.08;
  const availableWidth = template.textArea.width - (padding * 2);
  const availableHeight = template.textArea.height - (padding * 2);
  
  return {
    fontSize,
    lineHeight,
    padding,
    availableWidth,
    availableHeight,
    textAlign: wordCount < 6 ? 'center' : 'left'
  };
}

function createBrandedImageSVG(
  baseImageB64: string,
  text: string,
  brandAsset: BrandAsset,
  platform: string
): string {
  const template = PLATFORM_TEMPLATES[platform] || PLATFORM_TEMPLATES.instagram;
  const layout = getOptimalTextLayout(text, template, platform);
  
  // Enhanced gradient for better visual appeal
  const gradientStops = `
    <stop offset="0%" style="stop-color:${brandAsset.primary_color};stop-opacity:0.15" />
    <stop offset="50%" style="stop-color:${brandAsset.accent_color};stop-opacity:0.08" />
    <stop offset="100%" style="stop-color:${brandAsset.secondary_color};stop-opacity:0.12" />
  `;
  
  // Smart logo positioning based on platform
  const logoPosition = platform === 'twitter' ? 
    { x: template.width - template.logoArea.maxWidth - 40, y: 40 } :
    { x: template.logoArea.x, y: template.logoArea.y };
  
  // Create SVG with enhanced branding
  const svg = `
    <svg width="${template.width}" height="${template.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          ${gradientStops}
        </linearGradient>
        <linearGradient id="textBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${brandAsset.secondary_color};stop-opacity:0.95" />
          <stop offset="100%" style="stop-color:${brandAsset.secondary_color};stop-opacity:0.85" />
        </linearGradient>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
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
      
      <!-- Enhanced text background with rounded corners and shadow -->
      <rect 
        x="${template.textArea.x}" 
        y="${template.textArea.y}" 
        width="${template.textArea.width}" 
        height="${template.textArea.height}" 
        fill="url(#textBg)" 
        rx="20" 
        ry="20"
        filter="url(#textShadow)"
      />
      
      <!-- Border accent -->
      <rect 
        x="${template.textArea.x}" 
        y="${template.textArea.y}" 
        width="${template.textArea.width}" 
        height="${template.textArea.height}" 
        fill="none" 
        stroke="${brandAsset.accent_color}" 
        stroke-width="2" 
        rx="20" 
        ry="20"
        opacity="0.6"
      />
      
      <!-- Main text with enhanced styling -->
      <foreignObject 
        x="${template.textArea.x + layout.padding}" 
        y="${template.textArea.y + layout.padding}" 
        width="${layout.availableWidth}" 
        height="${layout.availableHeight}"
      >
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: ${brandAsset.font_family}, Arial, sans-serif;
          font-size: ${layout.fontSize}px;
          font-weight: bold;
          color: ${brandAsset.primary_color};
          text-align: ${layout.textAlign};
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          line-height: ${layout.lineHeight};
          word-wrap: break-word;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
          padding: 10px;
        ">
          ${text}
        </div>
      </foreignObject>
      
      ${brandAsset.logo_url ? `
      <!-- Enhanced logo with background circle -->
      <circle 
        cx="${logoPosition.x + template.logoArea.maxWidth/2}" 
        cy="${logoPosition.y + template.logoArea.maxHeight/2}" 
        r="${Math.min(template.logoArea.maxWidth, template.logoArea.maxHeight)/2 + 10}" 
        fill="${brandAsset.secondary_color}" 
        opacity="0.9"
        filter="url(#textShadow)"
      />
      <image 
        href="${brandAsset.logo_url}" 
        x="${logoPosition.x}" 
        y="${logoPosition.y}" 
        width="${template.logoArea.maxWidth}" 
        height="${template.logoArea.maxHeight}"
        preserveAspectRatio="xMidYMid meet"
      />
      ` : ''}
      
      <!-- Platform-specific accent elements -->
      <rect 
        x="0" 
        y="${template.height - 8}" 
        width="100%" 
        height="8" 
        fill="${brandAsset.accent_color}" 
      />
      ${platform === 'instagram' ? `
      <rect 
        x="0" 
        y="0" 
        width="8" 
        height="100%" 
        fill="${brandAsset.accent_color}" 
      />
      ` : ''}
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