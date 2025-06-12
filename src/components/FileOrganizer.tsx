import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Upload, FileImage, FileVideo, File } from "lucide-react";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";

interface FileOrganizerProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  selectedCampaign?: string;
  onCampaignChange?: (campaignId: string) => void;
}

export const FileOrganizer = ({ onFilesUploaded, selectedCampaign, onCampaignChange }: FileOrganizerProps) => {
  const { campaigns, createCampaign, loading: campaignsLoading } = useCampaigns();
  const { uploadFiles, uploading, uploadProgress } = useFileUpload();
  const { toast } = useToast();
  
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    topic: "",
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive",
      });
      return;
    }

    const campaign = await createCampaign(
      newCampaign.name,
      newCampaign.description || undefined,
      newCampaign.topic || undefined
    );

    if (campaign) {
      setNewCampaign({ name: "", description: "", topic: "" });
      setShowCreateDialog(false);
      onCampaignChange?.(campaign.id);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Show bulk upload toast
    toast({
      title: "Bulk Upload Started",
      description: `Uploading ${fileArray.length} file(s)...`,
    });

    const uploadedFiles = await uploadFiles(fileArray, selectedCampaign);
    
    if (uploadedFiles.length > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      });
      onFilesUploaded?.(uploadedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    return File;
  };

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card className="bg-warm-white border-sage/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-charcoal">
            <Folder className="h-5 w-5" />
            Campaign Organization
          </CardTitle>
          <CardDescription>
            Organize your files by campaign or topic for better management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-charcoal font-medium">Select Campaign</Label>
              <Select value={selectedCampaign} onValueChange={onCampaignChange}>
                <SelectTrigger className="border-sage/30 focus:border-primary bg-warm-white">
                  <SelectValue placeholder="Choose a campaign or create new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Campaign (General)</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex items-center gap-2">
                        <span>{campaign.name}</span>
                        {campaign.topic && <Badge variant="secondary" className="text-xs">{campaign.topic}</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mt-6 border-sage/30 text-charcoal hover:bg-sage/10">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-warm-white border-sage/20">
                <DialogHeader>
                  <DialogTitle className="text-charcoal">Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Create a new campaign to organize your content and media files
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name" className="text-charcoal font-medium">
                      Campaign Name *
                    </Label>
                    <Input
                      id="campaign-name"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Q1 Product Launch, Holiday Campaign 2024"
                      className="border-sage/30 focus:border-primary bg-warm-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaign-topic" className="text-charcoal font-medium">
                      Topic/Category
                    </Label>
                    <Input
                      id="campaign-topic"
                      value={newCampaign.topic}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g., Product Launch, Marketing, Branding"
                      className="border-sage/30 focus:border-primary bg-warm-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaign-description" className="text-charcoal font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="campaign-description"
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the campaign goals and strategy..."
                      rows={3}
                      className="border-sage/30 focus:border-primary bg-warm-white"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                      className="border-sage/30 text-charcoal hover:bg-sage/10"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCampaign} className="bg-primary hover:bg-primary/90">
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Bulk File Upload */}
      <Card className="bg-warm-white border-sage/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-charcoal">
            <Upload className="h-5 w-5" />
            Bulk File Upload
          </CardTitle>
          <CardDescription>
            Upload multiple files at once with drag & drop support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-sage/30 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-sage'}`} />
            <div className="space-y-2">
              <p className="text-charcoal font-medium">
                {isDragOver ? 'Drop files here to upload' : 'Drag & drop files here or click to browse'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports multiple files: images, videos, and PDFs (max 50MB each)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-charcoal">Upload Progress:</p>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal truncate">{fileName}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="w-full bg-sage/20 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};