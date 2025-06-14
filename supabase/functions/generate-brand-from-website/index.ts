import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ExtractedBrandInfo {
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  logo_url?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// COLOR EXTRACTION UTILITIES
// ============================================================================

async function extractColorsFromCSS(css: string, html: string): Promise<{ primary: string; secondary: string; accent: string }> {
  // Extract hex colors from CSS and HTML
  const hexColors = [...(css.match(/#[0-9a-fA-F]{6}/g) || []), ...(html.match(/#[0-9a-fA-F]{6}/g) || [])];
  const rgbColors = [...(css.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || []), ...(html.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [])];
  
  // Extract CSS custom properties and color keywords
  const cssVariables = css.match(/--[a-zA-Z0-9-]*:\s*#[0-9a-fA-F]{6}/g) || [];
  const variableColors = cssVariables.map(v => v.match(/#[0-9a-fA-F]{6}/)?.[0]).filter(Boolean);
  
  // Convert RGB to hex
  const convertedColors = rgbColors.map(rgb => {
    const values = rgb.match(/\d+/g);
    if (values && values.length === 3) {
      const r = parseInt(values[0]).toString(16).padStart(2, '0');
      const g = parseInt(values[1]).toString(16).padStart(2, '0');
      const b = parseInt(values[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#000000';
  });
  
  // Extract brand color patterns from styles
  const brandColorPatterns = [
    /background-color:\s*(#[0-9a-fA-F]{6})/g,
    /color:\s*(#[0-9a-fA-F]{6})/g,
    /fill=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/g
  ];
  
  const patternColors: string[] = [];
  brandColorPatterns.forEach(pattern => {
    const matches = [...css.matchAll(pattern), ...html.matchAll(pattern)];
    matches.forEach(match => {
      const color = match[1]?.match(/#[0-9a-fA-F]{6}/)?.[0];
      if (color) patternColors.push(color);
    });
  });
  
  const allColors = [...new Set([...hexColors, ...convertedColors, ...variableColors, ...patternColors])];
  
  // Filter out common colors and grays
  const filteredColors = allColors.filter(color => {
    const cleanColor = color.toUpperCase();
    if (cleanColor === '#000000' || cleanColor === '#FFFFFF') return false;
    
    // Remove grays (where all RGB components are similar)
    const r = parseInt(cleanColor.slice(1, 3), 16);
    const g = parseInt(cleanColor.slice(3, 5), 16);
    const b = parseInt(cleanColor.slice(5, 7), 16);
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return maxDiff > 30;
  });
  
  // Sort by frequency for better primary selection
  const colorFreq = new Map();
  allColors.forEach(color => {
    colorFreq.set(color, (colorFreq.get(color) || 0) + 1);
  });
  
  const sortedColors = filteredColors.sort((a, b) => {
    const freqA = colorFreq.get(a) || 0;
    const freqB = colorFreq.get(b) || 0;
    return freqB - freqA;
  });
  
  console.log('Extracted colors:', sortedColors);
  
  return {
    primary: sortedColors[0] || '#e74c3c',
    secondary: sortedColors[1] || '#ffffff',
    accent: sortedColors[2] || '#3498db'
  };
}

// ============================================================================
// FONT EXTRACTION UTILITIES
// ============================================================================

function extractFontsFromCSS(css: string): string {
  const fontFamilyMatches = css.match(/font-family\s*:\s*([^;]+)/gi) || [];
  const fonts = new Set<string>();
  
  fontFamilyMatches.forEach(match => {
    const fontValue = match.split(':')[1]?.trim();
    if (fontValue) {
      const firstFont = fontValue.split(',')[0]?.trim().replace(/['"]/g, '');
      if (firstFont && !firstFont.includes('serif') && !firstFont.includes('sans-serif')) {
        fonts.add(firstFont);
      }
    }
  });
  
  return Array.from(fonts)[0] || 'Arial';
}

// ============================================================================
// BRAND NAME EXTRACTION UTILITIES
// ============================================================================

function extractBrandName(html: string): string {
  // Try to extract from title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    title = title.replace(/\s*-\s*.+$/, '').replace(/\s*\|\s*.+$/, '');
    if (title.length > 0 && title.length < 50) {
      return title;
    }
  }
  
  // Try to extract from h1 tag
  const h1Match = html.match(/<h1[^>]*>([^<]+)</i);
  if (h1Match) {
    const h1Text = h1Match[1].trim();
    if (h1Text.length > 0 && h1Text.length < 50) {
      return h1Text;
    }
  }
  
  // Try to extract from meta title
  const metaTitleMatch = html.match(/<meta[^>]*name=['"]title['"][^>]*content=['"]([^'"]+)['"]/i);
  if (metaTitleMatch) {
    return metaTitleMatch[1].trim();
  }
  
  return 'Brand Name';
}

// ============================================================================
// LOGO EXTRACTION UTILITIES
// ============================================================================

function extractLogoUrl(html: string, baseUrl: string): string | undefined {
  const logoSelectors = [
    /src=['"]([^'"]*logo[^'"]*)['"]/i,
    /src=['"]([^'"]*brand[^'"]*)['"]/i,
    /href=['"]([^'"]*logo[^'"]*)['"]/i,
    /<link[^>]*rel=['"]icon['"][^>]*href=['"]([^'"]+)['"]/i
  ];
  
  for (const selector of logoSelectors) {
    const match = html.match(selector);
    if (match) {
      let logoUrl = match[1];
      // Convert relative URLs to absolute
      if (logoUrl.startsWith('/')) {
        logoUrl = new URL(logoUrl, baseUrl).href;
      } else if (!logoUrl.startsWith('http')) {
        logoUrl = new URL(logoUrl, baseUrl).href;
      }
      return logoUrl;
    }
  }
  
  return undefined;
}

// ============================================================================
// SCREENSHOT GENERATION UTILITIES
// ============================================================================

async function generateFallbackScreenshot(url: string): Promise<string | null> {
  try {
    console.log('Attempting fallback screenshot generation for:', url);
    
    // Use htmlcsstoimage.com API as fallback
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('user-id:api-key'), // Would need proper API keys
      },
      body: JSON.stringify({
        html: `<iframe src="${url}" width="1200" height="800" style="border: none;"></iframe>`,
        css: 'body { margin: 0; }',
        device_scale: 2,
        viewport_width: 1200,
        viewport_height: 800
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Fallback screenshot generated:', data.url);
      return data.url;
    }
  } catch (error) {
    console.error('Fallback screenshot generation failed:', error);
  }

  // Try screenshot.guru as secondary fallback
  try {
    console.log('Trying screenshot.guru as secondary fallback');
    const fallbackUrl = `https://screenshot.guru/api/screenshot?url=${encodeURIComponent(url)}&width=1200&height=800&type=jpeg&quality=85`;
    
    const testResponse = await fetch(fallbackUrl, { method: 'HEAD' });
    if (testResponse.ok) {
      console.log('Secondary fallback screenshot URL:', fallbackUrl);
      return fallbackUrl;
    }
  } catch (error) {
    console.error('Secondary fallback also failed:', error);
  }

  console.log('All screenshot fallbacks failed');
  return null;
}

// ============================================================================
// VISION API EXTRACTION
// ============================================================================

async function extractBrandInfoWithVision(screenshotUrl: string): Promise<ExtractedBrandInfo> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('Screenshot URL for Vision API:', screenshotUrl);

  const enhancedPrompt = `Analyze this website screenshot carefully and extract comprehensive brand information. You are an expert brand analyst with years of experience identifying brand elements from visual designs.

IMPORTANT: Return ONLY a valid JSON object with this exact structure, no additional text:

{
  "name": "The primary brand/company name (clean, no taglines or descriptive text)",
  "primary_color": "The most dominant brand color as 6-digit hex code (e.g., #FF5733)",
  "secondary_color": "A prominent secondary brand color as 6-digit hex code",
  "accent_color": "An accent/highlight color used in the design as 6-digit hex code",
  "font_family": "The primary font family name (e.g., 'Roboto', 'Arial', 'Montserrat')",
  "logo_url": "The URL of the main logo if clearly visible in the image, or null"
}

ANALYSIS GUIDELINES:

1. BRAND NAME:
   - Look for the most prominent brand name in headers, navigation, or logo text
   - Exclude taglines, descriptions, or marketing copy
   - If multiple names appear, choose the primary brand name

2. COLOR EXTRACTION:
   - Primary: The most frequently used brand color (often in logos, headers, main buttons)
   - Secondary: A supporting color that complements the primary (backgrounds, text, secondary elements)
   - Accent: A highlight color used for calls-to-action, links, or emphasis
   - Avoid pure black (#000000), pure white (#FFFFFF), or common grays
   - Focus on colors that appear intentionally chosen for branding

3. TYPOGRAPHY:
   - Identify the main font used in headings and important text
   - Look for distinctive typography choices
   - Provide actual font family names when recognizable

4. LOGO DETECTION:
   - Only include logo_url if you can clearly see a logo image in the screenshot
   - The URL should point to the actual logo file visible in the image

5. COLOR FORMAT:
   - ALL colors must be 6-digit hex codes starting with #
   - Examples: #FF5733, #2C3E50, #E74C3C
   - Do not use color names, RGB values, or 3-digit hex codes

Focus on elements that appear to be intentional brand choices rather than generic design elements. Prioritize colors and fonts that suggest brand identity over standard web colors.`;

  console.log('Calling OpenAI Vision API (GPT-4o) for enhanced brand extraction');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: enhancedPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshotUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI API error: ${response.status} - ${errorText}`);
    throw new Error(`OpenAI Vision API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  console.log('GPT-4o Vision API response:', content);
  
  try {
    const extractedInfo = JSON.parse(content);
    
    // Validate and sanitize the extracted information
    const sanitizedBrandInfo: ExtractedBrandInfo = {
      name: validateBrandName(extractedInfo.name),
      primary_color: validateHexColor(extractedInfo.primary_color, '#e74c3c'),
      secondary_color: validateHexColor(extractedInfo.secondary_color, '#ffffff'),
      accent_color: validateHexColor(extractedInfo.accent_color, '#3498db'),
      font_family: validateFontFamily(extractedInfo.font_family),
      logo_url: validateLogoUrl(extractedInfo.logo_url)
    };
    
    console.log('Validated brand info:', sanitizedBrandInfo);
    return sanitizedBrandInfo;
    
  } catch (parseError) {
    console.error('Failed to parse OpenAI response as JSON:', parseError);
    console.error('Raw response:', content);
    throw new Error('Failed to parse brand information from Vision API response');
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function validateBrandName(name: any): string {
  if (typeof name === 'string' && name.trim().length > 0 && name.trim().length < 100) {
    return name.trim();
  }
  return 'Brand Name';
}

function validateHexColor(color: any, fallback: string): string {
  if (typeof color === 'string') {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    if (hexPattern.test(color)) {
      return color.toUpperCase();
    }
  }
  return fallback;
}

function validateFontFamily(font: any): string {
  if (typeof font === 'string' && font.trim().length > 0) {
    // Clean font family name
    const cleanFont = font.trim().replace(/['"]/g, '');
    if (cleanFont.length > 0 && cleanFont.length < 50) {
      return cleanFont;
    }
  }
  return 'Arial';
}

function validateLogoUrl(url: any): string | undefined {
  if (typeof url === 'string' && url.trim().length > 0) {
    try {
      new URL(url.trim());
      return url.trim();
    } catch {
      // Invalid URL
      return undefined;
    }
  }
  return undefined;
}

// ============================================================================
// HTML PARSING EXTRACTION
// ============================================================================

async function extractBrandFromHTML(html: string, url: string): Promise<ExtractedBrandInfo> {
  console.log('Extracting brand info from HTML');
  
  const brandName = extractBrandName(html);
  const logoUrl = extractLogoUrl(html, url);
  
  let colors = { primary: '#000000', secondary: '#ffffff', accent: '#0066cc' };
  let fontFamily = 'Arial';
  
  try {
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    const cssContent = styleMatches.join('\n');
    
    if (cssContent || html) {
      colors = await extractColorsFromCSS(cssContent, html);
      fontFamily = extractFontsFromCSS(cssContent);
    }
  } catch (error) {
    console.log('Could not extract advanced styling, using defaults');
  }

  return {
    name: brandName,
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
    font_family: fontFamily,
    logo_url: logoUrl
  };
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, userId } = await req.json();
    
    if (!url || !userId) {
      throw new Error('URL and user ID are required');
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    console.log(`Scraping website: ${url}`);

    // Scrape the website using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['html', 'markdown'],
        includeTags: ['title', 'h1', 'h2', 'style', 'link', 'img'],
        excludeTags: ['script', 'noscript'],
        screenshot: true,
        screenshotOptions: {
          type: 'jpeg',
          quality: 85,
          fullPage: false
        }
      })
    });

    console.log(`Firecrawl API response status: ${scrapeResponse.status}`);

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error(`Firecrawl API error: ${scrapeResponse.status} - ${errorText}`);
      throw new Error(`Firecrawl API error: ${scrapeResponse.status} - ${errorText}`);
    }

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape data received:', JSON.stringify(scrapeData, null, 2));
    
    if (!scrapeData.success) {
      console.error('Scraping failed:', scrapeData);
      throw new Error('Failed to scrape website');
    }

    const html = scrapeData.data?.html || '';
    const markdown = scrapeData.data?.markdown || '';
    
    // Handle different screenshot URL formats from Firecrawl
    let screenshotUrl = null;
    if (scrapeData.data?.screenshot) {
      if (typeof scrapeData.data.screenshot === 'string') {
        screenshotUrl = scrapeData.data.screenshot;
      } else if (scrapeData.data.screenshot.url) {
        screenshotUrl = scrapeData.data.screenshot.url;
      }
    }
    
    console.log('HTML length:', html.length);
    console.log('Markdown length:', markdown.length);
    console.log('Screenshot URL:', screenshotUrl);
    console.log('Screenshot data structure:', JSON.stringify(scrapeData.data?.screenshot, null, 2));
    
    let extractedBrand: ExtractedBrandInfo;
    
    // Try to get a screenshot for vision analysis
    if (!screenshotUrl) {
      console.log('No screenshot from Firecrawl, trying fallback screenshot generation');
      screenshotUrl = await generateFallbackScreenshot(url);
    }
    
    // Use vision API if we have a screenshot, otherwise fall back to HTML parsing
    if (screenshotUrl) {
      console.log('Using Vision API with screenshot for brand extraction');
      try {
        extractedBrand = await extractBrandInfoWithVision(screenshotUrl);
        console.log('Vision API extraction successful');
      } catch (visionError) {
        console.log('Vision API failed, falling back to HTML parsing:', visionError.message);
        extractedBrand = await extractBrandFromHTML(html, url);
      }
    } else {
      console.log('No screenshot available, using HTML parsing only');
      extractedBrand = await extractBrandFromHTML(html, url);
    }

    console.log('Extracted brand info:', extractedBrand);

    return new Response(
      JSON.stringify({ 
        success: true, 
        brandInfo: extractedBrand 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating brand from website:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});