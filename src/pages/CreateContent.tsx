
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

    try {
      // Prepare form data for webhook
      const webhookData = {
        topic: formData.topic,
        description: formData.description,
        tone: formData.tone,
        audience: formData.audience,
        platforms: formData.platforms,
        hashtags: formData.hashtags,
        timestamp: new Date().toISOString(),
        fileCount: formData.files.length,
        fileNames: formData.files.map(file => file.name)
      };

      console.log("Sending data to webhook:", webhookData);

      console.log("=== WEBHOOK CALL START ===");
      console.log("Webhook URL:", "https://lienpletinckx.app.n8n.cloud/webhook-test/b4221a4a-69c5-4c4e-bf80-1a03f28e1815");
      console.log("Webhook data being sent:", webhookData);
      
      const response = await fetch("https://lienpletinckx.app.n8n.cloud/webhook-test/b4221a4a-69c5-4c4e-bf80-1a03f28e1815", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      console.log("=== WEBHOOK RESPONSE RECEIVED ===");
      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);
      console.log("Response ok:", response.ok);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        // Try to parse JSON response, but handle empty responses gracefully
        let responseData: any = {};
        try {
          const text = await response.text();
          console.log("🚀 CRITICAL DEBUG: Raw response text:", text);
          console.log("🚀 CRITICAL DEBUG: Text length:", text.length);
          console.log("🚀 CRITICAL DEBUG: Text type:", typeof text);
          console.log("🚀 CRITICAL DEBUG: Is empty?", text.trim() === "");
          
          if (text.trim()) {
            responseData = JSON.parse(text);
            console.log("🎯 WEBHOOK SUCCESS: Parsed response:", JSON.stringify(responseData, null, 2));
            console.log("🎯 WEBHOOK SUCCESS: Response keys:", Object.keys(responseData));
            console.log("🎯 WEBHOOK SUCCESS: Response type:", typeof responseData);
            console.log("🎯 WEBHOOK SUCCESS: Is array?", Array.isArray(responseData));
          } else {
            console.log("💥 WEBHOOK EMPTY: No response content from webhook!");
            responseData = { error: "Empty response from webhook" };
          }
        } catch (jsonError) {
          console.log("💥 WEBHOOK ERROR: JSON parsing failed:", jsonError);
          responseData = { error: "Invalid JSON from webhook" };
        }

        // Create content drafts using the generated content from webhook
        console.log("=== FULL RESPONSE DEBUG ===");
        console.log("Full responseData structure:", JSON.stringify(responseData, null, 2));
        console.log("responseData keys:", Object.keys(responseData || {}));
        console.log("===========================");
        
        const newDrafts = formData.platforms.map((platform, index) => {
          // Map platform ID to proper case for webhook response
          const platformMap: Record<string, string> = {
            'linkedin': 'LinkedIn',
            'facebook': 'Facebook', 
            'instagram': 'Instagram',
            'twitter': 'Twitter'
          };
          const platformName = platformMap[platform] || platform;
          
          console.log(`=== PARSING FOR ${platformName} ===`);
          console.log("responseData:", responseData);
          console.log("responseData type:", typeof responseData);
          console.log("Is Array?:", Array.isArray(responseData));
          
          // Try multiple possible response structures
          let generatedContent = "No content received from webhook";
          let generatedHashtags = formData.hashtags.split(/[\s,]+/).filter(tag => tag.trim());
          
          // Try different possible response structures based on the webhook format
          if (responseData) {
            // Check if it's an array response (actual structure from webhook)
            if (Array.isArray(responseData) && responseData[0]?.response?.body?.[0]?.output?.platform_posts) {
              const platformPosts = responseData[0].response.body[0].output.platform_posts;
              console.log(`All platform posts:`, platformPosts);
              console.log(`Available platforms:`, Object.keys(platformPosts));
              const platformData = platformPosts[platformName];
              console.log(`Found array-nested platform data for ${platformName}:`, platformData);
              if (platformData && platformData.post) {
                generatedContent = platformData.post;
                generatedHashtags = platformData.hashtags || generatedHashtags;
                console.log(`✅ Successfully extracted content from array structure`);
              }
            }
            // Check if content is directly in responseData
            else if (responseData[platformName]) {
              console.log(`Found direct platform data for ${platformName}:`, responseData[platformName]);
              generatedContent = responseData[platformName]?.content || responseData[platformName]?.post || generatedContent;
              generatedHashtags = responseData[platformName]?.hashtags || generatedHashtags;
            }
            // Check nested structure from the logs (original structure)
            else if (responseData?.response?.body?.[0]?.output?.platform_posts) {
              const platformPosts = responseData.response.body[0].output.platform_posts;
              const platformData = platformPosts[platformName];
              console.log(`Found nested platform data for ${platformName}:`, platformData);
              if (platformData && platformData.post) {
                generatedContent = platformData.post;
                generatedHashtags = platformData.hashtags || generatedHashtags;
                console.log(`✅ Successfully extracted content from nested structure`);
              }
            }
            // Check if it's a simple structure
            else if (responseData.content || responseData.post) {
              console.log("Found simple content structure:", responseData);
              generatedContent = responseData.content || responseData.post || generatedContent;
              generatedHashtags = responseData.hashtags || generatedHashtags;
            }
            
            // Final fallback debug
            if (generatedContent === "No content received from webhook") {
              console.log("❌ Failed to extract content. Full responseData structure:");
              console.log(JSON.stringify(responseData, null, 2));
            }
          }
          
          console.log(`Final content for ${platformName}:`, generatedContent);
          console.log(`Final hashtags for ${platformName}:`, generatedHashtags);
          console.log("================================");
          
          const draft = {
            id: `${Date.now()}-${index}`,
            topic: formData.topic,
            platform: platformName,
            content: generatedContent,
            hashtags: generatedHashtags,
            status: "pending" as const,
            createdAt: new Date().toISOString(),
          };
          
          console.log("Created draft:", draft);
          return draft;
        });

        // Store drafts in localStorage for approval queue
        const existingDrafts = JSON.parse(localStorage.getItem('contentDrafts') || '[]');
        const updatedDrafts = [...existingDrafts, ...newDrafts];
        localStorage.setItem('contentDrafts', JSON.stringify(updatedDrafts));

        toast({
          title: "Content Generated",
          description: `${newDrafts.length} content draft(s) created and sent to approval queue!`,
        });
        
        // Reset form
        setFormData({
          topic: "",
          description: "",
          tone: "",
          audience: "",
          platforms: [],
          hashtags: "",
          files: [],
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending to webhook:", error);
      toast({
        title: "Error",
        description: "Failed to send content request. Please try again.",
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
