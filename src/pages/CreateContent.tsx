
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
import { Upload, ArrowLeft } from "lucide-react";

const CreateContent = () => {
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    tone: "",
    audience: "",
    platforms: [] as string[],
    hashtags: "",
    files: [] as File[],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, files: [...prev.files, ...files] }));
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

    // TODO: Implement AI content generation
    console.log("Generating content with:", formData);
    
    // Simulate AI generation
    setTimeout(() => {
      toast({
        title: "Content Generation",
        description: "AI content generation will be available once backend is connected",
      });
      setIsGenerating(false);
    }, 2000);
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
                <div className="border-2 border-dashed border-sage/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Upload className="h-12 w-12 text-sage mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-charcoal font-medium">
                      Drop files here or click to upload
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Support for images, videos, and PDFs
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
                {formData.files.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-charcoal mb-2">
                      Uploaded files:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {formData.files.map((file, index) => (
                        <li key={index}>• {file.name}</li>
                      ))}
                    </ul>
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
