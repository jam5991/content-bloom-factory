import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface BrandAsset {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandAssetData {
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
}

export const useBrandAssets = () => {
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchBrandAssets = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrandAssets(data || []);
    } catch (error) {
      console.error('Error fetching brand assets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch brand assets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createBrandAsset = async (assetData: CreateBrandAssetData): Promise<BrandAsset | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('brand_assets')
        .insert([{ ...assetData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setBrandAssets(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Brand asset created successfully"
      });
      
      return data;
    } catch (error) {
      console.error('Error creating brand asset:', error);
      toast({
        title: "Error",
        description: "Failed to create brand asset",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateBrandAsset = async (id: string, updates: Partial<CreateBrandAssetData>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('brand_assets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setBrandAssets(prev => prev.map(asset => asset.id === id ? data : asset));
      toast({
        title: "Success",
        description: "Brand asset updated successfully"
      });
      
      return true;
    } catch (error) {
      console.error('Error updating brand asset:', error);
      toast({
        title: "Error",
        description: "Failed to update brand asset",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteBrandAsset = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('brand_assets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setBrandAssets(prev => prev.filter(asset => asset.id !== id));
      toast({
        title: "Success",
        description: "Brand asset deleted successfully"
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting brand asset:', error);
      toast({
        title: "Error",
        description: "Failed to delete brand asset",
        variant: "destructive"
      });
      return false;
    }
  };

  const uploadLogo = async (file: File, brandAssetId?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${brandAssetId || 'temp'}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('brand-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchBrandAssets();
  }, [user]);

  return {
    brandAssets,
    loading,
    createBrandAsset,
    updateBrandAsset,
    deleteBrandAsset,
    uploadLogo,
    refetch: fetchBrandAssets
  };
};