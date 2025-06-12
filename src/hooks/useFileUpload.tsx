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

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
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

  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (const file of files) {
        const uploadedFile = await uploadFile(file);
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

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    uploading,
    uploadProgress,
  };
};