import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, Type, Layout, Eye } from 'lucide-react';
import { useBrandAssets, type BrandAsset } from '@/hooks/useBrandAssets';

interface TemplateCustomization {
  textPosition: 'top' | 'center' | 'bottom';
  textAlignment: 'left' | 'center' | 'right';
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number;
  padding: number;
  opacity: number;
  borderRadius: number;
  shadowIntensity: number;
}

interface BrandTemplateCustomizerProps {
  brandAsset: BrandAsset;
  onSave: (customization: TemplateCustomization) => void;
}

const defaultCustomization: TemplateCustomization = {
  textPosition: 'center',
  textAlignment: 'center',
  logoPosition: 'top-left',
  fontSize: 42,
  padding: 40,
  opacity: 90,
  borderRadius: 20,
  shadowIntensity: 30,
};

export const BrandTemplateCustomizer = ({ brandAsset, onSave }: BrandTemplateCustomizerProps) => {
  const [customization, setCustomization] = useState<TemplateCustomization>(defaultCustomization);
  const [previewPlatform, setPreviewPlatform] = useState('instagram');

  const platforms = [
    { id: 'instagram', name: 'Instagram', dimensions: '1080×1080' },
    { id: 'facebook', name: 'Facebook', dimensions: '1200×630' },
    { id: 'linkedin', name: 'LinkedIn', dimensions: '1200×627' },
    { id: 'twitter', name: 'Twitter', dimensions: '1200×675' },
  ];

  const updateCustomization = (field: keyof TemplateCustomization, value: any) => {
    setCustomization(prev => ({ ...prev, [field]: value }));
  };

  const generatePreviewSVG = () => {
    const isSquare = previewPlatform === 'instagram';
    const width = isSquare ? 400 : 500;
    const height = isSquare ? 400 : 300;
    
    const textY = customization.textPosition === 'top' ? height * 0.25 : 
                  customization.textPosition === 'bottom' ? height * 0.75 : 
                  height * 0.5;
    
    const logoX = customization.logoPosition.includes('right') ? width - 80 : 20;
    const logoY = customization.logoPosition.includes('bottom') ? height - 60 : 20;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="preview-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
          <filter id="preview-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="${customization.shadowIntensity / 10}" flood-color="rgba(0,0,0,0.${customization.shadowIntensity})"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#preview-bg)" />
        
        <!-- Text background -->
        <rect 
          x="${customization.padding}" 
          y="${textY - 40}" 
          width="${width - (customization.padding * 2)}" 
          height="80" 
          fill="${brandAsset.secondary_color}" 
          fill-opacity="${customization.opacity / 100}" 
          rx="${customization.borderRadius}" 
          filter="url(#preview-shadow)"
        />
        
        <!-- Sample text -->
        <text 
          x="${customization.textAlignment === 'center' ? width/2 : customization.textAlignment === 'right' ? width - customization.padding - 10 : customization.padding + 10}"
          y="${textY}" 
          font-family="${brandAsset.font_family}, Arial, sans-serif"
          font-size="${customization.fontSize * 0.6}px"
          font-weight="bold"
          fill="${brandAsset.primary_color}"
          text-anchor="${customization.textAlignment === 'center' ? 'middle' : customization.textAlignment}"
          dominant-baseline="middle"
        >
          Sample Content Text
        </text>
        
        <!-- Logo placeholder -->
        ${brandAsset.logo_url ? `
        <image 
          href="${brandAsset.logo_url}" 
          x="${logoX}" 
          y="${logoY}" 
          width="60" 
          height="40"
          preserveAspectRatio="xMidYMid meet"
        />
        ` : `
        <rect 
          x="${logoX}" 
          y="${logoY}" 
          width="60" 
          height="40" 
          fill="${brandAsset.accent_color}" 
          rx="8"
          opacity="0.7"
        />
        <text 
          x="${logoX + 30}" 
          y="${logoY + 20}" 
          font-size="12px"
          fill="white"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          LOGO
        </text>
        `}
        
        <!-- Accent line -->
        <rect 
          x="0" 
          y="${height - 6}" 
          width="100%" 
          height="6" 
          fill="${brandAsset.accent_color}" 
        />
      </svg>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Template Customization
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize how your brand appears on generated images
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={previewPlatform} onValueChange={setPreviewPlatform}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map(platform => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => onSave(customization)}>
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customization Options</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="layout" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="layout" className="text-xs">
                  <Layout className="w-3 h-3 mr-1" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="style" className="text-xs">
                  <Palette className="w-3 h-3 mr-1" />
                  Style
                </TabsTrigger>
                <TabsTrigger value="typography" className="text-xs">
                  <Type className="w-3 h-3 mr-1" />
                  Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="layout" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Text Position</Label>
                  <Select 
                    value={customization.textPosition} 
                    onValueChange={(value: any) => updateCustomization('textPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Logo Position</Label>
                  <Select 
                    value={customization.logoPosition} 
                    onValueChange={(value: any) => updateCustomization('logoPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Padding: {customization.padding}px</Label>
                  <Slider
                    value={[customization.padding]}
                    onValueChange={([value]) => updateCustomization('padding', value)}
                    max={80}
                    min={20}
                    step={5}
                  />
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Background Opacity: {customization.opacity}%</Label>
                  <Slider
                    value={[customization.opacity]}
                    onValueChange={([value]) => updateCustomization('opacity', value)}
                    max={100}
                    min={50}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Border Radius: {customization.borderRadius}px</Label>
                  <Slider
                    value={[customization.borderRadius]}
                    onValueChange={([value]) => updateCustomization('borderRadius', value)}
                    max={40}
                    min={0}
                    step={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Shadow Intensity: {customization.shadowIntensity}%</Label>
                  <Slider
                    value={[customization.shadowIntensity]}
                    onValueChange={([value]) => updateCustomization('shadowIntensity', value)}
                    max={50}
                    min={0}
                    step={5}
                  />
                </div>
              </TabsContent>

              <TabsContent value="typography" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Text Alignment</Label>
                  <Select 
                    value={customization.textAlignment} 
                    onValueChange={(value: any) => updateCustomization('textAlignment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Font Size: {customization.fontSize}px</Label>
                  <Slider
                    value={[customization.fontSize]}
                    onValueChange={([value]) => updateCustomization('fontSize', value)}
                    max={60}
                    min={24}
                    step={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Font Family</Label>
                  <div className="p-2 bg-muted/20 rounded text-sm">
                    {brandAsset.font_family}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </CardTitle>
              <Badge variant="outline">
                {platforms.find(p => p.id === previewPlatform)?.dimensions}
              </Badge>
            </div>
            <CardDescription>
              See how your template will look on {platforms.find(p => p.id === previewPlatform)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-4 bg-muted/20 rounded-lg">
              <div 
                dangerouslySetInnerHTML={{ __html: generatePreviewSVG() }}
                className="shadow-sm"
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Settings</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Text: {customization.textPosition}</div>
                <div>Logo: {customization.logoPosition}</div>
                <div>Align: {customization.textAlignment}</div>
                <div>Size: {customization.fontSize}px</div>
                <div>Opacity: {customization.opacity}%</div>
                <div>Shadow: {customization.shadowIntensity}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};