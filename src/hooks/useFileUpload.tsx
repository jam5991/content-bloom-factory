import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  publicUrl?: string;
}

export const useFileUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadFile = async (file: File, campaignId?: string): Promise<UploadedFile | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return null;
    }

    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds the 50MB limit. Please choose a smaller file.`,
        variant: "destructive",
      });
      return null;
    }

    // File type validation
    const allowedTypes = ['image/', 'video/', 'application/pdf'];
    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a supported file type. Please upload images, videos, or PDFs.`,
        variant: "destructive",
      });
      return null;
    }

    const fileId = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content-media')
        .getPublicUrl(filePath);

      // Save file metadata to database
      const { data: fileData, error: dbError } = await supabase
        .from('media_files')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          storage_path: uploadData.path,
          campaign_id: campaignId || null,
        })
        .select()
        .single();

      if (dbError) {
        // Clean up storage if database insert fails
        await supabase.storage.from('content-media').remove([filePath]);
        throw dbError;
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      return {
        id: fileData.id,
        fileName: fileData.file_name,
        filePath: fileData.file_path,
        fileSize: fileData.file_size,
        mimeType: fileData.mime_type,
        storagePath: fileData.storage_path,
        publicUrl,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    }
  };

  const uploadFiles = async (files: File[], campaignId?: string): Promise<UploadedFile[]> => {
    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (const file of files) {
        const uploadedFile = await uploadFile(file, campaignId);
        if (uploadedFile) {
          uploadedFiles.push(uploadedFile);
        }
      }
    } finally {
      setUploading(false);
    }

    return uploadedFiles;
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('media_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        throw dbError;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('content-media')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Don't throw here as the database record is already deleted
      }

      toast({
        title: "File Deleted",
        description: "File successfully deleted",
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const copyToPublicBucket = async (fileId: string, storagePath: string) => {
    try {
      // Download from private bucket
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('content-media')
        .download(storagePath);

      if (downloadError) {
        throw downloadError;
      }

      // Upload to public bucket
      const publicPath = storagePath; // Keep same path structure
      const { error: uploadError } = await supabase.storage
        .from('approved-content')
        .upload(publicPath, fileData, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      toast({
        title: "File made public",
        description: "File is now publicly accessible",
      });
    } catch (error) {
      console.error('Error copying to public bucket:', error);
      toast({
        title: "Error",
        description: "Failed to make file public",
        variant: "destructive",
      });
    }
  };

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    copyToPublicBucket,
    uploading,
    uploadProgress,
  };
};