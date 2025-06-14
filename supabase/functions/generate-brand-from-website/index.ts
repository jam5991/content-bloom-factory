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

  const enhancedPrompt = `You are an expert brand analyst and visual designer with 15+ years of experience in brand identity extraction and color theory. Analyze this website screenshot with meticulous attention to brand elements.

CRITICAL INSTRUCTIONS: Return ONLY a valid JSON object with this EXACT structure:

{
  "name": "Primary brand/company name",
  "primary_color": "#RRGGBB",
  "secondary_color": "#RRGGBB", 
  "accent_color": "#RRGGBB",
  "font_family": "Font name",
  "logo_url": "URL or null"
}

DETAILED ANALYSIS FRAMEWORK:

🎨 COLOR EXTRACTION PRIORITIES:
1. PRIMARY COLOR: The most dominant brand color that defines identity
   - Look for: Logo colors, main navigation, primary buttons, headers
   - Avoid: Generic blacks, whites, light grays
   - Consider: Colors that appear in multiple brand touchpoints
   
2. SECONDARY COLOR: Supporting color that complements primary
   - Look for: Background colors, secondary navigation, subheadings
   - Consider: Colors used for content sections, cards, panels
   
3. ACCENT COLOR: Highlight color for CTAs and emphasis
   - Look for: Call-to-action buttons, links, highlights, badges
   - Consider: Colors that draw attention and guide user actions

🔤 TYPOGRAPHY ANALYSIS:
- Identify custom fonts vs system fonts
- Look for distinctive letterforms, weights, spacing
- Note: Sans-serif (modern), Serif (traditional), Script (decorative)
- Recognize popular web fonts: Roboto, Open Sans, Montserrat, Poppins, etc.

🏷️ BRAND NAME EXTRACTION:
- Prioritize: Logo text, main navigation brand name, page titles
- Ignore: Taglines, descriptive text, marketing copy
- Consider: Shortest, most prominent brand identifier

🖼️ LOGO IDENTIFICATION:
- Only include if clearly visible logo image in screenshot
- Must be actual logo file URL, not placeholder or icon

🎯 BRAND CONTEXT AWARENESS:
Consider the industry/sector suggested by design:
- Tech: Clean, minimal, blue/gray palettes
- Finance: Conservative, blue/green, serif fonts  
- Creative: Bold colors, unique typography
- E-commerce: High contrast, action-oriented
- Healthcare: Trust colors (blue/green), clean fonts

QUALITY STANDARDS:
✅ All hex codes must be exactly 6 digits: #FF5733
✅ Font names should be real, recognizable families
✅ Brand name should be concise (2-4 words max)
✅ Logo URL must be valid if provided


Focus on intentional brand design choices that distinguish this company from generic websites. Prioritize elements that appear deliberately chosen for brand identity over standard web design patterns.`;

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
      max_tokens: 1200,
      temperature: 0.05,
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
// HYBRID BRAND EXTRACTION (COMBINES VISION + HTML)
// ============================================================================

async function extractBrandInfoHybrid(screenshotUrl: string | null, html: string, url: string): Promise<ExtractedBrandInfo> {
  console.log('Starting hybrid brand extraction combining vision + HTML analysis');
  
  let visionResult: ExtractedBrandInfo | null = null;
  let htmlResult: ExtractedBrandInfo | null = null;
  
  // Try vision analysis first if screenshot is available
  if (screenshotUrl) {
    try {
      console.log('Attempting vision analysis...');
      visionResult = await extractBrandInfoWithVision(screenshotUrl);
      console.log('Vision analysis successful:', visionResult);
    } catch (visionError) {
      console.log('Vision analysis failed:', visionError.message);
    }
  }
  
  // Always run HTML analysis as backup/comparison
  try {
    console.log('Running HTML analysis...');
    htmlResult = await extractBrandFromHTML(html, url);
    console.log('HTML analysis complete:', htmlResult);
  } catch (htmlError) {
    console.log('HTML analysis failed:', htmlError.message);
  }
  
  // Combine results using smart merging logic
  const finalResult = combineExtractionResults(visionResult, htmlResult);
  console.log('Hybrid extraction final result:', finalResult);
  
  return finalResult;
}

function combineExtractionResults(vision: ExtractedBrandInfo | null, html: ExtractedBrandInfo | null): ExtractedBrandInfo {
  // If only one source worked, use it
  if (vision && !html) return vision;
  if (html && !vision) return html;
  if (!vision && !html) {
    return {
      name: 'Brand Name',
      primary_color: '#e74c3c',
      secondary_color: '#ffffff',
      accent_color: '#3498db',
      font_family: 'Arial',
      logo_url: undefined
    };
  }
  
  // Both sources available - combine intelligently
  const combined: ExtractedBrandInfo = {
    // Prefer vision for brand name (better at reading logos/headers)
    name: selectBestBrandName(vision!.name, html!.name),
    
    // Use color preference logic
    primary_color: selectBestColor(vision!.primary_color, html!.primary_color, '#e74c3c'),
    secondary_color: selectBestColor(vision!.secondary_color, html!.secondary_color, '#ffffff'),
    accent_color: selectBestColor(vision!.accent_color, html!.accent_color, '#3498db'),
    
    // Prefer vision for font family (better at recognizing fonts visually)
    font_family: vision!.font_family !== 'Arial' ? vision!.font_family : html!.font_family,
    
    // Prefer HTML for logo URL (more accurate URL extraction)
    logo_url: html!.logo_url || vision!.logo_url
  };
  
  console.log('Combined extraction results:', {
    vision_name: vision!.name,
    html_name: html!.name,
    selected_name: combined.name,
    vision_colors: [vision!.primary_color, vision!.secondary_color, vision!.accent_color],
    html_colors: [html!.primary_color, html!.secondary_color, html!.accent_color],
    selected_colors: [combined.primary_color, combined.secondary_color, combined.accent_color]
  });
  
  return combined;
}

function selectBestBrandName(visionName: string, htmlName: string): string {
  // Prefer vision if it's not the default
  if (visionName !== 'Brand Name' && visionName.length > 1) {
    return visionName;
  }
  
  // Fall back to HTML if it's not default
  if (htmlName !== 'Brand Name' && htmlName.length > 1) {
    return htmlName;
  }
  
  return 'Brand Name';
}

function selectBestColor(visionColor: string, htmlColor: string, fallback: string): string {
  // Helper to check if color is default/generic
  const isGenericColor = (color: string) => {
    const generic = ['#000000', '#FFFFFF', '#E74C3C', '#3498DB'];
    return generic.includes(color.toUpperCase());
  };
  
  // Prefer vision if it's not generic
  if (!isGenericColor(visionColor)) {
    return visionColor;
  }
  
  // Fall back to HTML if it's not generic
  if (!isGenericColor(htmlColor)) {
    return htmlColor;
  }
  
  // Both are generic, prefer vision
  return visionColor || fallback;
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
    
    // Use hybrid approach that combines vision + HTML analysis
    console.log('Using hybrid extraction approach (vision + HTML)');
    extractedBrand = await extractBrandInfoHybrid(screenshotUrl, html, url);

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