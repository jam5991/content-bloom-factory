import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Palette, Type, Trash2, Edit, Plus, Image } from 'lucide-react';
import { useBrandAssets, type BrandAsset, type CreateBrandAssetData } from '@/hooks/useBrandAssets';
import { BrandTemplateCustomizer } from './BrandTemplateCustomizer';
import { useToast } from '@/hooks/use-toast';

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Inter'
];

interface BrandAssetFormProps {
  asset?: BrandAsset;
  onSave: (data: CreateBrandAssetData) => Promise<void>;
  onCancel: () => void;
}

const BrandAssetForm = ({ asset, onSave, onCancel }: BrandAssetFormProps) => {
  const [formData, setFormData] = useState<CreateBrandAssetData>({
    name: asset?.name || '',
    logo_url: asset?.logo_url || '',
    primary_color: asset?.primary_color || '#000000',
    secondary_color: asset?.secondary_color || '#ffffff',
    accent_color: asset?.accent_color || '#0066cc',
    font_family: asset?.font_family || 'Arial'
  });
  const [uploading, setUploading] = useState(false);
  const { uploadLogo } = useBrandAssets();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const logoUrl = await uploadLogo(file, asset?.id);
      if (logoUrl) {
        setFormData(prev => ({ ...prev, logo_url: logoUrl }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Brand Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="My Brand"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Logo</Label>
        <div className="flex items-center gap-4">
          {formData.logo_url && (
            <div className="relative">
              <img 
                src={formData.logo_url} 
                alt="Brand logo" 
                className="w-16 h-16 object-contain border border-border rounded"
              />
            </div>
          )}
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
            />
          </div>
        </div>
        {uploading && <p className="text-sm text-muted-foreground">Uploading logo...</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary-color">Primary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={formData.primary_color}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
              className="w-12 h-10 p-1 border rounded"
            />
            <Input
              value={formData.primary_color}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary-color">Secondary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={formData.secondary_color}
              onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
              className="w-12 h-10 p-1 border rounded"
            />
            <Input
              value={formData.secondary_color}
              onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
              placeholder="#ffffff"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accent-color">Accent Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={formData.accent_color}
              onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
              className="w-12 h-10 p-1 border rounded"
            />
            <Input
              value={formData.accent_color}
              onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
              placeholder="#0066cc"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="font-family">Font Family</Label>
        <Select value={formData.font_family} onValueChange={(value) => setFormData(prev => ({ ...prev, font_family: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={uploading}>
          {asset ? 'Update' : 'Create'} Brand Asset
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export const BrandAssetManager = () => {
  const { brandAssets, loading, createBrandAsset, updateBrandAsset, deleteBrandAsset } = useBrandAssets();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customizerAsset, setCustomizerAsset] = useState<BrandAsset | null>(null);

  const handleCreate = async (data: CreateBrandAssetData) => {
    const success = await createBrandAsset(data);
    if (success) {
      setShowCreateDialog(false);
    }
  };

  const handleUpdate = async (data: CreateBrandAssetData) => {
    if (!selectedAsset) return;
    const success = await updateBrandAsset(selectedAsset.id, data);
    if (success) {
      setShowEditDialog(false);
      setSelectedAsset(null);
    }
  };

  const handleDelete = async (asset: BrandAsset) => {
    if (confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      await deleteBrandAsset(asset.id);
    }
  };

  const handleCustomizeTemplate = (asset: BrandAsset) => {
    setCustomizerAsset(asset);
    setShowCustomizer(true);
  };

  const handleSaveCustomization = async (customization: any) => {
    // Here you would save the customization to the database
    // For now, we'll just show a success message
    toast({
      title: "Template Saved",
      description: "Your brand template customization has been saved.",
    });
    setShowCustomizer(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading brand assets...</div>;
  }

  if (showCustomizer && customizerAsset) {
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => setShowCustomizer(false)}
          className="mb-4"
        >
          ← Back to Brand Assets
        </Button>
        <BrandTemplateCustomizer
          brandAsset={customizerAsset}
          onSave={handleSaveCustomization}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Brand Assets</h2>
          <p className="text-muted-foreground">
            Manage your brand colors, fonts, and logos for consistent content generation
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Brand Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Brand Asset</DialogTitle>
              <DialogDescription>
                Set up your brand colors, fonts, and logo for consistent content generation.
              </DialogDescription>
            </DialogHeader>
            <BrandAssetForm 
              onSave={handleCreate}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {brandAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Brand Assets</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first brand asset to get started with branded content generation.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Brand Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brandAssets.map((asset) => (
            <Card key={asset.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {asset.logo_url && (
                        <img 
                          src={asset.logo_url} 
                          alt={asset.name} 
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      {asset.name}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(asset.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCustomizeTemplate(asset)}
                      title="Customize Template"
                    >
                      <Palette className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(asset)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: asset.primary_color }}
                    title={`Primary: ${asset.primary_color}`}
                  />
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: asset.secondary_color }}
                    title={`Secondary: ${asset.secondary_color}`}
                  />
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: asset.accent_color }}
                    title={`Accent: ${asset.accent_color}`}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <span className="text-sm" style={{ fontFamily: asset.font_family }}>
                    {asset.font_family}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Brand Asset</DialogTitle>
            <DialogDescription>
              Update your brand colors, fonts, and logo.
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <BrandAssetForm 
              asset={selectedAsset}
              onSave={handleUpdate}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedAsset(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};