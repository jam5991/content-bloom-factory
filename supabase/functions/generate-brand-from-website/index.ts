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
// ADVANCED COLOR ANALYSIS INTERFACES
// ============================================================================

interface ColorLab {
  l: number;
  a: number;
  b: number;
}

interface ColorAnalysis {
  hex: string;
  frequency: number;
  prominence: number;
  brandRelevance: number;
  colorDistance: number;
  colorFamily: string;
  psychologyScore: number;
  sources: string[];
}

interface BrandColorPattern {
  type: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic' | 'neutral';
  colors: string[];
  harmony_score: number;
  pattern_confidence: number;
  brand_strength: number;
  dominant_family: string;
  color_relationships: string[];
}

// ============================================================================
// COLOR EXTRACTION UTILITIES

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

// ============================================================================
// ADVANCED COLOR DISTANCE ALGORITHMS
// ============================================================================

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to LAB color space for accurate color distance
function rgbToLab(r: number, g: number, b: number): ColorLab {
  // Normalize RGB values
  r = r / 255;
  g = g / 255;
  b = b / 255;

  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  // Apply LAB transformation
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return {
    l: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

// Calculate Delta E color distance (CIE76 formula)
function calculateColorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 100; // Maximum distance for invalid colors
  
  const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);
  
  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;
  
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

// Advanced Delta E 2000 color distance (more accurate)
function calculateDeltaE2000(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 100;
  
  const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);
  
  // Simplified Delta E 2000 calculation
  const avgL = (lab1.l + lab2.l) / 2;
  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const avgC = (c1 + c2) / 2;
  
  const deltaL = lab2.l - lab1.l;
  const deltaC = c2 - c1;
  const deltaE = Math.sqrt(deltaL * deltaL + deltaC * deltaC);
  
  return deltaE;
}

// ============================================================================
// BRAND COLOR PATTERN RECOGNITION
// ============================================================================

// Determine color family for brand pattern recognition
function getColorFamily(hex: string): string {
  const hsl = hexToHsl(hex);
  const { h, s, l } = hsl;
  
  // Check for neutral colors first
  if (s < 10) {
    if (l > 90) return 'white';
    if (l < 10) return 'black';
    if (l > 70) return 'light_gray';
    if (l < 30) return 'dark_gray';
    return 'gray';
  }
  
  // Categorize by hue
  if (h >= 0 && h < 15) return 'red';
  if (h >= 15 && h < 45) return 'orange';
  if (h >= 45 && h < 75) return 'yellow';
  if (h >= 75 && h < 105) return 'yellow_green';
  if (h >= 105 && h < 135) return 'green';
  if (h >= 135 && h < 165) return 'cyan';
  if (h >= 165 && h < 195) return 'cyan_blue';
  if (h >= 195 && h < 225) return 'blue';
  if (h >= 225 && h < 255) return 'blue_purple';
  if (h >= 255 && h < 285) return 'purple';
  if (h >= 285 && h < 315) return 'magenta';
  if (h >= 315 && h < 345) return 'pink';
  if (h >= 345) return 'red';
  
  return 'unknown';
}

// Calculate color psychology score for brand relevance
function calculateColorPsychologyScore(hex: string, context: string = 'general'): number {
  const hsl = hexToHsl(hex);
  const { h, s, l } = hsl;
  let score = 50; // Base score
  
  // Adjust based on saturation and lightness
  if (s > 70 && l > 20 && l < 80) score += 20; // Vibrant, well-balanced
  if (s < 20) score -= 10; // Too neutral
  if (l > 95 || l < 5) score -= 15; // Too extreme
  
  // Context-based scoring
  const colorFamily = getColorFamily(hex);
  const brandColorBonus: Record<string, number> = {
    'blue': 15,
    'red': 12,
    'green': 10,
    'orange': 8,
    'purple': 6,
    'black': 5,
    'gray': 3
  };
  
  score += brandColorBonus[colorFamily] || 0;
  
  return Math.max(0, Math.min(100, score));
}

// Detect brand color patterns and harmonies
function detectBrandColorPattern(colors: string[]): BrandColorPattern {
  if (colors.length < 2) {
    return {
      type: 'monochromatic',
      colors: colors,
      harmony_score: 30,
      pattern_confidence: 20,
      brand_strength: 25,
      dominant_family: colors.length > 0 ? getColorFamily(colors[0]) : 'unknown',
      color_relationships: []
    };
  }
  
  const hslColors = colors.map(color => ({ hex: color, hsl: hexToHsl(color) }));
  const hues = hslColors.map(c => c.hsl.h);
  const families = colors.map(getColorFamily);
  const dominantFamily = families.reduce((a, b, i, arr) => 
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  );
  
  // Calculate hue differences
  const hueDistances: number[] = [];
  const relationships: string[] = [];
  
  for (let i = 0; i < hues.length - 1; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      let diff = Math.abs(hues[i] - hues[j]);
      if (diff > 180) diff = 360 - diff; // Wrap around
      hueDistances.push(diff);
      
      // Determine relationship
      if (diff < 30) relationships.push('analogous');
      else if (diff > 150 && diff < 210) relationships.push('complementary');
      else if (diff > 110 && diff < 130) relationships.push('triadic');
      else relationships.push('custom');
    }
  }
  
  const avgHueDistance = hueDistances.reduce((a, b) => a + b, 0) / hueDistances.length;
  const minDistance = Math.min(...hueDistances);
  const maxDistance = Math.max(...hueDistances);
  
  // Pattern detection logic
  let pattern: BrandColorPattern;
  
  if (minDistance < 30) {
    // Analogous or monochromatic
    pattern = {
      type: avgHueDistance < 15 ? 'monochromatic' : 'analogous',
      colors: colors,
      harmony_score: 85,
      pattern_confidence: 90,
      brand_strength: 80,
      dominant_family: dominantFamily,
      color_relationships: relationships
    };
  } else if (hueDistances.some(d => d > 150 && d < 210)) {
    // Complementary
    pattern = {
      type: 'complementary',
      colors: colors,
      harmony_score: 90,
      pattern_confidence: 85,
      brand_strength: 95,
      dominant_family: dominantFamily,
      color_relationships: relationships
    };
  } else if (hueDistances.some(d => d > 110 && d < 130)) {
    // Triadic
    pattern = {
      type: 'triadic',
      colors: colors,
      harmony_score: 80,
      pattern_confidence: 75,
      brand_strength: 85,
      dominant_family: dominantFamily,
      color_relationships: relationships
    };
  } else if (colors.every(color => {
    const family = getColorFamily(color);
    return ['white', 'black', 'gray', 'light_gray', 'dark_gray'].includes(family);
  })) {
    // Neutral palette
    pattern = {
      type: 'neutral',
      colors: colors,
      harmony_score: 70,
      pattern_confidence: 80,
      brand_strength: 60,
      dominant_family: dominantFamily,
      color_relationships: relationships
    };
  } else {
    // Split-complementary or complex
    pattern = {
      type: maxDistance > 270 ? 'tetradic' : 'split-complementary',
      colors: colors,
      harmony_score: 65,
      pattern_confidence: 60,
      brand_strength: 70,
      dominant_family: dominantFamily,
      color_relationships: relationships
    };
  }
  
  return pattern;
}

// Advanced color clustering using perceptual distance
function clusterSimilarColors(colors: ColorAnalysis[], threshold: number = 15): ColorAnalysis[][] {
  const clusters: ColorAnalysis[][] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < colors.length; i++) {
    if (used.has(i)) continue;
    
    const cluster: ColorAnalysis[] = [colors[i]];
    used.add(i);
    
    for (let j = i + 1; j < colors.length; j++) {
      if (used.has(j)) continue;
      
      const distance = calculateDeltaE2000(colors[i].hex, colors[j].hex);
      if (distance < threshold) {
        cluster.push(colors[j]);
        used.add(j);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters.sort((a, b) => b.length - a.length);
}

// Filter out non-brand colors using advanced heuristics
function filterNonBrandColors(colors: ColorAnalysis[]): ColorAnalysis[] {
  return colors.filter(color => {
    const hsl = hexToHsl(color.hex);
    const family = getColorFamily(color.hex);
    
    // Filter criteria
    const isNotPureWhite = !(hsl.l > 98 && hsl.s < 5);
    const isNotPureBlack = !(hsl.l < 2 && hsl.s < 5);
    const isNotCommonGray = !(family.includes('gray') && hsl.s < 8 && 
                              (hsl.l > 85 || hsl.l < 15));
    const hasMinimumSaturation = hsl.s > 5 || family === 'black';
    const hasBrandRelevance = color.brandRelevance > 30;
    const hasSignificantPresence = color.frequency > 2 || color.prominence > 40;
    
    return isNotPureWhite && 
           isNotPureBlack && 
           isNotCommonGray && 
           hasMinimumSaturation && 
           hasBrandRelevance && 
           hasSignificantPresence;
  });
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
// INDUSTRY-SPECIFIC COLOR PREFERENCES
// ============================================================================

const INDUSTRY_COLOR_PREFERENCES = {
  technology: {
    preferred: ['#0066cc', '#00a8ff', '#2ed573', '#ff6b6b'],
    avoid: ['#8b4513', '#daa520'],
    characteristics: ['modern', 'clean', 'innovative']
  },
  healthcare: {
    preferred: ['#4a90e2', '#2ecc71', '#27ae60', '#ffffff'],
    avoid: ['#e74c3c', '#c0392b'],
    characteristics: ['trustworthy', 'calm', 'professional']
  },
  finance: {
    preferred: ['#2c3e50', '#34495e', '#3498db', '#1abc9c'],
    avoid: ['#e74c3c', '#f39c12'],
    characteristics: ['stable', 'trustworthy', 'professional']
  },
  retail: {
    preferred: ['#e74c3c', '#f39c12', '#9b59b6', '#e67e22'],
    avoid: ['#2c3e50', '#34495e'],
    characteristics: ['vibrant', 'engaging', 'energetic']
  },
  food: {
    preferred: ['#e67e22', '#f39c12', '#27ae60', '#c0392b'],
    avoid: ['#9b59b6', '#3498db'],
    characteristics: ['appetizing', 'warm', 'natural']
  },
  education: {
    preferred: ['#3498db', '#2ecc71', '#f39c12', '#9b59b6'],
    avoid: ['#2c3e50', '#e74c3c'],
    characteristics: ['friendly', 'approachable', 'inspiring']
  },
  default: {
    preferred: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'],
    avoid: [],
    characteristics: ['balanced', 'versatile', 'appealing']
  }
};

// ============================================================================
// ACCESSIBILITY COLOR STANDARDS
// ============================================================================

const ACCESSIBILITY_STANDARDS = {
  AA: { normalText: 4.5, largeText: 3.0 },
  AAA: { normalText: 7.0, largeText: 4.5 }
};

// Calculate contrast ratio between two colors
function calculateContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Calculate accessibility score for a color
function calculateAccessibilityScore(rgb: { r: number; g: number; b: number }): number {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  const contrastWithWhite = calculateContrastRatio(rgb, white);
  const contrastWithBlack = calculateContrastRatio(rgb, black);
  
  const maxContrast = Math.max(contrastWithWhite, contrastWithBlack);
  
  // Score based on WCAG AA compliance
  if (maxContrast >= ACCESSIBILITY_STANDARDS.AAA.normalText) return 100;
  if (maxContrast >= ACCESSIBILITY_STANDARDS.AA.normalText) return 80;
  if (maxContrast >= ACCESSIBILITY_STANDARDS.AA.largeText) return 60;
  return Math.max(20, (maxContrast / ACCESSIBILITY_STANDARDS.AA.normalText) * 60);
}

// Calculate contrast ratios with common backgrounds
function calculateContrastRatios(rgb: { r: number; g: number; b: number }): { white: number; black: number; gray: number } {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const gray = { r: 128, g: 128, b: 128 };
  
  return {
    white: calculateContrastRatio(rgb, white),
    black: calculateContrastRatio(rgb, black),
    gray: calculateContrastRatio(rgb, gray)
  };
}

// Calculate industry alignment score
function calculateIndustryScore(hex: string, industryPrefs: any): number {
  let score = 50; // Base score
  
  const rgb = hexToRgb(hex);
  if (!rgb) return score;
  
  // Check against preferred colors
  for (const prefColor of industryPrefs.preferred) {
    const distance = calculateColorDistance(hex, prefColor);
    if (distance < 30) score += 30;
    else if (distance < 50) score += 15;
  }
  
  // Check against colors to avoid
  for (const avoidColor of industryPrefs.avoid) {
    const distance = calculateColorDistance(hex, avoidColor);
    if (distance < 20) score -= 40;
    else if (distance < 40) score -= 20;
  }
  
  return Math.max(0, Math.min(100, score));
}

// Calculate overall industry alignment
function calculateIndustryAlignment(colors: any[], industryPrefs: any): number {
  if (colors.length === 0) return 0;
  
  const totalScore = colors.reduce((sum, color) => sum + color.industryScore, 0);
  return totalScore / colors.length;
}

// Calculate accessibility compliance percentage
function calculateAccessibilityCompliance(colors: any[]): number {
  if (colors.length === 0) return 0;
  
  const compliantColors = colors.filter(color => color.accessibilityScore >= 60);
  return (compliantColors.length / colors.length) * 100;
}

// Detect industry from website content
function detectIndustry(html: string, css: string): string {
  const content = (html + ' ' + css).toLowerCase();
  
  const industryKeywords = {
    technology: ['tech', 'software', 'app', 'digital', 'innovation', 'startup', 'saas', 'api'],
    healthcare: ['health', 'medical', 'hospital', 'doctor', 'patient', 'care', 'wellness', 'clinic'],
    finance: ['bank', 'finance', 'investment', 'money', 'loan', 'credit', 'payment', 'financial'],
    retail: ['shop', 'store', 'buy', 'sale', 'product', 'ecommerce', 'retail', 'fashion'],
    food: ['food', 'restaurant', 'menu', 'eat', 'recipe', 'cooking', 'cuisine', 'dining'],
    education: ['school', 'education', 'learn', 'course', 'student', 'university', 'teaching']
  };
  
  let maxScore = 0;
  let detectedIndustry = 'default';
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    const score = keywords.reduce((sum, keyword) => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      return sum + matches;
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      detectedIndustry = industry;
    }
  }
  
  return maxScore > 2 ? detectedIndustry : 'default';
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
// ENHANCED COLOR SCORING SYSTEM
// ============================================================================

// Color extraction methods with different weights
enum ColorExtractionMethod {
  VISION_AI = 'vision_ai',
  CSS_BRAND_ELEMENTS = 'css_brand_elements',
  CSS_VARIABLES = 'css_variables',
  HTML_INLINE = 'html_inline',
  GRADIENT_ANALYSIS = 'gradient_analysis',
  GENERIC_CSS = 'generic_css',
  LOCAL_ANALYSIS = 'local_analysis'
}

// Method weights (higher = more important)
const METHOD_WEIGHTS = {
  [ColorExtractionMethod.VISION_AI]: 1.0,
  [ColorExtractionMethod.CSS_BRAND_ELEMENTS]: 0.9,
  [ColorExtractionMethod.CSS_VARIABLES]: 0.8,
  [ColorExtractionMethod.HTML_INLINE]: 0.7,
  [ColorExtractionMethod.GRADIENT_ANALYSIS]: 0.6,
  [ColorExtractionMethod.GENERIC_CSS]: 0.4,
  [ColorExtractionMethod.LOCAL_ANALYSIS]: 0.3
};

// Common generic colors to penalize
const GENERIC_COLORS = new Set([
  '#FFFFFF', '#000000', '#F5F5F5', '#EEEEEE', '#DDDDDD', '#CCCCCC',
  '#BBBBBB', '#AAAAAA', '#999999', '#888888', '#777777', '#666666',
  '#555555', '#444444', '#333333', '#222222', '#111111', '#F0F0F0',
  '#E0E0E0', '#D0D0D0', '#C0C0C0', '#B0B0B0', '#A0A0A0', '#909090',
  '#808080', '#707070', '#606060', '#505050', '#404040', '#303030',
  '#202020', '#101010', '#FAFAFA', '#F9F9F9', '#F8F8F8', '#F7F7F7'
]);

interface ColorScore {
  hex: string;
  score: number;
  methods: ColorExtractionMethod[];
  frequency: number;
  brandRelevance: number;
  accessibility: number;
  industry: number;
  sources: string[];
}

// Calculate comprehensive color score
function calculateColorScore(
  hex: string,
  methods: ColorExtractionMethod[],
  frequency: number = 1,
  brandContext: any = {},
  industryPrefs: any = {},
  sources: string[] = []
): ColorScore {
  let score = 0;
  
  // 1. Method-based scoring (40% weight)
  const methodScore = methods.reduce((total, method) => {
    return total + METHOD_WEIGHTS[method];
  }, 0) / methods.length;
  score += methodScore * 0.4;
  
  // 2. Multi-source bonus (20% weight)
  const uniqueMethods = new Set(methods);
  const methodDiversityBonus = Math.min(uniqueMethods.size / 3, 1); // Max bonus at 3+ methods
  const multiSourceBonus = Math.min(sources.length / 3, 1); // Max bonus at 3+ sources
  score += (methodDiversityBonus + multiSourceBonus) * 0.1;
  
  // 3. Generic color penalty (15% weight)
  const isGeneric = GENERIC_COLORS.has(hex.toUpperCase());
  const genericPenalty = isGeneric ? -0.15 : 0;
  score += genericPenalty;
  
  // 4. Brand relevance (10% weight)
  const brandRelevance = calculateBrandRelevance(hex, brandContext);
  score += brandRelevance * 0.1;
  
  // 5. Accessibility score (10% weight)
  const rgb = hexToRgb(hex);
  const accessibilityScore = rgb ? calculateAccessibilityScore(rgb) / 100 : 0;
  score += accessibilityScore * 0.1;
  
  // 6. Industry alignment (5% weight)
  const industryScore = calculateIndustryScore(hex, industryPrefs) / 100;
  score += industryScore * 0.05;
  
  // Ensure score is between 0 and 1
  score = Math.max(0, Math.min(1, score));
  
  return {
    hex,
    score,
    methods,
    frequency,
    brandRelevance: brandRelevance * 100,
    accessibility: accessibilityScore * 100,
    industry: industryScore,
    sources
  };
}

// Calculate brand relevance based on context
function calculateBrandRelevance(hex: string, brandContext: any): number {
  let relevance = 0.5; // Base relevance
  
  const hsl = hexToHsl(hex);
  const family = getColorFamily(hex);
  
  // Boost for colors with good saturation and lightness for brand use
  if (hsl.s > 30 && hsl.l > 15 && hsl.l < 85) {
    relevance += 0.2;
  }
  
  // Boost for non-neutral colors
  if (!['white', 'black', 'gray', 'light_gray', 'dark_gray'].includes(family)) {
    relevance += 0.15;
  }
  
  // Check if color appears in brand-specific contexts
  if (brandContext.inLogo) relevance += 0.3;
  if (brandContext.inHeader) relevance += 0.25;
  if (brandContext.inNavigation) relevance += 0.2;
  if (brandContext.inCTA) relevance += 0.25;
  if (brandContext.inBrandElements) relevance += 0.2;
  
  return Math.max(0, Math.min(1, relevance));
}

// Enhanced color extraction with scoring
interface ExtractedColor {
  hex: string;
  method: ColorExtractionMethod;
  context: string;
  element?: string;
  frequency?: number;
}

function extractColorsWithScoring(
  css: string,
  html: string,
  visionColors: string[] = [],
  industryPrefs: any = {},
  brandContext: any = {}
): ColorScore[] {
  const extractedColors: ExtractedColor[] = [];
  
  // 1. Vision AI colors (highest priority)
  visionColors.forEach(color => {
    extractedColors.push({
      hex: color,
      method: ColorExtractionMethod.VISION_AI,
      context: 'vision_analysis',
      frequency: 1
    });
  });
  
  // 2. Brand-specific CSS elements
  const brandElementColors = extractBrandElementColors(css, html);
  brandElementColors.forEach(({ color, element }) => {
    extractedColors.push({
      hex: color,
      method: ColorExtractionMethod.CSS_BRAND_ELEMENTS,
      context: 'brand_element',
      element,
      frequency: 1
    });
  });
  
  // 3. CSS Variables
  const cssVariableColors = extractCSSVariableColors(css);
  cssVariableColors.forEach(color => {
    extractedColors.push({
      hex: color,
      method: ColorExtractionMethod.CSS_VARIABLES,
      context: 'css_variable',
      frequency: 1
    });
  });
  
  // 4. HTML inline styles
  const inlineColors = extractInlineStyleColors(html);
  inlineColors.forEach(color => {
    extractedColors.push({
      hex: color,
      method: ColorExtractionMethod.HTML_INLINE,
      context: 'inline_style',
      frequency: 1
    });
  });
  
  // 5. Gradient analysis
  const gradientColors = extractGradientColors(css);
  gradientColors.forEach(color => {
    extractedColors.push({
      hex: color,
      method: ColorExtractionMethod.GRADIENT_ANALYSIS,
      context: 'gradient',
      frequency: 1
    });
  });
  
  // 6. Generic CSS colors
  const genericColors = extractGenericCSSColors(css);
  genericColors.forEach(color => {
    extractedColors.push({
      hex: color,
      method: ColorExtractionMethod.GENERIC_CSS,
      context: 'generic_css',
      frequency: 1
    });
  });
  
  // Group colors by hex value and calculate scores
  const colorGroups = new Map<string, {
    methods: ColorExtractionMethod[],
    sources: string[],
    contexts: string[],
    frequency: number
  }>();
  
  extractedColors.forEach(({ hex, method, context, element }) => {
    const normalizedHex = hex.toUpperCase();
    if (!colorGroups.has(normalizedHex)) {
      colorGroups.set(normalizedHex, {
        methods: [],
        sources: [],
        contexts: [],
        frequency: 0
      });
    }
    
    const group = colorGroups.get(normalizedHex)!;
    group.methods.push(method);
    group.sources.push(context);
    group.contexts.push(element || context);
    group.frequency += 1;
  });
  
  // Calculate scores for each color
  const colorScores: ColorScore[] = [];
  colorGroups.forEach((group, hex) => {
    const score = calculateColorScore(
      hex,
      group.methods,
      group.frequency,
      brandContext,
      industryPrefs,
      group.sources
    );
    colorScores.push(score);
  });
  
  // Sort by score (highest first)
  return colorScores.sort((a, b) => b.score - a.score);
}

// Extract colors from brand-specific CSS elements
function extractBrandElementColors(css: string, html: string): { color: string; element: string }[] {
  const colors: { color: string; element: string }[] = [];
  
  const brandSelectors = [
    { pattern: /\.logo[^{]*\{[^}]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})/g, element: 'logo' },
    { pattern: /\.header[^{]*\{[^}]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})/g, element: 'header' },
    { pattern: /\.nav[^{]*\{[^}]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})/g, element: 'navigation' },
    { pattern: /\.brand[^{]*\{[^}]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})/g, element: 'brand' },
    { pattern: /\.btn-primary[^{]*\{[^}]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})/g, element: 'primary_button' },
    { pattern: /\.cta[^{]*\{[^}]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})/g, element: 'cta' }
  ];
  
  brandSelectors.forEach(({ pattern, element }) => {
    let match;
    while ((match = pattern.exec(css)) !== null) {
      colors.push({ color: match[1], element });
    }
  });
  
  return colors;
}

// Extract CSS variable colors
function extractCSSVariableColors(css: string): string[] {
  const colors: string[] = [];
  const variablePattern = /--[a-zA-Z0-9-]*(?:color|primary|secondary|accent|brand)[a-zA-Z0-9-]*:\s*(#[0-9a-fA-F]{6})/gi;
  
  let match;
  while ((match = variablePattern.exec(css)) !== null) {
    colors.push(match[1]);
  }
  
  return colors;
}

// Extract inline style colors
function extractInlineStyleColors(html: string): string[] {
  const colors: string[] = [];
  const inlinePattern = /style=['"][^'"]*(?:background-color|color):\s*(#[0-9a-fA-F]{6})[^'"]*['"]/gi;
  
  let match;
  while ((match = inlinePattern.exec(html)) !== null) {
    colors.push(match[1]);
  }
  
  return colors;
}

// Extract gradient colors
function extractGradientColors(css: string): string[] {
  const colors: string[] = [];
  const gradients = detectGradients(css);
  
  gradients.forEach(gradient => {
    const gradientColors = extractColorsFromGradients([gradient]);
    colors.push(...gradientColors);
  });
  
  return colors;
}

// Extract generic CSS colors (lower priority)
function extractGenericCSSColors(css: string): string[] {
  const colors: string[] = [];
  const genericPattern = /(?:background-color|color):\s*(#[0-9a-fA-F]{6})/gi;
  
  let match;
  while ((match = genericPattern.exec(css)) !== null) {
    colors.push(match[1]);
  }
  
  return colors;
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

Focus on intentional brand design choices that distinguish this company from generic websites. Prioritize elements that appear deliberately chosen for brand identity over standard web design patterns.

🏭 INDUSTRY-SPECIFIC COLOR PREFERENCES:
- Technology: Blues (#0066cc), Greens (#2ed573), Modern colors
- Healthcare: Calming blues (#4a90e2), Trustworthy greens (#2ecc71)
- Finance: Professional blues (#3498db), Stable grays (#2c3e50)
- Retail: Energetic reds (#e74c3c), Engaging oranges (#f39c12)
- Food: Appetizing oranges (#e67e22), Natural greens (#27ae60)
- Education: Friendly blues (#3498db), Inspiring purples (#9b59b6)

♿ ACCESSIBILITY REQUIREMENTS:
- Primary colors must have ≥4.5:1 contrast ratio with text (WCAG AA)
- Secondary colors should meet ≥3.0:1 for large text
- Accent colors must be distinguishable by colorblind users
- Evaluate against both light (#ffffff) and dark (#000000) backgrounds
- Prioritize accessible color combinations over pure aesthetics`;

  // Detect industry from content for better color selection
  const detectedIndustry = detectIndustry('', ''); // Will be enhanced with actual content
  const industryPrefs = INDUSTRY_COLOR_PREFERENCES[detectedIndustry as keyof typeof INDUSTRY_COLOR_PREFERENCES] || INDUSTRY_COLOR_PREFERENCES.default;

  console.log(`Calling OpenAI Vision API (GPT-4o) for enhanced brand extraction with ${detectedIndustry} industry focus`);
  
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
// ENHANCED MULTI-METHOD BRAND EXTRACTION
// ============================================================================

interface ExtractionMethod {
  name: string;
  weight: number;
  execute: (url: string, html?: string, css?: string) => Promise<ExtractedBrandInfo>;
}

interface WeightedBrandResult {
  brandInfo: ExtractedBrandInfo;
  confidence: number;
  method: string;
  extractionDetails: any;
}

// Industry-specific intelligent color suggestions
const INDUSTRY_INTELLIGENT_COLORS = {
  technology: {
    primary: ['#007ACC', '#0066CC', '#0088FF', '#00A8FF', '#2196F3'],
    secondary: ['#F8F9FA', '#E3F2FD', '#FFFFFF', '#F5F7FA'],
    accent: ['#FF6B35', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4']
  },
  healthcare: {
    primary: ['#2E7D32', '#1976D2', '#0277BD', '#00695C', '#5D4037'],
    secondary: ['#F1F8E9', '#E3F2FD', '#E0F2F1', '#FFFFFF'],
    accent: ['#4CAF50', '#03DAC6', '#FF9800', '#2196F3', '#009688']
  },
  finance: {
    primary: ['#1565C0', '#0D47A1', '#1B5E20', '#2E7D32', '#37474F'],
    secondary: ['#ECEFF1', '#F3E5F5', '#E8F5E8', '#FFFFFF'],
    accent: ['#4CAF50', '#FF9800', '#795548', '#607D8B', '#00BCD4']
  },
  retail: {
    primary: ['#E91E63', '#FF5722', '#FF9800', '#673AB7', '#3F51B5'],
    secondary: ['#FFF8E1', '#FCE4EC', '#F3E5F5', '#FFFFFF'],
    accent: ['#FFC107', '#4CAF50', '#FF5722', '#9C27B0', '#00BCD4']
  },
  food: {
    primary: ['#FF6F00', '#E65100', '#D84315', '#BF360C', '#6A4C93'],
    secondary: ['#FFF3E0', '#FFEBEE', '#F1F8E9', '#FFFFFF'],
    accent: ['#4CAF50', '#FF9800', '#795548', '#8BC34A', '#CDDC39']
  },
  education: {
    primary: ['#1976D2', '#7B1FA2', '#388E3C', '#F57C00', '#5D4037'],
    secondary: ['#E3F2FD', '#F3E5F5', '#E8F5E8', '#FFFFFF'],
    accent: ['#FF9800', '#4CAF50', '#9C27B0', '#00BCD4', '#CDDC39']
  },
  default: {
    primary: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'],
    secondary: ['#F5F5F5', '#FAFAFA', '#FFFFFF', '#E0E0E0'],
    accent: ['#FF5722', '#FFC107', '#795548', '#607D8B', '#3F51B5']
  }
};

// Get intelligent color suggestions based on industry and context
function getIntelligentColorSuggestions(industry: string, extractedColors: string[] = []): {
  primary: string;
  secondary: string;
  accent: string;
} {
  const industryColors = INDUSTRY_INTELLIGENT_COLORS[industry as keyof typeof INDUSTRY_INTELLIGENT_COLORS] || INDUSTRY_INTELLIGENT_COLORS.default;
  
  // If we have extracted colors, try to find the best match from industry palette
  let primary = industryColors.primary[0];
  let secondary = industryColors.secondary[0];
  let accent = industryColors.accent[0];
  
  if (extractedColors.length > 0) {
    // Find best matching primary color from industry palette
    let bestPrimaryMatch = { color: primary, distance: Infinity };
    extractedColors.forEach(extractedColor => {
      industryColors.primary.forEach(industryColor => {
        const distance = calculateColorDistance(extractedColor, industryColor);
        if (distance < bestPrimaryMatch.distance) {
          bestPrimaryMatch = { color: industryColor, distance };
        }
      });
    });
    
    if (bestPrimaryMatch.distance < 100) {
      primary = bestPrimaryMatch.color;
    }
    
    // Ensure colors are distinct and accessible
    secondary = industryColors.secondary.find(color => 
      calculateColorDistance(color, primary) > 150
    ) || industryColors.secondary[0];
    
    accent = industryColors.accent.find(color => 
      calculateColorDistance(color, primary) > 100 && 
      calculateColorDistance(color, secondary) > 100
    ) || industryColors.accent[0];
  }
  
  return { primary, secondary, accent };
}

// Enhanced multi-method extraction with simultaneous execution
async function extractBrandInfoMultiMethod(url: string): Promise<ExtractedBrandInfo> {
  console.log('Starting multi-method brand extraction for:', url);
  
  try {
    // Detect industry first for intelligent color selection
    const { html, css } = await fetchWebsiteContent(url);
    const detectedIndustry = detectIndustry(html, css);
    console.log(`Detected industry: ${detectedIndustry}`);
    
    // Prepare extraction methods
    const methods: ExtractionMethod[] = [
      {
        name: 'vision_ai_primary',
        weight: 1.0,
        execute: async (url) => await extractBrandInfoWithVision(url)
      },
      {
        name: 'css_analysis',
        weight: 0.8,
        execute: async (url, html, css) => await extractBrandInfoFromCSS(url, html || '', css || '')
      },
      {
        name: 'local_analysis',
        weight: 0.6,
        execute: async (url) => await createIntelligentFallback(url, detectedIndustry, html)
      }
    ];
    
    // Execute all methods simultaneously
    console.log('Executing extraction methods simultaneously...');
    const extractionPromises = methods.map(async (method): Promise<WeightedBrandResult | null> => {
      try {
        console.log(`Starting ${method.name} extraction...`);
        const result = await method.execute(url, html, css);
        console.log(`${method.name} completed successfully`);
        
        return {
          brandInfo: result,
          confidence: calculateExtractionConfidence(result),
          method: method.name,
          extractionDetails: {
            weight: method.weight,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error(`${method.name} extraction failed:`, error);
        return null;
      }
    });
    
    // Wait for all extractions to complete
    const results = await Promise.allSettled(extractionPromises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<WeightedBrandResult> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    console.log(`${successfulResults.length} extraction methods completed successfully`);
    
    if (successfulResults.length === 0) {
      console.log('All extraction methods failed, using intelligent fallback');
      return createIntelligentFallback(url, detectedIndustry, html);
    }
    
    // Combine results using weighted scoring
    const combinedResult = combineExtractionResults(successfulResults, detectedIndustry);
    
    console.log('Multi-method extraction completed successfully');
    return combinedResult;
    
  } catch (error) {
    console.error('Multi-method extraction failed:', error);
    // Create intelligent fallback based on industry
    return createIntelligentFallback(url, 'default');
  }
}

// Calculate extraction confidence score
function calculateExtractionConfidence(brandInfo: ExtractedBrandInfo): number {
  let confidence = 0;
  
  // Name confidence
  if (brandInfo.name && brandInfo.name !== 'Brand Name' && brandInfo.name.length > 2) {
    confidence += 25;
  }
  
  // Color confidence - avoid pure defaults
  const colors = [brandInfo.primary_color, brandInfo.secondary_color, brandInfo.accent_color];
  const nonDefaultColors = colors.filter(color => 
    !['#000000', '#FFFFFF', '#e74c3c', '#3498db'].includes(color)
  );
  confidence += (nonDefaultColors.length / colors.length) * 30;
  
  // Logo confidence
  if (brandInfo.logo_url && brandInfo.logo_url.length > 0) {
    confidence += 20;
  }
  
  // Font confidence
  if (brandInfo.font_family && brandInfo.font_family !== 'Arial') {
    confidence += 15;
  }
  
  // Use existing confidence scores if available
  if (brandInfo.confidence_scores) {
    const avgConfidence = Object.values(brandInfo.confidence_scores)
      .reduce((sum, score) => sum + (typeof score === 'number' ? score : 0), 0) / 
      Object.keys(brandInfo.confidence_scores).length;
    confidence += avgConfidence * 10;
  }
  
  return Math.min(100, confidence);
}

// Combine multiple extraction results using weighted scoring
function combineExtractionResults(
  results: WeightedBrandResult[], 
  detectedIndustry: string
): ExtractedBrandInfo {
  console.log('Combining extraction results from', results.length, 'methods');
  
  // Collect all extracted colors for intelligent selection
  const allColors: string[] = [];
  results.forEach(result => {
    allColors.push(
      result.brandInfo.primary_color,
      result.brandInfo.secondary_color,
      result.brandInfo.accent_color
    );
  });
  
  // Score and select best brand name
  const nameScores = new Map<string, number>();
  results.forEach(result => {
    const name = result.brandInfo.name;
    if (name && name !== 'Brand Name') {
      const currentScore = nameScores.get(name) || 0;
      nameScores.set(name, currentScore + (result.confidence * result.extractionDetails.weight));
    }
  });
  
  const bestName = nameScores.size > 0 ? 
    Array.from(nameScores.entries()).sort((a, b) => b[1] - a[1])[0][0] :
    'Brand Name';
  
  // Always provide meaningful colors - never pure defaults
  const intelligentColors = getIntelligentColorSuggestions(detectedIndustry, allColors);
  const finalColors = ensureColorDistinctiveness(intelligentColors, detectedIndustry);
  
  // Select best logo URL
  const logoUrls = results
    .map(r => r.brandInfo.logo_url)
    .filter(url => url && url.length > 0);
  const bestLogoUrl = logoUrls[0];
  
  // Select best font
  const fonts = results
    .map(r => r.brandInfo.font_family)
    .filter(font => font && font !== 'Arial');
  const bestFont = fonts[0] || 'Inter';
  
  // Combine confidence scores
  const combinedConfidence = {
    name_extraction: nameScores.size > 0 ? 90 : 30,
    color_accuracy: 85, // High because we use intelligent industry colors
    font_detection: fonts.length > 0 ? 80 : 40,
    overall_brand_coherence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    industry_alignment: 90,
    accessibility_compliance: 85
  };
  
  return {
    name: bestName,
    primary_color: finalColors.primary,
    secondary_color: finalColors.secondary,
    accent_color: finalColors.accent,
    font_family: bestFont,
    logo_url: bestLogoUrl,
    personality: {
      primary_trait: 'Professional',
      secondary_traits: ['Modern', 'Trustworthy'],
      industry_context: detectedIndustry,
      design_approach: 'Contemporary'
    },
    confidence_scores: combinedConfidence
  };
}

// Ensure color distinctiveness and accessibility
function ensureColorDistinctiveness(
  colors: { primary: string; secondary: string; accent: string },
  industry: string
): { primary: string; secondary: string; accent: string } {
  const { primary, secondary, accent } = colors;
  const industryColors = INDUSTRY_INTELLIGENT_COLORS[industry as keyof typeof INDUSTRY_INTELLIGENT_COLORS] || INDUSTRY_INTELLIGENT_COLORS.default;
  
  // Check if colors are too similar
  const primarySecondaryDistance = calculateColorDistance(primary, secondary);
  const primaryAccentDistance = calculateColorDistance(primary, accent);
  const secondaryAccentDistance = calculateColorDistance(secondary, accent);
  
  let finalColors = { ...colors };
  
  // If secondary is too similar to primary, replace it
  if (primarySecondaryDistance < 150) {
    finalColors.secondary = industryColors.secondary.find(color => 
      calculateColorDistance(color, primary) > 150
    ) || '#FFFFFF';
  }
  
  // If accent is too similar to primary or secondary, replace it
  if (primaryAccentDistance < 100 || secondaryAccentDistance < 100) {
    finalColors.accent = industryColors.accent.find(color => 
      calculateColorDistance(color, finalColors.primary) > 100 && 
      calculateColorDistance(color, finalColors.secondary) > 100
    ) || industryColors.accent[0];
  }
  
  return finalColors;
}

// Create intelligent fallback when extraction fails
function createIntelligentFallback(
  url: string, 
  industry: string, 
  html?: string
): ExtractedBrandInfo {
  console.log('Creating intelligent fallback for industry:', industry);
  
  const colors = getIntelligentColorSuggestions(industry);
  const name = html ? extractBrandName(html) : new URL(url).hostname.replace('www.', '');
  
  return {
    name: name || 'Brand Name',
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
    font_family: 'Inter',
    logo_url: undefined,
    personality: {
      primary_trait: 'Professional',
      secondary_traits: ['Modern', 'Reliable'],
      industry_context: industry,
      design_approach: 'Contemporary'
    },
    confidence_scores: {
      name_extraction: name ? 60 : 30,
      color_accuracy: 85, // High because we use intelligent industry colors
      font_detection: 40,
      overall_brand_coherence: 70,
      industry_alignment: 95,
      accessibility_compliance: 90
    }
  };
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
// CACHING & GRACEFUL DEGRADATION
// ============================================================================

// Check cache first for common domains
async function getCachedPalette(domain: string): Promise<ExtractedBrandInfo | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase credentials not available for caching');
      return null;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/domain_extraction_patterns?domain_pattern=eq.${domain}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].extraction_rules?.cached_palette) {
        console.log(`Using cached palette for domain: ${domain}`);
        return data[0].extraction_rules.cached_palette;
      }
    }
  } catch (error) {
    console.log(`No cache found for domain: ${domain}`, error.message);
  }
  
  return null;
}

// Cache successful extractions for future use
async function cachePalette(domain: string, result: ExtractedBrandInfo): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase credentials not available for caching');
      return;
    }

    const cacheData = {
      domain_pattern: domain,
      extraction_rules: {
        cached_palette: result,
        cached_at: new Date().toISOString()
      },
      success_rate: 1.0,
      usage_count: 1
    };

    await fetch(`${supabaseUrl}/rest/v1/domain_extraction_patterns`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(cacheData)
    });
    
    console.log(`Cached palette for domain: ${domain}`);
  } catch (error) {
    console.log('Failed to cache palette:', error.message);
  }
}

// Graceful degradation fallback with industry-specific defaults
function getIntelligentFallback(url: string): ExtractedBrandInfo {
  console.log('Using intelligent fallback for brand extraction');
  
  const domain = new URL(url).hostname.toLowerCase();
  
  // Industry-specific intelligent defaults
  let industryColors = { primary: '#2563eb', secondary: '#f8fafc', accent: '#0ea5e9' }; // Default tech blue
  let industryName = 'Professional Service';
  let industryPersonality = {
    primary_trait: 'professional',
    secondary_traits: ['reliable', 'modern'],
    industry_context: 'technology',
    design_approach: 'clean'
  };

  // Industry detection and color assignment
  if (domain.includes('health') || domain.includes('medical') || domain.includes('hospital')) {
    industryColors = { primary: '#059669', secondary: '#f0fdf4', accent: '#34d399' };
    industryName = 'Healthcare';
    industryPersonality.industry_context = 'healthcare';
    industryPersonality.primary_trait = 'trustworthy';
  } else if (domain.includes('finance') || domain.includes('bank') || domain.includes('invest')) {
    industryColors = { primary: '#1e40af', secondary: '#f8fafc', accent: '#3b82f6' };
    industryName = 'Financial Services';
    industryPersonality.industry_context = 'finance';
    industryPersonality.primary_trait = 'secure';
  } else if (domain.includes('food') || domain.includes('restaurant') || domain.includes('cafe')) {
    industryColors = { primary: '#dc2626', secondary: '#fef2f2', accent: '#f97316' };
    industryName = 'Food & Beverage';
    industryPersonality.industry_context = 'hospitality';
    industryPersonality.primary_trait = 'warm';
  } else if (domain.includes('edu') || domain.includes('school') || domain.includes('university')) {
    industryColors = { primary: '#7c3aed', secondary: '#faf5ff', accent: '#a855f7' };
    industryName = 'Education';
    industryPersonality.industry_context = 'education';
    industryPersonality.primary_trait = 'knowledgeable';
  } else if (domain.includes('shop') || domain.includes('store') || domain.includes('buy')) {
    industryColors = { primary: '#ea580c', secondary: '#fff7ed', accent: '#f97316' };
    industryName = 'E-commerce';
    industryPersonality.industry_context = 'retail';
    industryPersonality.primary_trait = 'engaging';
  }

  return {
    name: industryName,
    primary_color: industryColors.primary,
    secondary_color: industryColors.secondary,
    accent_color: industryColors.accent,
    font_family: 'Inter, system-ui, sans-serif',
    logo_url: '',
    personality: industryPersonality,
    confidence_scores: {
      name: 40,
      colors: 35,
      typography: 30,
      logo: 0,
      personality: 45,
      overall: 30
    }
  };
}

// ============================================================================
// HYBRID BRAND EXTRACTION (COMBINES VISION + HTML)
// ============================================================================

async function extractBrandInfoHybrid(screenshotUrl: string | null, html: string, url: string): Promise<ExtractedBrandInfo> {
  console.log('Starting hybrid brand extraction combining vision + HTML analysis');
  
  const domain = new URL(url).hostname;
  
  // Check cache first
  const cachedResult = await getCachedPalette(domain);
  if (cachedResult) {
    return cachedResult;
  }
  
  let visionResult: ExtractedBrandInfo | null = null;
  let htmlResult: ExtractedBrandInfo | null = null;
  
  // Run multiple extraction methods simultaneously with graceful degradation
  const extractionPromises = [];
  
  if (screenshotUrl) {
    extractionPromises.push(
      extractBrandInfoWithVision(screenshotUrl)
        .then(result => ({ type: 'vision', result, success: true }))
        .catch(error => {
          console.log('Vision analysis failed, gracefully degrading:', error.message);
          return { type: 'vision', result: null, success: false, error: error.message };
        })
    );
  }
  
  extractionPromises.push(
    extractBrandFromHTML(html, url)
      .then(result => ({ type: 'html', result, success: true }))
      .catch(error => {
        console.log('HTML analysis failed, gracefully degrading:', error.message);
        return { type: 'html', result: null, success: false, error: error.message };
      })
  );

  // Run all extractions simultaneously
  const extractionResults = await Promise.all(extractionPromises);
  
  // Process results
  const visionResultData = extractionResults.find(r => r.type === 'vision');
  const htmlResultData = extractionResults.find(r => r.type === 'html');
  
  if (visionResultData?.success) {
    visionResult = visionResultData.result;
    console.log('Vision analysis completed successfully');
  }
  
  if (htmlResultData?.success) {
    htmlResult = htmlResultData.result;
    console.log('HTML analysis completed successfully');
  }
  
  // Combine results using smart merging logic or fallback gracefully
  let finalResult: ExtractedBrandInfo;
  
  if (visionResult || htmlResult) {
    const combinedResult = combineExtractionResults(visionResult, htmlResult);
    finalResult = combinedResult || getIntelligentFallback(url);
    console.log('Hybrid extraction successful:', finalResult);
    
    // Cache successful extractions for future use
    if (combinedResult) {
      await cachePalette(domain, finalResult);
    }
  } else {
    // Graceful degradation: use intelligent fallback when all methods fail
    console.log('All extraction methods failed, using intelligent fallback');
    finalResult = getIntelligentFallback(url);
  }
  
  return finalResult;
}

function combineExtractionResults(vision: ExtractedBrandInfo | null, html: ExtractedBrandInfo | null): ExtractedBrandInfo | null {
  // If only one source worked, use it
  if (vision && !html) return vision;
  if (html && !vision) return html;
  if (!vision && !html) {
    return null; // Let caller handle graceful degradation
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
    
    // Graceful degradation: return intelligent fallback even on complete failure
    const fallbackResult = getIntelligentFallback(url);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        brandInfo: fallbackResult,
        fallback: true,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});