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
  personality: BrandPersonality;
  confidence_scores: ConfidenceScores;
}

interface BrandPersonality {
  primary_trait: string;
  secondary_traits: string[];
  industry_context: string;
  design_approach: string;
}

interface ConfidenceScores {
  name: number;
  colors: number;
  typography: number;
  logo: number;
  personality: number;
  overall: number;
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

// Color harmonization utilities
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function harmonizeColors(colors: string[]): { primary: string; secondary: string; accent: string } {
  if (colors.length === 0) {
    return { primary: '#e74c3c', secondary: '#ffffff', accent: '#3498db' };
  }

  // Convert colors to HSL for better manipulation
  const hslColors = colors.map(color => ({ color, ...hexToHsl(color) }));
  
  // Find the most vibrant color as primary
  const primary = hslColors.reduce((prev, curr) => 
    curr.s > prev.s ? curr : prev
  ).color;

  const primaryHsl = hexToHsl(primary);
  
  // Generate harmonious secondary (complementary or analogous)
  const secondaryHue = (primaryHsl.h + 180) % 360;
  const secondary = hslToHex(
    secondaryHue,
    Math.max(15, primaryHsl.s * 0.3), // Reduced saturation
    Math.min(90, primaryHsl.l + 30)   // Lighter
  );

  // Generate harmonious accent (triadic)
  const accentHue = (primaryHsl.h + 120) % 360;
  const accent = hslToHex(
    accentHue,
    Math.max(40, primaryHsl.s * 0.8), // High saturation for accent
    Math.max(30, Math.min(70, primaryHsl.l)) // Balanced lightness
  );

  return { primary, secondary, accent };
}

function detectGradients(css: string): string[] {
  const gradientPatterns = [
    /linear-gradient\([^)]+\)/g,
    /radial-gradient\([^)]+\)/g,
    /conic-gradient\([^)]+\)/g,
    /repeating-linear-gradient\([^)]+\)/g,
    /repeating-radial-gradient\([^)]+\)/g
  ];

  const gradients: string[] = [];
  gradientPatterns.forEach(pattern => {
    const matches = css.match(pattern) || [];
    gradients.push(...matches);
  });

  return gradients;
}

function extractColorsFromGradients(gradients: string[]): string[] {
  const colors: string[] = [];
  
  gradients.forEach(gradient => {
    // Extract hex colors from gradients
    const hexMatches = gradient.match(/#[0-9a-fA-F]{6}/g) || [];
    colors.push(...hexMatches);
    
    // Extract rgb colors from gradients
    const rgbMatches = gradient.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];
    rgbMatches.forEach(rgb => {
      const values = rgb.match(/\d+/g);
      if (values && values.length === 3) {
        const r = parseInt(values[0]).toString(16).padStart(2, '0');
        const g = parseInt(values[1]).toString(16).padStart(2, '0');
        const b = parseInt(values[2]).toString(16).padStart(2, '0');
        colors.push(`#${r}${g}${b}`);
      }
    });
  });

  return colors;
}

async function extractColorsFromCSS(css: string, html: string): Promise<{ primary: string; secondary: string; accent: string }> {
  // Extract hex colors from CSS and HTML
  const hexColors = [...(css.match(/#[0-9a-fA-F]{6}/g) || []), ...(html.match(/#[0-9a-fA-F]{6}/g) || [])];
  const rgbColors = [...(css.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || []), ...(html.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [])];
  
  // Extract CSS custom properties and color keywords
  const cssVariables = css.match(/--[a-zA-Z0-9-]*:\s*#[0-9a-fA-F]{6}/g) || [];
  const variableColors = cssVariables.map(v => v.match(/#[0-9a-fA-F]{6}/)?.[0]).filter(Boolean);
  
  // Detect and extract colors from gradients
  const gradients = detectGradients(css);
  const gradientColors = extractColorsFromGradients(gradients);
  console.log('Detected gradients:', gradients.length);
  console.log('Colors from gradients:', gradientColors);
  
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
    /fill=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/g,
    /stroke=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/g
  ];
  
  const patternColors: string[] = [];
  brandColorPatterns.forEach(pattern => {
    const matches = [...css.matchAll(pattern), ...html.matchAll(pattern)];
    matches.forEach(match => {
      const color = match[1]?.match(/#[0-9a-fA-F]{6}/)?.[0];
      if (color) patternColors.push(color);
    });
  });
  
  const allColors = [...new Set([...hexColors, ...convertedColors, ...variableColors, ...gradientColors, ...patternColors])];
  
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
  
  // Sort by frequency and color vibrancy
  const colorFreq = new Map();
  allColors.forEach(color => {
    colorFreq.set(color, (colorFreq.get(color) || 0) + 1);
  });
  
  const sortedColors = filteredColors.sort((a, b) => {
    const freqA = colorFreq.get(a) || 0;
    const freqB = colorFreq.get(b) || 0;
    
    // If frequencies are similar, prefer more vibrant colors
    if (Math.abs(freqA - freqB) <= 2) {
      const hslA = hexToHsl(a);
      const hslB = hexToHsl(b);
      return hslB.s - hslA.s; // Higher saturation first
    }
    
    return freqB - freqA;
  });
  
  console.log('Extracted colors before harmonization:', sortedColors);
  
  // Apply smart color harmonization
  const harmonizedColors = harmonizeColors(sortedColors.slice(0, 5)); // Use top 5 colors for harmonization
  
  console.log('Harmonized colors:', harmonizedColors);
  
  return harmonizedColors;
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

  const enhancedPrompt = `You are an expert brand analyst and visual designer with 15+ years of experience in brand identity extraction, color theory, typography, logo analysis, and brand personality assessment. Analyze this website screenshot with meticulous attention to brand elements.

CRITICAL INSTRUCTIONS: Return ONLY a valid JSON object with this EXACT structure:

{
  "name": "Primary brand/company name",
  "primary_color": "#RRGGBB",
  "secondary_color": "#RRGGBB", 
  "accent_color": "#RRGGBB",
  "font_family": "Font name",
  "logo_url": "URL or null",
  "personality": {
    "primary_trait": "Primary personality trait",
    "secondary_traits": ["trait1", "trait2", "trait3"],
    "industry_context": "Industry/sector classification",
    "design_approach": "Overall design philosophy"
  },
  "confidence_scores": {
    "name": 0.95,
    "colors": 0.88,
    "typography": 0.92,
    "logo": 0.75,
    "personality": 0.85,
    "overall": 0.87
  }
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

🔤 ADVANCED TYPOGRAPHY ANALYSIS:
EXAMINE WITH EXTREME PRECISION:
- Font weight variations (light, regular, medium, bold, black)
- Character spacing and letter proportions
- Distinctive letterforms (especially 'a', 'g', 'R', 'Q')
- X-height ratios and ascender/descender proportions
- Stroke contrast and terminal styles

FONT IDENTIFICATION PRIORITIES:
1. CUSTOM BRAND FONTS: Look for unique, proprietary typefaces
2. PREMIUM WEB FONTS: Identify paid font services (Typekit, Google Fonts Premium)
3. POPULAR WEB FONTS: Recognize common choices:
   - Sans-serif: Helvetica, Arial, Roboto, Open Sans, Lato, Montserrat, Poppins, Inter, Work Sans, Source Sans Pro
   - Serif: Times, Georgia, Playfair Display, Merriweather, Lora, Crimson Text
   - Display: Oswald, Bebas Neue, Raleway, Nunito, Quicksand
4. SYSTEM FONTS: Default browser fonts as last resort

🏷️ BRAND NAME EXTRACTION:
- Prioritize: Logo text, main navigation brand name, page titles
- Ignore: Taglines, descriptive text, marketing copy
- Consider: Shortest, most prominent brand identifier

🖼️ ADVANCED LOGO DETECTION:
LOGO IDENTIFICATION PRIORITIES:
1. VECTOR LOGOS: SVG files in navigation or header areas
2. HIGH-RES IMAGES: PNG/JPG logos with transparent backgrounds
3. FAVICON ANALYSIS: Look for high-quality favicon that could be logo
4. BRAND MARK DETECTION: Identify symbolic logos vs wordmarks

LOGO URL EXTRACTION METHOD:
- Scan HTML for logo-related attributes: alt="logo", class="logo", id="logo"
- Look for image files with "logo", "brand", "mark" in filename
- Check for SVG elements that form logo graphics
- Identify retina/high-DPI logo variants (@2x, @3x suffixes)
- Prioritize logos in header, navigation, or footer areas

🎭 BRAND PERSONALITY ANALYSIS:
PRIMARY TRAITS (choose one):
- Modern: Clean lines, minimal design, contemporary aesthetics
- Classic: Timeless design, traditional elements, established feel
- Playful: Bright colors, fun typography, casual approach
- Professional: Business-focused, serious tone, corporate aesthetic
- Creative: Artistic elements, unique layouts, innovative design
- Luxury: Premium materials, elegant typography, sophisticated colors
- Approachable: Friendly design, warm colors, accessible layout
- Bold: High contrast, strong typography, confident presentation
- Minimalist: Simple design, lots of whitespace, focused content

SECONDARY TRAITS (select 2-3):
- Innovative, Trustworthy, Energetic, Sophisticated, Friendly, 
- Reliable, Dynamic, Elegant, Cutting-edge, Traditional, Warm, 
- Authoritative, Fresh, Established, Youthful, Premium, Accessible

INDUSTRY CONTEXT:
- Technology, Finance, Healthcare, E-commerce, Creative/Design, 
- Education, Food & Beverage, Fashion, Real Estate, Non-profit,
- Entertainment, Professional Services, Manufacturing, Startup

DESIGN APPROACH:
- Minimalist, Maximalist, Flat Design, Material Design, Neumorphism,
- Brutalist, Typography-focused, Image-heavy, Illustration-based,
- Grid-based, Organic/Flowing, Geometric, Hand-crafted, Corporate

🎯 CONFIDENCE SCORING GUIDELINES:
Rate each element 0.0-1.0 based on:
- NAME: Clarity and prominence of brand identifier (0.9+ if clear logo text, 0.5-0.8 if inferred)
- COLORS: Distinctiveness and consistency (0.9+ if strong brand colors, 0.6-0.8 if generic)
- TYPOGRAPHY: Font identification accuracy (0.9+ if clearly identifiable, 0.7-0.8 if estimated)
- LOGO: Visibility and quality (0.9+ if clear logo visible, 0.3-0.6 if inferred/favicon only)
- PERSONALITY: Design coherence for trait assessment (0.8+ if clear indicators, 0.6-0.7 if mixed)
- OVERALL: Average confidence across all elements

QUALITY STANDARDS:
✅ All hex codes must be exactly 6 digits: #FF5733
✅ Font names should be real, recognizable families with proper capitalization
✅ Brand name should be concise (2-4 words max)
✅ Logo URL must be actual image file URL, not page URL
✅ Confidence scores must be realistic decimals between 0.0-1.0
✅ Personality traits must match established brand archetypes

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
      logo_url: validateLogoUrl(extractedInfo.logo_url),
      personality: validatePersonality(extractedInfo.personality),
      confidence_scores: validateConfidenceScores(extractedInfo.confidence_scores)
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

function validatePersonality(personality: any): BrandPersonality {
  const defaultPersonality: BrandPersonality = {
    primary_trait: 'Professional',
    secondary_traits: ['Reliable', 'Trustworthy'],
    industry_context: 'Professional Services',
    design_approach: 'Corporate'
  };

  if (!personality || typeof personality !== 'object') {
    return defaultPersonality;
  }

  return {
    primary_trait: typeof personality.primary_trait === 'string' ? personality.primary_trait : defaultPersonality.primary_trait,
    secondary_traits: Array.isArray(personality.secondary_traits) ? personality.secondary_traits.slice(0, 3) : defaultPersonality.secondary_traits,
    industry_context: typeof personality.industry_context === 'string' ? personality.industry_context : defaultPersonality.industry_context,
    design_approach: typeof personality.design_approach === 'string' ? personality.design_approach : defaultPersonality.design_approach
  };
}

function validateConfidenceScores(scores: any): ConfidenceScores {
  const defaultScores: ConfidenceScores = {
    name: 0.5,
    colors: 0.5,
    typography: 0.5,
    logo: 0.3,
    personality: 0.6,
    overall: 0.5
  };

  if (!scores || typeof scores !== 'object') {
    return defaultScores;
  }

  const validateScore = (score: any): number => {
    if (typeof score === 'number' && score >= 0 && score <= 1) {
      return Math.round(score * 100) / 100; // Round to 2 decimal places
    }
    return 0.5;
  };

  const validated = {
    name: validateScore(scores.name),
    colors: validateScore(scores.colors),
    typography: validateScore(scores.typography),
    logo: validateScore(scores.logo),
    personality: validateScore(scores.personality),
    overall: validateScore(scores.overall)
  };

  // Calculate overall score if not provided or invalid
  if (scores.overall === undefined || validateScore(scores.overall) === 0.5) {
    validated.overall = Math.round(((validated.name + validated.colors + validated.typography + validated.logo + validated.personality) / 5) * 100) / 100;
  }

  return validated;
}

function generateBasicPersonality(html: string, colors: { primary: string; secondary: string; accent: string }): BrandPersonality {
  // Analyze HTML structure and colors to make basic personality assessment
  const hasNavigation = html.includes('<nav') || html.includes('navigation');
  const hasButton = html.includes('<button') || html.includes('btn');
  const hasForm = html.includes('<form');
  const hasVideo = html.includes('<video') || html.includes('youtube') || html.includes('vimeo');
  const hasAnimation = html.includes('animation') || html.includes('transition');
  
  // Color psychology analysis
  const primaryHsl = hexToHsl(colors.primary);
  const isBlueish = primaryHsl.h >= 200 && primaryHsl.h <= 260;
  const isRedish = primaryHsl.h >= 340 || primaryHsl.h <= 20;
  const isGreenish = primaryHsl.h >= 80 && primaryHsl.h <= 160;
  const isOrangish = primaryHsl.h >= 20 && primaryHsl.h <= 60;
  const isHighSaturation = primaryHsl.s > 60;
  
  // Determine primary trait based on structure and colors
  let primaryTrait = 'Professional';
  let industryContext = 'Professional Services';
  let designApproach = 'Corporate';
  const secondaryTraits: string[] = ['Reliable', 'Trustworthy'];
  
  // Business/professional indicators
  if (isBlueish && !isHighSaturation) {
    primaryTrait = 'Professional';
    industryContext = 'Finance';
    secondaryTraits.push('Trustworthy');
  }
  // Technology indicators
  else if (isBlueish && hasAnimation) {
    primaryTrait = 'Modern';
    industryContext = 'Technology';
    designApproach = 'Minimalist';
    secondaryTraits.splice(0, 2, 'Innovative', 'Cutting-edge');
  }
  // Creative indicators
  else if (isHighSaturation && (isRedish || isOrangish)) {
    primaryTrait = 'Creative';
    industryContext = 'Creative/Design';
    designApproach = 'Typography-focused';
    secondaryTraits.splice(0, 2, 'Bold', 'Dynamic');
  }
  // Healthcare/wellness indicators
  else if (isGreenish) {
    primaryTrait = 'Approachable';
    industryContext = 'Healthcare';
    secondaryTraits.splice(0, 2, 'Trustworthy', 'Warm');
  }
  // E-commerce indicators
  else if (hasButton && hasForm) {
    primaryTrait = 'Professional';
    industryContext = 'E-commerce';
    designApproach = 'Grid-based';
    secondaryTraits.push('Reliable');
  }
  
  // Adjust based on structure
  if (hasVideo || hasAnimation) {
    if (!secondaryTraits.includes('Dynamic')) {
      secondaryTraits.push('Dynamic');
    }
  }
  
  if (hasNavigation && hasForm) {
    designApproach = 'Corporate';
  }
  
  return {
    primary_trait: primaryTrait,
    secondary_traits: secondaryTraits.slice(0, 3),
    industry_context: industryContext,
    design_approach: designApproach
  };
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

  // Generate basic personality assessment from HTML structure
  const personalityAssessment = generateBasicPersonality(html, colors);
  
  // Generate confidence scores for HTML-based extraction
  const confidenceScores: ConfidenceScores = {
    name: brandName !== 'Brand Name' ? 0.7 : 0.3,
    colors: colors.primary !== '#000000' ? 0.6 : 0.3,
    typography: fontFamily !== 'Arial' ? 0.5 : 0.3,
    logo: logoUrl ? 0.6 : 0.2,
    personality: 0.4, // Lower confidence for HTML-based personality assessment
    overall: 0.0 // Will be calculated
  };
  confidenceScores.overall = Math.round(((confidenceScores.name + confidenceScores.colors + confidenceScores.typography + confidenceScores.logo + confidenceScores.personality) / 5) * 100) / 100;

  return {
    name: brandName,
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
    font_family: fontFamily,
    logo_url: logoUrl,
    personality: personalityAssessment,
    confidence_scores: confidenceScores
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
      logo_url: undefined,
      personality: {
        primary_trait: 'Professional',
        secondary_traits: ['Reliable', 'Trustworthy'],
        industry_context: 'Professional Services',
        design_approach: 'Corporate'
      },
      confidence_scores: {
        name: 0.3,
        colors: 0.3,
        typography: 0.3,
        logo: 0.2,
        personality: 0.3,
        overall: 0.28
      }
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
    logo_url: html!.logo_url || vision!.logo_url,
    
    // Prefer vision for personality assessment (better visual context)
    personality: vision!.personality || html!.personality,
    
    // Combine confidence scores using weighted average (vision gets higher weight)
    confidence_scores: combineConfidenceScores(vision!.confidence_scores, html!.confidence_scores)
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

function combineConfidenceScores(vision: ConfidenceScores, html: ConfidenceScores): ConfidenceScores {
  // Weighted average with vision getting higher weight (0.7) and HTML getting lower weight (0.3)
  const visionWeight = 0.7;
  const htmlWeight = 0.3;
  
  const combined = {
    name: Math.round((vision.name * visionWeight + html.name * htmlWeight) * 100) / 100,
    colors: Math.round((vision.colors * visionWeight + html.colors * htmlWeight) * 100) / 100,
    typography: Math.round((vision.typography * visionWeight + html.typography * htmlWeight) * 100) / 100,
    logo: Math.round((vision.logo * visionWeight + html.logo * htmlWeight) * 100) / 100,
    personality: Math.round((vision.personality * visionWeight + html.personality * htmlWeight) * 100) / 100,
    overall: 0.0 // Will be calculated
  };
  
  // Calculate overall score
  combined.overall = Math.round(((combined.name + combined.colors + combined.typography + combined.logo + combined.personality) / 5) * 100) / 100;
  
  return combined;
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
        excludeTags: ['script', 'noscript']
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