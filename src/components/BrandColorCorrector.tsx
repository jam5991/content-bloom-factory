import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Palette, Check, X, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { BrandAsset } from '@/hooks/useBrandAssets';

interface ColorCorrection {
  original: string;
  corrected: string;
  reason?: string;
}

interface BrandColorCorrectorProps {
  brandAsset: BrandAsset;
  onCorrection?: (corrections: ColorCorrection[]) => void;
}

export const BrandColorCorrector = ({ brandAsset, onCorrection }: BrandColorCorrectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [corrections, setCorrections] = useState<{
    primary: { original: string; corrected: string; reason: string };
    secondary: { original: string; corrected: string; reason: string };
    accent: { original: string; corrected: string; reason: string };
  }>({
    primary: { original: brandAsset.primary_color, corrected: brandAsset.primary_color, reason: '' },
    secondary: { original: brandAsset.secondary_color, corrected: brandAsset.secondary_color, reason: '' },
    accent: { original: brandAsset.accent_color, corrected: brandAsset.accent_color, reason: '' }
  });

  const handleColorChange = (type: 'primary' | 'secondary' | 'accent', color: string) => {
    setCorrections(prev => ({
      ...prev,
      [type]: { ...prev[type], corrected: color }
    }));
  };

  const handleReasonChange = (type: 'primary' | 'secondary' | 'accent', reason: string) => {
    setCorrections(prev => ({
      ...prev,
      [type]: { ...prev[type], reason }
    }));
  };

  const resetCorrections = () => {
    setCorrections({
      primary: { original: brandAsset.primary_color, corrected: brandAsset.primary_color, reason: '' },
      secondary: { original: brandAsset.secondary_color, corrected: brandAsset.secondary_color, reason: '' },
      accent: { original: brandAsset.accent_color, corrected: brandAsset.accent_color, reason: '' }
    });
  };

  const hasChanges = () => {
    return corrections.primary.original !== corrections.primary.corrected ||
           corrections.secondary.original !== corrections.secondary.corrected ||
           corrections.accent.original !== corrections.accent.corrected;
  };

  const saveCorrections = async () => {
    if (!user || !hasChanges()) return;

    try {
      const correctionData = Object.entries(corrections)
        .filter(([_, correction]) => correction.original !== correction.corrected)
        .map(([type, correction]) => ({
          type,
          original: correction.original,
          corrected: correction.corrected,
          reason: correction.reason
        }));

      if (correctionData.length === 0) {
        toast({
          title: "No Changes",
          description: "No color corrections were made.",
          variant: "destructive"
        });
        return;
      }

      // Save corrections to database
      const { error } = await supabase
        .from('brand_color_corrections')
        .insert({
          user_id: user.id,
          brand_asset_id: brandAsset.id,
          original_colors: {
            primary: corrections.primary.original,
            secondary: corrections.secondary.original,
            accent: corrections.accent.original
          },
          corrected_colors: {
            primary: corrections.primary.corrected,
            secondary: corrections.secondary.corrected,
            accent: corrections.accent.corrected
          },
          correction_reason: correctionData.map(c => `${c.type}: ${c.reason}`).join('; ')
        });

      if (error) throw error;

      // Call onCorrection callback with the corrections
      if (onCorrection) {
        onCorrection(correctionData.map(c => ({
          original: c.original,
          corrected: c.corrected,
          reason: c.reason
        })));
      }

      toast({
        title: "Corrections Saved",
        description: `${correctionData.length} color correction(s) saved successfully.`
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error saving color corrections:', error);
      toast({
        title: "Error",
        description: "Failed to save color corrections.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="w-4 h-4 mr-2" />
          Correct Colors
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manual Color Correction</DialogTitle>
          <DialogDescription>
            Adjust the extracted brand colors and provide feedback to improve future extractions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Primary Color</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-12 h-12 border border-border rounded"
                  style={{ backgroundColor: corrections.primary.original }}
                />
                <span className="text-sm text-muted-foreground">Original</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={corrections.primary.corrected}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-12 h-12 p-1 border rounded"
                />
                <Input
                  value={corrections.primary.corrected}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  placeholder="#000000"
                  className="w-24"
                />
              </div>
              {corrections.primary.original !== corrections.primary.corrected && (
                <Badge variant="secondary">Modified</Badge>
              )}
            </div>
            <Textarea
              placeholder="Why did you change this color? (e.g., 'Too dark for accessibility', 'Not matching brand')"
              value={corrections.primary.reason}
              onChange={(e) => handleReasonChange('primary', e.target.value)}
              className="text-sm"
              rows={2}
            />
          </div>

          {/* Secondary Color */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Secondary Color</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-12 h-12 border border-border rounded"
                  style={{ backgroundColor: corrections.secondary.original }}
                />
                <span className="text-sm text-muted-foreground">Original</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={corrections.secondary.corrected}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-12 h-12 p-1 border rounded"
                />
                <Input
                  value={corrections.secondary.corrected}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  placeholder="#ffffff"
                  className="w-24"
                />
              </div>
              {corrections.secondary.original !== corrections.secondary.corrected && (
                <Badge variant="secondary">Modified</Badge>
              )}
            </div>
            <Textarea
              placeholder="Reason for changing this color..."
              value={corrections.secondary.reason}
              onChange={(e) => handleReasonChange('secondary', e.target.value)}
              className="text-sm"
              rows={2}
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Accent Color</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-12 h-12 border border-border rounded"
                  style={{ backgroundColor: corrections.accent.original }}
                />
                <span className="text-sm text-muted-foreground">Original</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={corrections.accent.corrected}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-12 h-12 p-1 border rounded"
                />
                <Input
                  value={corrections.accent.corrected}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  placeholder="#0066cc"
                  className="w-24"
                />
              </div>
              {corrections.accent.original !== corrections.accent.corrected && (
                <Badge variant="secondary">Modified</Badge>
              )}
            </div>
            <Textarea
              placeholder="Reason for changing this color..."
              value={corrections.accent.reason}
              onChange={(e) => handleReasonChange('accent', e.target.value)}
              className="text-sm"
              rows={2}
            />
          </div>

          {/* Color Preview */}
          {hasChanges() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview with Corrected Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div 
                    className="w-16 h-16 rounded border"
                    style={{ backgroundColor: corrections.primary.corrected }}
                    title={`Primary: ${corrections.primary.corrected}`}
                  />
                  <div 
                    className="w-16 h-16 rounded border"
                    style={{ backgroundColor: corrections.secondary.corrected }}
                    title={`Secondary: ${corrections.secondary.corrected}`}
                  />
                  <div 
                    className="w-16 h-16 rounded border"
                    style={{ backgroundColor: corrections.accent.corrected }}
                    title={`Accent: ${corrections.accent.corrected}`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={saveCorrections} disabled={!hasChanges()}>
              <Check className="w-4 h-4 mr-2" />
              Save Corrections
            </Button>
            <Button variant="outline" onClick={resetCorrections}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};