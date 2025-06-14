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
  
  // Enhanced CSS custom properties extraction (CSS variables)
  const cssVariablePatterns = [
    /--[a-zA-Z0-9-]*:\s*(#[0-9a-fA-F]{6})/g,
    /--[a-zA-Z0-9-]*:\s*(rgb\([^)]+\))/g,
    /--[a-zA-Z0-9-]*:\s*(rgba\([^)]+\))/g,
    /--[a-zA-Z0-9-]*:\s*(hsl\([^)]+\))/g
  ];
  
  const variableColors: string[] = [];
  cssVariablePatterns.forEach(pattern => {
    const matches = [...css.matchAll(pattern)];
    matches.forEach(match => {
      const colorValue = match[1];
      if (colorValue?.startsWith('#')) {
        variableColors.push(colorValue);
      } else if (colorValue?.startsWith('rgb')) {
        const rgbMatch = colorValue.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          variableColors.push(`#${r}${g}${b}`);
        }
      }
    });
  });
  
  // Extract colors from style attributes in HTML elements
  const styleAttributeColors: string[] = [];
  const styleAttrMatches = html.match(/style=['"][^'"]*['"]/g) || [];
  styleAttrMatches.forEach(styleAttr => {
    const hexInStyle = styleAttr.match(/#[0-9a-fA-F]{6}/g) || [];
    const rgbInStyle = styleAttr.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];
    
    styleAttributeColors.push(...hexInStyle);
    rgbInStyle.forEach(rgb => {
      const values = rgb.match(/\d+/g);
      if (values && values.length === 3) {
        const r = parseInt(values[0]).toString(16).padStart(2, '0');
        const g = parseInt(values[1]).toString(16).padStart(2, '0');
        const b = parseInt(values[2]).toString(16).padStart(2, '0');
        styleAttributeColors.push(`#${r}${g}${b}`);
      }
    });
  });
  
  // Extract colors from brand-related class and id attributes
  const brandRelatedColors: string[] = [];
  const brandSelectors = [
    /class=['"][^'"]*(?:brand|logo|header|nav|primary|accent|theme)[^'"]*['"][^>]*style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]/gi,
    /id=['"][^'"]*(?:brand|logo|header|nav|primary|accent|theme)[^'"]*['"][^>]*style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]/gi
  ];
  
  brandSelectors.forEach(pattern => {
    const matches = [...html.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) brandRelatedColors.push(match[1]);
    });
  });
  
  // CSS-in-JS and styled-components patterns
  const cssInJsColors: string[] = [];
  const cssInJsPatterns = [
    /(?:backgroundColor|color):\s*['"`](#[0-9a-fA-F]{6})['"`]/g,
    /(?:backgroundColor|color):\s*['"`](rgb\([^)]+\))['"`]/g,
    /styled\.[a-zA-Z]+`[^`]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^`]*`/g,
    /css`[^`]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^`]*`/g
  ];
  
  cssInJsPatterns.forEach(pattern => {
    const matches = [...html.matchAll(pattern), ...css.matchAll(pattern)];
    matches.forEach(match => {
      const color = match[1];
      if (color?.startsWith('#')) {
        cssInJsColors.push(color);
      } else if (color?.startsWith('rgb')) {
        const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          cssInJsColors.push(`#${r}${g}${b}`);
        }
      }
    });
  });
  
  // SVG colors and inline SVG styles
  const svgColors: string[] = [];
  const svgPatterns = [
    /<svg[^>]*fill=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/gi,
    /<svg[^>]*stroke=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/gi,
    /<(?:path|rect|circle|ellipse|polygon)[^>]*fill=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/gi,
    /<(?:path|rect|circle|ellipse|polygon)[^>]*stroke=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/gi,
    /<style[^>]*>[^<]*\.svg[^{]*{[^}]*(?:fill|stroke):\s*(#[0-9a-fA-F]{6})[^}]*}/gi
  ];
  
  svgPatterns.forEach(pattern => {
    const matches = [...html.matchAll(pattern)];
    matches.forEach(match => {
      const colorValue = match[1];
      const hexMatch = colorValue?.match(/#[0-9a-fA-F]{6}/);
      if (hexMatch) svgColors.push(hexMatch[0]);
    });
  });
  
  // Detect and extract colors from gradients
  const gradients = detectGradients(css);
  const gradientColors = extractColorsFromGradients(gradients);
  console.log('Detected gradients:', gradients.length);
  console.log('Colors from gradients:', gradientColors);
  
  // Convert RGB to hex for legacy patterns
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
  
  // Extract enhanced brand color patterns from styles
  const brandColorPatterns = [
    /background-color:\s*(#[0-9a-fA-F]{6})/g,
    /color:\s*(#[0-9a-fA-F]{6})/g,
    /fill=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/g,
    /stroke=['"]([^'"]*#[0-9a-fA-F]{6}[^'"]*)['"]/g,
    /border-color:\s*(#[0-9a-fA-F]{6})/g,
    /box-shadow:[^;]*\s(#[0-9a-fA-F]{6})/g,
    /text-shadow:[^;]*\s(#[0-9a-fA-F]{6})/g
  ];
  
  const patternColors: string[] = [];
  brandColorPatterns.forEach(pattern => {
    const matches = [...css.matchAll(pattern), ...html.matchAll(pattern)];
    matches.forEach(match => {
      const color = match[1]?.match(/#[0-9a-fA-F]{6}/)?.[0];
      if (color) patternColors.push(color);
    });
  });
  
  // Brand element priority extraction
  const brandPriorityColors: string[] = [];
  const brandElementPatterns = [
    // Header and navigation colors
    /<header[^>]*(?:style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]|class=['"][^'"]*['"]))]/gi,
    /<nav[^>]*(?:style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]|class=['"][^'"]*['"]))]/gi,
    // Brand-specific elements
    /class=['"][^'"]*(?:brand|logo|navbar|header|primary|accent)[^'"]*['"][^>]*style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]/gi,
    /id=['"][^'"]*(?:brand|logo|navbar|header|primary|accent)[^'"]*['"][^>]*style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]/gi,
    // Top-level navigation and branding
    /<div[^>]*class=['"][^'"]*(?:nav|header|brand|top|main)[^'"]*['"][^>]*style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]/gi
  ];
  
  brandElementPatterns.forEach(pattern => {
    const matches = [...html.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) brandPriorityColors.push(match[1]);
    });
  });

  // Filter out likely text/content colors (common text color patterns)
  const contentTextColors = new Set([
    '#000000', '#FFFFFF', '#333333', '#666666', '#999999', '#CCCCCC',
    '#212121', '#424242', '#757575', '#BDBDBD', '#E0E0E0', '#F5F5F5',
    '#1A1A1A', '#2C2C2C', '#4A4A4A', '#6B6B6B', '#8E8E8E', '#B1B1B1'
  ]);

  // Enhanced filtering for content vs brand colors
  const filteredContentColors = [...hexColors, ...convertedColors, ...patternColors].filter(color => {
    const upperColor = color.toUpperCase();
    // Remove common text colors
    if (contentTextColors.has(upperColor)) return false;
    
    // Remove colors that appear in paragraph, span, or text-heavy elements
    const textElementPattern = new RegExp(`<(?:p|span|div|article|section)[^>]*style=['"][^'"]*color:\\s*${color.replace('#', '\\#')}[^'"]*['"]`, 'gi');
    if (textElementPattern.test(html)) return false;
    
    return true;
  });

  // Combine all extracted colors with priority weighting (brand elements get highest priority)
  const allColors = [...new Set([
    ...brandPriorityColors,     // Highest priority
    ...brandRelatedColors,      // High priority  
    ...cssInJsColors,          // Medium-high priority
    ...svgColors,              // Medium priority
    ...gradientColors,         // Medium priority
    ...variableColors,         // Medium priority
    ...styleAttributeColors,   // Lower priority
    ...filteredContentColors  // Lowest priority (after content filtering)
  ])];
  
  console.log('Enhanced color extraction results:', {
    hexColors: hexColors.length,
    variableColors: variableColors.length,
    styleAttributeColors: styleAttributeColors.length,
    brandRelatedColors: brandRelatedColors.length,
    cssInJsColors: cssInJsColors.length,
    svgColors: svgColors.length,
    gradientColors: gradientColors.length,
    totalUnique: allColors.length
  });
  
  // Enhanced gray detection and color filtering
  const filteredColors = allColors.filter(color => {
    const cleanColor = color.toUpperCase();
    if (cleanColor === '#000000' || cleanColor === '#FFFFFF') return false;
    
    // Enhanced gray detection using multiple criteria
    const r = parseInt(cleanColor.slice(1, 3), 16);
    const g = parseInt(cleanColor.slice(3, 5), 16);
    const b = parseInt(cleanColor.slice(5, 7), 16);
    
    // Check RGB similarity (traditional method)
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (maxDiff <= 15) return false; // Strict gray detection
    
    // Check HSL saturation for desaturated colors
    const hsl = hexToHsl(cleanColor);
    if (hsl.s < 20) return false; // Remove low saturation colors
    
    // Remove very light colors (potential backgrounds)
    if (hsl.l > 85) return false;
    
    // Remove very dark colors (potential text colors)
    if (hsl.l < 15) return false;
    
    return true;
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

interface ScreenshotConfig {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  fullPage: boolean;
  waitFor: 'load' | 'networkidle' | 'domcontentloaded';
  blockAds: boolean;
  blockCookieBanners: boolean;
  timeout: number;
}

interface ScreenshotProvider {
  name: string;
  generateScreenshot: (url: string, config: ScreenshotConfig, retryCount?: number) => Promise<string | null>;
  maxRetries: number;
}

interface ScreenshotValidation {
  isValid: boolean;
  score: number;
  reasons: string[];
}

// Default screenshot configuration optimized for brand analysis
const DEFAULT_SCREENSHOT_CONFIG: ScreenshotConfig = {
  width: 1200,
  height: 800,
  quality: 85,
  format: 'jpeg',
  fullPage: false,
  waitFor: 'load',
  blockAds: true,
  blockCookieBanners: true,
  timeout: 30000
};

// Screenshot quality validation
async function validateScreenshot(screenshotUrl: string): Promise<ScreenshotValidation> {
  const validation: ScreenshotValidation = {
    isValid: false,
    score: 0,
    reasons: []
  };

  try {
    console.log('Validating screenshot quality:', screenshotUrl);
    
    // Check if URL is accessible
    const response = await fetch(screenshotUrl, { method: 'HEAD' });
    if (!response.ok) {
      validation.reasons.push(`Screenshot URL not accessible: ${response.status}`);
      return validation;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      validation.reasons.push(`Invalid content type: ${contentType}`);
      return validation;
    }

    // Check file size (should be reasonable for screenshots)
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      if (sizeKB < 10) {
        validation.reasons.push(`Screenshot too small: ${sizeKB}KB`);
        validation.score -= 30;
      } else if (sizeKB > 5000) {
        validation.reasons.push(`Screenshot very large: ${sizeKB}KB`);
        validation.score -= 10;
      } else {
        validation.score += 20;
      }
    }

    // Basic validation passed
    validation.isValid = true;
    validation.score += 50;
    validation.reasons.push('Screenshot URL accessible and valid');

    console.log(`Screenshot validation score: ${validation.score}`, validation.reasons);
    return validation;

  } catch (error) {
    console.error('Screenshot validation failed:', error);
    validation.reasons.push(`Validation error: ${error.message}`);
    return validation;
  }
}

// Enhanced retry logic with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (result) return result;
      
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  return null;
}

// ScreenshotAPI.net provider with enhanced parameters
async function screenshotApiProvider(url: string, config: ScreenshotConfig, retryCount: number = 0): Promise<string | null> {
  return retryWithBackoff(async () => {
    console.log(`ScreenshotAPI.net attempt ${retryCount + 1} for:`, url);
    
    const params = new URLSearchParams({
      token: 'N8QJ06J-RXBW5QM-HWBJ3T9-21G8M4P',
      url: url,
      width: config.width.toString(),
      height: config.height.toString(),
      output: 'json',
      file_type: config.format,
      quality: config.quality.toString(),
      no_ads: config.blockAds ? 'true' : 'false',
      no_cookie_banners: config.blockCookieBanners ? 'true' : 'false',
      wait_for_event: config.waitFor,
      full_page: config.fullPage ? 'true' : 'false',
      timeout: config.timeout.toString()
    });

    const response = await fetch(`https://shot.screenshotapi.net/screenshot?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.screenshot) {
        const validation = await validateScreenshot(data.screenshot);
        if (validation.isValid && validation.score >= 50) {
          console.log('ScreenshotAPI.net screenshot validated:', data.screenshot);
          return data.screenshot;
        } else {
          console.log('ScreenshotAPI.net screenshot failed validation:', validation.reasons);
          return null;
        }
      }
    }
    return null;
  }, 2);
}

// ScrapeOwl provider with enhanced parameters
async function scrapeOwlProvider(url: string, config: ScreenshotConfig, retryCount: number = 0): Promise<string | null> {
  return retryWithBackoff(async () => {
    console.log(`ScrapeOwl attempt ${retryCount + 1} for:`, url);
    
    const params = new URLSearchParams({
      api_key: 'YOUR_API_KEY',
      url: url,
      viewport_width: config.width.toString(),
      viewport_height: config.height.toString(),
      format: config.format,
      quality: config.quality.toString(),
      wait_for: config.waitFor,
      block_ads: config.blockAds ? 'true' : 'false',
      block_resources: 'font,stylesheet',
      full_page: config.fullPage ? 'true' : 'false',
      timeout: config.timeout.toString()
    });

    const response = await fetch(`https://api.scrapeowl.com/v1/screenshot?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.screenshot_url) {
        const validation = await validateScreenshot(data.screenshot_url);
        if (validation.isValid && validation.score >= 50) {
          console.log('ScrapeOwl screenshot validated:', data.screenshot_url);
          return data.screenshot_url;
        } else {
          console.log('ScrapeOwl screenshot failed validation:', validation.reasons);
          return null;
        }
      }
    }
    return null;
  }, 2);
}

// Puppeteer provider with enhanced parameters
async function puppeteerProvider(url: string, config: ScreenshotConfig, retryCount: number = 0): Promise<string | null> {
  return retryWithBackoff(async () => {
    console.log(`Puppeteer service attempt ${retryCount + 1} for:`, url);
    
    const response = await fetch('https://api.browserbase.com/v1/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_BROWSERBASE_API_KEY'
      },
      body: JSON.stringify({
        url: url,
        viewport: { width: config.width, height: config.height },
        format: config.format,
        quality: config.quality,
        waitUntil: config.waitFor === 'networkidle' ? 'networkidle0' : config.waitFor,
        blockAds: config.blockAds,
        blockCookieBanners: config.blockCookieBanners,
        fullPage: config.fullPage,
        timeout: config.timeout
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.screenshotUrl) {
        const validation = await validateScreenshot(data.screenshotUrl);
        if (validation.isValid && validation.score >= 50) {
          console.log('Puppeteer service screenshot validated:', data.screenshotUrl);
          return data.screenshotUrl;
        } else {
          console.log('Puppeteer service screenshot failed validation:', validation.reasons);
          return null;
        }
      }
    }
    return null;
  }, 2);
}

// HTMLCSSToImage provider with enhanced parameters
async function htmlCssToImageProvider(url: string, config: ScreenshotConfig, retryCount: number = 0): Promise<string | null> {
  return retryWithBackoff(async () => {
    console.log(`HTMLCSSToImage attempt ${retryCount + 1} for:`, url);
    
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('user-id:api-key'),
      },
      body: JSON.stringify({
        html: `<iframe src="${url}" width="${config.width}" height="${config.height}" style="border: none;"></iframe>`,
        css: 'body { margin: 0; }',
        device_scale: config.quality > 80 ? 2 : 1,
        viewport_width: config.width,
        viewport_height: config.height,
        format: config.format
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        const validation = await validateScreenshot(data.url);
        if (validation.isValid && validation.score >= 50) {
          console.log('HTMLCSSToImage screenshot validated:', data.url);
          return data.url;
        } else {
          console.log('HTMLCSSToImage screenshot failed validation:', validation.reasons);
          return null;
        }
      }
    }
    return null;
  }, 2);
}

// Screenshot.guru provider with enhanced parameters
async function screenshotGuruProvider(url: string, config: ScreenshotConfig, retryCount: number = 0): Promise<string | null> {
  return retryWithBackoff(async () => {
    console.log(`Screenshot.guru attempt ${retryCount + 1} for:`, url);
    
    const params = new URLSearchParams({
      url: url,
      width: config.width.toString(),
      height: config.height.toString(),
      type: config.format,
      quality: config.quality.toString(),
      full_page: config.fullPage ? '1' : '0'
    });

    const screenshotUrl = `https://screenshot.guru/api/screenshot?${params}`;
    const testResponse = await fetch(screenshotUrl, { method: 'HEAD' });
    
    if (testResponse.ok) {
      const validation = await validateScreenshot(screenshotUrl);
      if (validation.isValid && validation.score >= 50) {
        console.log('Screenshot.guru screenshot validated:', screenshotUrl);
        return screenshotUrl;
      } else {
        console.log('Screenshot.guru screenshot failed validation:', validation.reasons);
        return null;
      }
    }
    return null;
  }, 2);
}

// Main screenshot generation with enhanced configuration and validation
async function generateFallbackScreenshot(url: string, customConfig?: Partial<ScreenshotConfig>): Promise<string | null> {
  const config = { ...DEFAULT_SCREENSHOT_CONFIG, ...customConfig };
  console.log('Starting enhanced screenshot generation with config:', config);
  
  // Define provider chain with retry limits
  const providers: ScreenshotProvider[] = [
    { name: 'ScreenshotAPI.net', generateScreenshot: screenshotApiProvider, maxRetries: 3 },
    { name: 'Puppeteer Service', generateScreenshot: puppeteerProvider, maxRetries: 2 },
    { name: 'ScrapeOwl', generateScreenshot: scrapeOwlProvider, maxRetries: 2 },
    { name: 'HTMLCSSToImage', generateScreenshot: htmlCssToImageProvider, maxRetries: 2 },
    { name: 'Screenshot.guru', generateScreenshot: screenshotGuruProvider, maxRetries: 1 }
  ];

  // Try each provider with their specific retry logic
  for (const provider of providers) {
    for (let retry = 0; retry < provider.maxRetries; retry++) {
      try {
        console.log(`Attempting ${provider.name} (retry ${retry + 1}/${provider.maxRetries})...`);
        const screenshotUrl = await provider.generateScreenshot(url, config, retry);
        
        if (screenshotUrl) {
          console.log(`✓ ${provider.name} succeeded with validation:`, screenshotUrl);
          return screenshotUrl;
        } else {
          console.log(`✗ ${provider.name} attempt ${retry + 1} failed or invalid`);
        }
      } catch (error) {
        console.error(`✗ ${provider.name} attempt ${retry + 1} error:`, error);
        continue;
      }
    }
    
    // Delay between different providers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('All screenshot providers failed with retries and validation');
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

CRITICAL COLOR EXTRACTION INSTRUCTIONS:
1. IDENTIFY EXACT HEX COLOR CODES from the website's visual elements
2. CALCULATE DOMINANT COLOR PERCENTAGES across the entire visible interface
3. ANALYZE BRAND ELEMENT LOCATIONS with precise coordinates and descriptions
4. PRIORITIZE colors from: header, navigation bar, buttons, logo, brand elements, CTAs
5. AVOID generic text colors (#000000, #333333, #666666, #999999, #ffffff) unless they are clearly intentional brand colors
6. EXTRACT colors that appear repeatedly across brand elements
7. PROVIDE CONFIDENCE LEVELS (0-100) for each color based on:
   - Frequency of appearance in brand elements (20 points)
   - Color prominence and visual weight (25 points)
   - Strategic placement (headers, logos, CTAs) (25 points)
   - Color harmony with other brand elements (15 points)
   - Professional color theory principles (15 points)

COLOR PERCENTAGE ANALYSIS:
- Calculate approximate percentage coverage of each identified color
- Consider visual weight, not just pixel count
- Account for color importance in brand hierarchy
- Identify color distribution patterns across the interface

BRAND ELEMENT LOCATION MAPPING:
- Map locations of key brand elements (header, logo, navigation, CTAs)
- Describe positioning (top-left, center, bottom-right, etc.)
- Analyze spatial relationships between brand elements
- Note visual hierarchy and element prominence

COLOR CONFIDENCE SCORING SYSTEM:
- 90-100: Dominant brand colors (logo primary, main CTAs, brand headers)
- 75-89: Strong brand colors (secondary logos, primary navigation, key buttons)
- 60-74: Supporting brand colors (accents, highlights, secondary CTAs)
- 45-59: Possible brand colors (backgrounds, borders, subtle accents)
- Below 45: Uncertain or likely non-brand colors

CRITICAL INSTRUCTIONS: Return ONLY a valid JSON object with this EXACT structure:

{
  "name": "Primary brand/company name",
  "primary_color": "#RRGGBB",
  "primary_color_confidence": 85,
  "primary_color_percentage": 25.5,
  "primary_color_reasoning": "Detailed explanation for primary color selection, confidence score, and percentage calculation",
  "secondary_color": "#RRGGBB", 
  "secondary_color_confidence": 75,
  "secondary_color_percentage": 35.2,
  "secondary_color_reasoning": "Detailed explanation for secondary color selection, confidence score, and percentage calculation",
  "accent_color": "#RRGGBB",
  "accent_color_confidence": 80,
  "accent_color_percentage": 8.3,
  "accent_color_reasoning": "Detailed explanation for accent color selection, confidence score, and percentage calculation",
  "font_family": "Font name",
  "logo_url": "URL or null",
  "personality": {
    "primary_trait": "Primary personality trait",
    "secondary_traits": ["trait1", "trait2", "trait3"],
    "industry_context": "Industry/sector classification",
    "design_approach": "Overall design philosophy"
  },
  "confidence_scores": {
    "name": 95,
    "colors": 82,
    "typography": 78,
    "logo": 65,
    "personality": 75,
    "overall": 79
  },
  "color_analysis": {
    "dominant_colors": [
      {
        "hex": "#RRGGBB",
        "percentage": 25.5,
        "name": "Primary Brand Blue",
        "locations": ["header", "logo", "primary_cta"],
        "visual_weight": "high"
      },
      {
        "hex": "#RRGGBB",
        "percentage": 35.2,
        "name": "Background White",
        "locations": ["main_content", "cards", "sections"],
        "visual_weight": "medium"
      },
      {
        "hex": "#RRGGBB",
        "percentage": 8.3,
        "name": "Accent Orange",
        "locations": ["buttons", "links", "highlights"],
        "visual_weight": "high"
      }
    ],
    "color_distribution": {
      "header_colors": ["#color1", "#color2"],
      "navigation_colors": ["#color1", "#color3"],
      "button_colors": ["#color3", "#color1"],
      "background_colors": ["#color2", "#color4"],
      "text_colors": ["#color5", "#color6"]
    },
    "brand_element_locations": {
      "logo": {
        "position": "top-left",
        "coordinates": "approximate x,y",
        "size": "medium",
        "prominence": "high",
        "colors_used": ["#color1", "#color2"]
      },
      "header": {
        "position": "top-full-width",
        "height_percentage": 12,
        "background_color": "#color1",
        "text_color": "#color2"
      },
      "navigation": {
        "position": "top-horizontal",
        "style": "horizontal_menu",
        "colors_used": ["#color1", "#color2"]
      },
      "primary_cta": {
        "position": "hero_section",
        "button_color": "#color3",
        "text_color": "#color2",
        "prominence": "very_high"
      },
      "footer": {
        "position": "bottom-full-width",
        "background_color": "#color4",
        "text_color": "#color5"
      }
    },
    "visual_hierarchy_analysis": {
      "most_prominent_elements": ["logo", "primary_cta", "header"],
      "color_attention_flow": ["primary_color", "accent_color", "secondary_color"],
      "brand_consistency_score": 85
    }
  }
}

🎨 DETAILED ANALYSIS REQUIREMENTS:

1. COLOR PERCENTAGE CALCULATION:
   - Estimate visual coverage of each color across the interface
   - Consider color prominence and visual weight, not just pixel count
   - Account for strategic placement importance
   - Include colors that occupy 5% or more of the visual space

2. BRAND ELEMENT LOCATION MAPPING:
   - Identify precise locations of logo, header, navigation, CTAs
   - Describe spatial relationships and positioning
   - Analyze visual hierarchy and prominence
   - Map color usage across different interface zones

3. VISUAL WEIGHT ASSESSMENT:
   - High: Colors that immediately draw attention (CTAs, logos, headers)
   - Medium: Supporting colors that provide structure (backgrounds, sections)
   - Low: Subtle colors for text and minor elements

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
    
    // Try Google Vision API as backup
    try {
      console.log('Attempting Google Vision API as backup...');
      return await extractBrandInfoWithGoogleVision(screenshotUrl);
    } catch (googleError) {
      console.error('Google Vision analysis failed:', googleError);
      
      // Try Claude Vision as backup
      try {
        console.log('Attempting Claude Vision API as backup...');
        return await extractBrandInfoWithClaudeVision(screenshotUrl);
      } catch (claudeError) {
        console.error('Claude Vision analysis failed:', claudeError);
        
        // Use local color analysis as last resort
        console.log('Using local color analysis as last resort...');
        return await extractBrandInfoWithLocalAnalysis(screenshotUrl);
      }
    }
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
    
    // Try fallback vision APIs if parsing fails
    try {
      console.log('Attempting Google Vision API due to parse error...');
      return await extractBrandInfoWithGoogleVision(screenshotUrl);
    } catch (googleError) {
      console.error('Google Vision fallback failed:', googleError);
      
      try {
        console.log('Attempting Claude Vision API due to parse error...');
        return await extractBrandInfoWithClaudeVision(screenshotUrl);
      } catch (claudeError) {
        console.error('Claude Vision fallback failed:', claudeError);
        
        console.log('Using local color analysis as final fallback...');
        return await extractBrandInfoWithLocalAnalysis(screenshotUrl);
      }
    }
  }
}

// ============================================================================
// GOOGLE VISION API IMPLEMENTATION
// ============================================================================

async function extractBrandInfoWithGoogleVision(screenshotUrl: string): Promise<ExtractedBrandInfo> {
  const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  if (!googleApiKey) {
    throw new Error('Google Vision API key not configured');
  }

  console.log('Using Google Vision API for brand analysis');

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            source: {
              imageUri: screenshotUrl
            }
          },
          features: [
            { type: 'IMAGE_PROPERTIES', maxResults: 10 },
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'LOGO_DETECTION', maxResults: 5 },
            { type: 'WEB_DETECTION', maxResults: 5 }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Google Vision API response:', JSON.stringify(data, null, 2));

  // Extract colors from image properties
  const imageProperties = data.responses[0]?.imagePropertiesAnnotation;
  const dominantColors = imageProperties?.dominantColors?.colors || [];
  
  // Extract text for brand name
  const textAnnotations = data.responses[0]?.textAnnotations || [];
  const detectedText = textAnnotations.map((annotation: any) => annotation.description).join(' ');
  
  // Extract web entities for brand context
  const webDetection = data.responses[0]?.webDetection;
  const webEntities = webDetection?.webEntities || [];
  
  // Process colors and create brand info
  const processedColors = processDominantColors(dominantColors);
  const brandName = extractBrandNameFromText(detectedText, webEntities);

  return {
    name: brandName,
    primary_color: processedColors.primary,
    secondary_color: processedColors.secondary,
    accent_color: processedColors.accent,
    font_family: 'Arial',
    logo_url: undefined,
    personality: {
      primary_trait: 'Professional',
      secondary_traits: ['Modern', 'Clean'],
      industry_context: 'Technology',
      design_approach: 'Minimalist'
    },
    confidence_scores: {
      name: 0.6,
      colors: 0.8,
      typography: 0.3,
      logo: 0.2,
      personality: 0.5,
      overall: 0.52
    }
  };
}

// ============================================================================
// CLAUDE VISION API IMPLEMENTATION
// ============================================================================

async function extractBrandInfoWithClaudeVision(screenshotUrl: string): Promise<ExtractedBrandInfo> {
  const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!claudeApiKey) {
    throw new Error('Claude API key not configured');
  }

  console.log('Using Claude Vision API for brand analysis');

  // Download image and convert to base64
  const imageResponse = await fetch(screenshotUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this website screenshot and extract brand information. Return ONLY a valid JSON object with: name, primary_color (hex), secondary_color (hex), accent_color (hex), font_family, logo_url, personality object with primary_trait/secondary_traits/industry_context/design_approach, and confidence_scores object with name/colors/typography/logo/personality/overall. Focus on accurate color extraction from headers, logos, buttons, and navigation elements.`
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  console.log('Claude Vision response:', content);

  // Parse JSON from Claude response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Claude response');
  }

  const extractedData = JSON.parse(jsonMatch[0]);
  console.log('Successfully extracted brand info with Claude Vision:', extractedData);
  
  // Validate and return
  return {
    name: validateBrandName(extractedData.name),
    primary_color: validateHexColor(extractedData.primary_color, '#e74c3c'),
    secondary_color: validateHexColor(extractedData.secondary_color, '#ffffff'),
    accent_color: validateHexColor(extractedData.accent_color, '#3498db'),
    font_family: validateFontFamily(extractedData.font_family),
    logo_url: validateLogoUrl(extractedData.logo_url),
    personality: validatePersonality(extractedData.personality),
    confidence_scores: validateConfidenceScores(extractedData.confidence_scores)
  };
}

// ============================================================================
// LOCAL COLOR ANALYSIS IMPLEMENTATION
// ============================================================================

async function extractBrandInfoWithLocalAnalysis(screenshotUrl: string): Promise<ExtractedBrandInfo> {
  console.log('Performing local color analysis as last resort');

  try {
    // Download the image
    const imageResponse = await fetch(screenshotUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Extract basic colors using simple analysis
    const colors = await extractColorsFromImageBuffer(imageBuffer);
    
    return {
      name: 'Extracted Brand',
      primary_color: colors[0] || '#2563eb',
      secondary_color: colors[1] || '#ffffff',
      accent_color: colors[2] || '#f59e0b',
      font_family: 'Arial',
      logo_url: undefined,
      personality: {
        primary_trait: 'Modern',
        secondary_traits: ['Professional', 'Clean'],
        industry_context: 'Technology',
        design_approach: 'Contemporary'
      },
      confidence_scores: {
        name: 0.3,
        colors: 0.4,
        typography: 0.2,
        logo: 0.1,
        personality: 0.3,
        overall: 0.26
      }
    };
  } catch (error) {
    console.error('Local analysis failed:', error);
    
    // Return ultimate fallback brand info
    return {
      name: 'Unknown Brand',
      primary_color: '#2563eb',
      secondary_color: '#ffffff',
      accent_color: '#f59e0b',
      font_family: 'Arial',
      logo_url: undefined,
      personality: {
        primary_trait: 'Modern',
        secondary_traits: ['Professional'],
        industry_context: 'General',
        design_approach: 'Standard'
      },
      confidence_scores: {
        name: 0.1,
        colors: 0.2,
        typography: 0.1,
        logo: 0.1,
        personality: 0.2,
        overall: 0.14
      }
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function processDominantColors(colors: any[]): { primary: string; secondary: string; accent: string } {
  const sortedColors = colors
    .filter((color: any) => color.score > 0.1)
    .sort((a: any, b: any) => b.score - a.score);

  const toHex = (color: any) => {
    const r = Math.round(color.color.red || 0);
    const g = Math.round(color.color.green || 0);
    const b = Math.round(color.color.blue || 0);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return {
    primary: sortedColors[0] ? toHex(sortedColors[0]) : '#2563eb',
    secondary: sortedColors[1] ? toHex(sortedColors[1]) : '#ffffff',
    accent: sortedColors[2] ? toHex(sortedColors[2]) : '#f59e0b'
  };
}

function extractBrandNameFromText(text: string, webEntities: any[]): string {
  const brandEntity = webEntities.find((entity: any) => entity.score > 0.5);
  if (brandEntity) {
    return brandEntity.description;
  }

  const words = text.split(/\s+/).filter((word: string) => word.length > 2);
  return words[0] || 'Unknown Brand';
}

async function extractColorsFromImageBuffer(buffer: ArrayBuffer): Promise<string[]> {
  // Simplified color extraction - in practice you'd use proper image processing
  const colors = ['#2563eb', '#ffffff', '#f59e0b'];
  return colors;
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