import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, Eye, Palette, Shield } from 'lucide-react';
import type { BrandAsset } from '@/hooks/useBrandAssets';

interface ColorValidationResult {
  contrast: {
    primaryVsWhite: number;
    primaryVsBlack: number;
    secondaryVsWhite: number;
    secondaryVsBlack: number;
    accentVsWhite: number;
    accentVsBlack: number;
    primaryVsSecondary: number;
    primaryVsAccent: number;
    secondaryVsAccent: number;
  };
  accessibility: {
    wcagAA: boolean;
    wcagAAA: boolean;
    colorBlindFriendly: boolean;
    readabilityScore: number;
  };
  distinctiveness: {
    colorSeparation: number;
    brandStrength: number;
    uniqueness: number;
  };
  issues: ValidationIssue[];
  overallScore: number;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'contrast' | 'accessibility' | 'distinctiveness' | 'brand';
  message: string;
  suggestion?: string;
}

interface ColorValidatorProps {
  brandAsset: BrandAsset;
  onValidationComplete?: (result: ColorValidationResult) => void;
}

export const ColorValidator = ({ brandAsset, onValidationComplete }: ColorValidatorProps) => {
  const [validation, setValidation] = useState<ColorValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    validateColors();
  }, [brandAsset.primary_color, brandAsset.secondary_color, brandAsset.accent_color]);

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 0;
    
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const getColorDistance = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 0;
    
    const deltaR = rgb1.r - rgb2.r;
    const deltaG = rgb1.g - rgb2.g;
    const deltaB = rgb1.b - rgb2.b;
    
    return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
  };

  const isColorBlindFriendly = (primary: string, secondary: string, accent: string): boolean => {
    // Check if colors are distinguishable for common color blindness types
    const colors = [primary, secondary, accent];
    const rgbColors = colors.map(hexToRgb).filter(Boolean) as { r: number; g: number; b: number }[];
    
    // Simulate protanopia (red-blind) and deuteranopia (green-blind)
    for (let i = 0; i < rgbColors.length; i++) {
      for (let j = i + 1; j < rgbColors.length; j++) {
        const color1 = rgbColors[i];
        const color2 = rgbColors[j];
        
        // Simplified simulation - check if blue channel difference is sufficient
        const blueDiff = Math.abs(color1.b - color2.b);
        const luminanceDiff = Math.abs(
          getLuminance(color1.r, color1.g, color1.b) - 
          getLuminance(color2.r, color2.g, color2.b)
        );
        
        if (blueDiff < 50 && luminanceDiff < 0.3) {
          return false;
        }
      }
    }
    
    return true;
  };

  const validateColors = async () => {
    setIsValidating(true);
    
    try {
      const { primary_color, secondary_color, accent_color } = brandAsset;
      const issues: ValidationIssue[] = [];
      
      // Calculate contrast ratios
      const contrast = {
        primaryVsWhite: getContrastRatio(primary_color, '#FFFFFF'),
        primaryVsBlack: getContrastRatio(primary_color, '#000000'),
        secondaryVsWhite: getContrastRatio(secondary_color, '#FFFFFF'),
        secondaryVsBlack: getContrastRatio(secondary_color, '#000000'),
        accentVsWhite: getContrastRatio(accent_color, '#FFFFFF'),
        accentVsBlack: getContrastRatio(accent_color, '#000000'),
        primaryVsSecondary: getContrastRatio(primary_color, secondary_color),
        primaryVsAccent: getContrastRatio(primary_color, accent_color),
        secondaryVsAccent: getContrastRatio(secondary_color, accent_color)
      };

      // WCAG Compliance checks
      const wcagAA = (
        Math.max(contrast.primaryVsWhite, contrast.primaryVsBlack) >= 4.5 &&
        Math.max(contrast.secondaryVsWhite, contrast.secondaryVsBlack) >= 4.5 &&
        Math.max(contrast.accentVsWhite, contrast.accentVsBlack) >= 4.5
      );

      const wcagAAA = (
        Math.max(contrast.primaryVsWhite, contrast.primaryVsBlack) >= 7.0 &&
        Math.max(contrast.secondaryVsWhite, contrast.secondaryVsBlack) >= 7.0 &&
        Math.max(contrast.accentVsWhite, contrast.accentVsBlack) >= 7.0
      );

      // Check individual color contrast issues
      if (Math.max(contrast.primaryVsWhite, contrast.primaryVsBlack) < 4.5) {
        issues.push({
          type: 'error',
          category: 'contrast',
          message: 'Primary color fails WCAG AA contrast requirements',
          suggestion: 'Darken or lighten the primary color to improve readability'
        });
      }

      if (Math.max(contrast.secondaryVsWhite, contrast.secondaryVsBlack) < 4.5) {
        issues.push({
          type: 'error',
          category: 'contrast',
          message: 'Secondary color fails WCAG AA contrast requirements',
          suggestion: 'Adjust secondary color for better text contrast'
        });
      }

      if (Math.max(contrast.accentVsWhite, contrast.accentVsBlack) < 4.5) {
        issues.push({
          type: 'error',
          category: 'contrast',
          message: 'Accent color fails WCAG AA contrast requirements',
          suggestion: 'Modify accent color to meet accessibility standards'
        });
      }

      // Color distinctiveness checks
      const colorSeparation = Math.min(
        getColorDistance(primary_color, secondary_color),
        getColorDistance(primary_color, accent_color),
        getColorDistance(secondary_color, accent_color)
      );

      if (colorSeparation < 100) {
        issues.push({
          type: 'warning',
          category: 'distinctiveness',
          message: 'Brand colors are too similar to each other',
          suggestion: 'Increase color separation for better brand distinction'
        });
      }

      // Color blind friendliness
      const colorBlindFriendly = isColorBlindFriendly(primary_color, secondary_color, accent_color);
      
      if (!colorBlindFriendly) {
        issues.push({
          type: 'warning',
          category: 'accessibility',
          message: 'Colors may not be distinguishable for color-blind users',
          suggestion: 'Consider using colors with different brightness levels'
        });
      }

      // Brand strength assessment
      const isGeneric = (color: string) => {
        const genericColors = ['#FFFFFF', '#000000', '#808080', '#C0C0C0', '#F5F5F5'];
        return genericColors.some(generic => getColorDistance(color, generic) < 50);
      };

      const genericCount = [primary_color, secondary_color, accent_color]
        .filter(isGeneric).length;

      if (genericCount > 1) {
        issues.push({
          type: 'warning',
          category: 'brand',
          message: 'Too many generic colors reduce brand memorability',
          suggestion: 'Replace generic colors with more distinctive brand colors'
        });
      }

      // Calculate scores
      const readabilityScore = (
        Math.max(contrast.primaryVsWhite, contrast.primaryVsBlack) +
        Math.max(contrast.secondaryVsWhite, contrast.secondaryVsBlack) +
        Math.max(contrast.accentVsWhite, contrast.accentVsBlack)
      ) / 3;

      const brandStrength = Math.max(0, 100 - (genericCount * 30));
      const uniqueness = Math.min(100, colorSeparation / 2);

      const overallScore = (
        (wcagAA ? 30 : 0) +
        (colorBlindFriendly ? 20 : 0) +
        (brandStrength * 0.25) +
        (uniqueness * 0.25)
      );

      const result: ColorValidationResult = {
        contrast,
        accessibility: {
          wcagAA,
          wcagAAA,
          colorBlindFriendly,
          readabilityScore
        },
        distinctiveness: {
          colorSeparation,
          brandStrength,
          uniqueness
        },
        issues,
        overallScore
      };

      setValidation(result);
      onValidationComplete?.(result);
      
    } catch (error) {
      console.error('Color validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getContrastBadge = (ratio: number) => {
    if (ratio >= 7) return <Badge variant="default" className="bg-green-500">AAA</Badge>;
    if (ratio >= 4.5) return <Badge variant="default" className="bg-blue-500">AA</Badge>;
    if (ratio >= 3) return <Badge variant="secondary">Large Text</Badge>;
    return <Badge variant="destructive">Fail</Badge>;
  };

  if (!validation) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Palette className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isValidating ? 'Validating colors...' : 'Loading validation...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Color Validation Score
          </CardTitle>
          <CardDescription>
            Overall assessment of your brand colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <span className={`text-lg font-bold ${getScoreColor(validation.overallScore)}`}>
                {Math.round(validation.overallScore)}/100
              </span>
            </div>
            <Progress value={validation.overallScore} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {validation.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issues & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {validation.issues.map((issue, index) => (
              <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                <div className="flex items-start gap-2">
                  {issue.type === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-medium">{issue.message}</div>
                      {issue.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">
                          💡 {issue.suggestion}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Contrast Ratios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Contrast Analysis
          </CardTitle>
          <CardDescription>
            WCAG compliance and readability assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Against White Background</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Primary</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {validation.contrast.primaryVsWhite.toFixed(1)}:1
                    </span>
                    {getContrastBadge(validation.contrast.primaryVsWhite)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Secondary</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {validation.contrast.secondaryVsWhite.toFixed(1)}:1
                    </span>
                    {getContrastBadge(validation.contrast.secondaryVsWhite)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Accent</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {validation.contrast.accentVsWhite.toFixed(1)}:1
                    </span>
                    {getContrastBadge(validation.contrast.accentVsWhite)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Against Black Background</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Primary</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {validation.contrast.primaryVsBlack.toFixed(1)}:1
                    </span>
                    {getContrastBadge(validation.contrast.primaryVsBlack)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Secondary</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {validation.contrast.secondaryVsBlack.toFixed(1)}:1
                    </span>
                    {getContrastBadge(validation.contrast.secondaryVsBlack)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Accent</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {validation.contrast.accentVsBlack.toFixed(1)}:1
                    </span>
                    {getContrastBadge(validation.contrast.accentVsBlack)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Status */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {validation.accessibility.wcagAA ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="font-medium text-sm">WCAG AA</div>
                <div className="text-xs text-muted-foreground">4.5:1 minimum</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {validation.accessibility.wcagAAA ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="font-medium text-sm">WCAG AAA</div>
                <div className="text-xs text-muted-foreground">7:1 minimum</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {validation.accessibility.colorBlindFriendly ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="font-medium text-sm">Color Blind</div>
                <div className="text-xs text-muted-foreground">Friendly</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Color Preview</CardTitle>
          <CardDescription>
            Visual representation of your brand colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div 
                className="w-full h-24 rounded border mb-2"
                style={{ backgroundColor: brandAsset.primary_color }}
              />
              <div className="text-sm font-medium">Primary</div>
              <div className="text-xs text-muted-foreground">{brandAsset.primary_color}</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-24 rounded border mb-2"
                style={{ backgroundColor: brandAsset.secondary_color }}
              />
              <div className="text-sm font-medium">Secondary</div>
              <div className="text-xs text-muted-foreground">{brandAsset.secondary_color}</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-24 rounded border mb-2"
                style={{ backgroundColor: brandAsset.accent_color }}
              />
              <div className="text-sm font-medium">Accent</div>
              <div className="text-xs text-muted-foreground">{brandAsset.accent_color}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};