
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft, X, FileImage, FileVideo, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";

const CreateContent = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    tone: "",
    audience: "",
    platforms: [] as string[],
    hashtags: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { uploadFiles, deleteFile, uploading, uploadProgress } = useFileUpload();

  const platforms = [
    { id: "instagram", name: "Instagram" },
    { id: "facebook", name: "Facebook" },
    { id: "linkedin", name: "LinkedIn" },
    { id: "twitter", name: "X (Twitter)" },
  ];

  const tones = [
    "Professional",
    "Casual",
    "Humorous",
    "Inspirational",
    "Educational",
    "Promotional",
  ];

  const audiences = [
    "General Audience",
    "Young Adults (18-25)",
    "Professionals (25-45)",
    "Business Owners",
    "Tech Enthusiasts",
    "Creative Community",
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformChange = (platformId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      platforms: checked
        ? [...prev.platforms, platformId]
        : prev.platforms.filter(p => p !== platformId)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const uploadedFileResults = await uploadFiles(files);
      setUploadedFiles(prev => [...prev, ...uploadedFileResults]);
    }
    // Reset the input
    e.target.value = '';
  };

  const handleRemoveFile = async (fileId: string, storagePath: string) => {
    await deleteFile(fileId, storagePath);
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    return File;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.platforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one platform",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Call our Supabase Edge Function for content generation
      const response = await fetch(`https://nypqqbgrqiiaueqhrvgv.supabase.co/functions/v1/generate-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHFxYmdycWlpYXVlcWhydmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzUyMzAsImV4cCI6MjA2NDgxMTIzMH0.PdEGmQZYimCZyA-T0JNrNSoxtYzuJ85iYW6Jle3pkOs`,
        },
        body: JSON.stringify({
          topic: formData.topic,
          description: formData.description,
          tone: formData.tone,
          audience: formData.audience,
          platforms: formData.platforms,
          hashtags: formData.hashtags,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate content: ${response.status}`);
      }

      const { content } = await response.json();

      // Ensure user profile exists
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if profile exists, create if not
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email
          });
      }

      // Save content to database
      for (const item of content) {
        // Get or create social media account
        let { data: account } = await supabase
          .from('social_media_accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', item.platform.toLowerCase())
          .maybeSingle();

        if (!account) {
          const { data: newAccount } = await supabase
            .from('social_media_accounts')
            .insert({
              user_id: user.id,
              platform: item.platform.toLowerCase(),
              account_name: `${item.platform} Account`
            })
            .select('id')
            .single();
          account = newAccount;
        }

        if (!account) {
          throw new Error('Failed to create social media account');
        }

        // Save content generation
        await supabase
          .from('content_generations')
          .insert({
            user_id: user.id,
            social_media_account_id: account.id,
            topic: formData.topic,
            generated_content: item.content,
            status: 'generated',
            metadata: { hashtags: item.hashtags }
          });
      }

      toast({
        title: "Content Generated",
        description: `${content.length} content piece(s) created successfully!`,
      });
      
      // Reset form
      setFormData({
        topic: "",
        description: "",
        tone: "",
        audience: "",
        platforms: [],
        hashtags: "",
      });
      setUploadedFiles([]);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-white via-cream to-sage/10">
      {/* Navigation */}
      <nav className="bg-warm-white/80 backdrop-blur-md border-b border-sage/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-serif font-semibold text-charcoal">
            ContentCraft
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" className="text-charcoal hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-semibold text-charcoal mb-4">
            Create New Content
          </h1>
          <p className="text-xl text-muted-foreground">
            Let AI generate engaging content tailored to your brand and audience
          </p>
        </div>

        <Card className="bg-warm-white border-sage/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-charcoal">
              Content Brief
            </CardTitle>
            <CardDescription>
              Provide details about the content you want to create
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-charcoal font-medium">
                  Topic / Subject *
                </Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => handleInputChange("topic", e.target.value)}
                  placeholder="e.g., Product launch, Holiday campaign, Industry insights"
                  required
                  className="border-sage/30 focus:border-primary bg-warm-white"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-charcoal font-medium">
                  Description & Key Points
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Provide more details about what you want to communicate..."
                  rows={4}
                  className="border-sage/30 focus:border-primary bg-warm-white"
                />
              </div>

              {/* Tone and Audience */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-charcoal font-medium">Tone</Label>
                  <Select value={formData.tone} onValueChange={(value) => handleInputChange("tone", value)}>
                    <SelectTrigger className="border-sage/30 focus:border-primary bg-warm-white">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {tones.map((tone) => (
                        <SelectItem key={tone} value={tone.toLowerCase()}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-charcoal font-medium">Target Audience</Label>
                  <Select value={formData.audience} onValueChange={(value) => handleInputChange("audience", value)}>
                    <SelectTrigger className="border-sage/30 focus:border-primary bg-warm-white">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.map((audience) => (
                        <SelectItem key={audience} value={audience.toLowerCase()}>
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-4">
                <Label className="text-charcoal font-medium">
                  Publishing Platforms *
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {platforms.map((platform) => (
                    <div key={platform.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform.id}
                        checked={formData.platforms.includes(platform.id)}
                        onCheckedChange={(checked) => handlePlatformChange(platform.id, !!checked)}
                      />
                      <Label htmlFor={platform.id} className="text-sm font-medium">
                        {platform.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label htmlFor="hashtags" className="text-charcoal font-medium">
                  Hashtags (optional)
                </Label>
                <Input
                  id="hashtags"
                  value={formData.hashtags}
                  onChange={(e) => handleInputChange("hashtags", e.target.value)}
                  placeholder="#marketing #business #socialmedia"
                  className="border-sage/30 focus:border-primary bg-warm-white"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <Label className="text-charcoal font-medium">
                  Media Files (optional)
                </Label>
                <div className="relative border-2 border-dashed border-sage/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Upload className="h-12 w-12 text-sage mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-charcoal font-medium">
                      Drop files here or click to upload
                    </p>
                     <p className="text-sm text-muted-foreground">
                       Support for images, videos, and PDFs (max 50MB each)
                     </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                
                {/* Upload Progress */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-charcoal">{fileName}</span>
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

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-charcoal mb-3">
                      Uploaded files ({uploadedFiles.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uploadedFiles.map((file) => {
                        const IconComponent = getFileIcon(file.mimeType);
                        const isImage = file.mimeType.startsWith('image/');
                        
                        return (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-sage/5 rounded-lg border border-sage/20">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              {isImage ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-sage/10 flex-shrink-0">
                                  <img 
                                    src={file.publicUrl} 
                                    alt={file.fileName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to icon if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden w-full h-full flex items-center justify-center">
                                    <IconComponent className="h-6 w-6 text-sage" />
                                  </div>
                                </div>
                              ) : (
                                <IconComponent className="h-5 w-5 text-sage flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-charcoal truncate">
                                  {file.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.fileSize / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(file.id, file.storagePath)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating Content..." : "Generate Content"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateContent;
