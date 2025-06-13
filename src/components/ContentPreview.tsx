import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeneratedContent {
  platform: string;
  content: string;
  hashtags: string[];
  mediaReferences?: string[];
}

interface BrandedImage {
  platform: string;
  imageData: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface ContentPreviewProps {
  content: GeneratedContent[];
  brandedImages?: BrandedImage[];
  onClose: () => void;
}

export const ContentPreview = ({ content, brandedImages, onClose }: ContentPreviewProps) => {
  const [showImages, setShowImages] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${platform} content copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const downloadImage = (imageData: string, platform: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${platform.toLowerCase()}-branded-image.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded!",
      description: `${platform} image downloaded`,
    });
  };

  const getBrandedImageForPlatform = (platform: string) => {
    return brandedImages?.find(img => img.platform.toLowerCase() === platform.toLowerCase());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Generated Content Preview</h2>
              <p className="text-muted-foreground">
                Review your generated content and branded images
              </p>
            </div>
            <div className="flex gap-2">
              {brandedImages && brandedImages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImages(!showImages)}
                >
                  {showImages ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showImages ? 'Hide Images' : 'Show Images'}
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid gap-6">
            {content.map((item, index) => {
              const brandedImage = getBrandedImageForPlatform(item.platform);
              
              return (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {item.platform}
                        </Badge>
                        {brandedImage && showImages && (
                          <Badge variant="outline">
                            {brandedImage.dimensions.width} × {brandedImage.dimensions.height}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(item.content, item.platform)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Text
                        </Button>
                        {brandedImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadImage(brandedImage.imageData, item.platform)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Image
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Show branded image if available and not hidden */}
                    {brandedImage && showImages && (
                      <div className="flex justify-center">
                        <div className="relative group">
                          <img
                            src={brandedImage.imageData}
                            alt={`${item.platform} branded content`}
                            className="max-w-md max-h-64 object-contain rounded-lg border border-border shadow-sm"
                            style={{
                              aspectRatio: `${brandedImage.dimensions.width} / ${brandedImage.dimensions.height}`
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedPlatform(item.platform)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Full Size
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Content text */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Content
                      </h4>
                      <div className="bg-muted/20 rounded-lg p-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>

                    {/* Hashtags */}
                    {item.hashtags && item.hashtags.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          Hashtags
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {item.hashtags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Media references */}
                    {item.mediaReferences && item.mediaReferences.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          Media References
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {item.mediaReferences.map((ref, refIndex) => (
                            <Badge key={refIndex} variant="outline" className="text-xs">
                              {ref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Full-size image modal */}
        {selectedPlatform && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
            <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={() => setSelectedPlatform(null)}
              >
                Close
              </Button>
              {(() => {
                const image = getBrandedImageForPlatform(selectedPlatform);
                return image ? (
                  <img
                    src={image.imageData}
                    alt={`${selectedPlatform} branded content - full size`}
                    className="w-full h-auto rounded-lg"
                  />
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};