
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, X, RefreshCw, Calendar } from "lucide-react";

interface ContentDraft {
  id: string;
  topic: string;
  platform: string;
  content: string;
  hashtags: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const ApprovalQueue = () => {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const { toast } = useToast();

  // Load drafts from localStorage on component mount and listen for changes
  useEffect(() => {
    const loadDrafts = () => {
      const storedDrafts = localStorage.getItem('contentDrafts');
      if (storedDrafts) {
        setDrafts(JSON.parse(storedDrafts));
      }
    };

    // Load initially
    loadDrafts();

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', loadDrafts);
    
    // Also check for updates periodically (in case user navigates back to this page)
    const interval = setInterval(loadDrafts, 1000);

    return () => {
      window.removeEventListener('storage', loadDrafts);
      clearInterval(interval);
    };
  }, []);

  // Update localStorage whenever drafts change
  useEffect(() => {
    if (drafts.length > 0) {
      localStorage.setItem('contentDrafts', JSON.stringify(drafts));
    }
  }, [drafts]);

  const handleApprove = (id: string) => {
    setDrafts(prev => prev.map(draft => 
      draft.id === id ? { ...draft, status: "approved" as const } : draft
    ));
    toast({
      title: "Content Approved",
      description: "Content has been approved and scheduled for publishing",
    });
  };

  const handleReject = (id: string) => {
    setDrafts(prev => prev.map(draft => 
      draft.id === id ? { ...draft, status: "rejected" as const } : draft
    ));
    toast({
      title: "Content Rejected",
      description: "Content has been rejected and moved to drafts",
      variant: "destructive",
    });
  };

  const handleRegenerate = (id: string) => {
    toast({
      title: "Regenerating Content",
      description: "AI is creating a new version based on your feedback",
    });
    // TODO: Implement regeneration logic
  };

  const pendingDrafts = drafts.filter(draft => draft.status === "pending");

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

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-semibold text-charcoal mb-4">
            Approval Queue
          </h1>
          <p className="text-xl text-muted-foreground">
            Review and approve AI-generated content before publishing
          </p>
        </div>

        {pendingDrafts.length === 0 ? (
          <Card className="bg-warm-white border-sage/20 text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-sage mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-charcoal mb-2">
                All caught up!
              </h3>
              <p className="text-muted-foreground mb-6">
                No content pending approval at the moment
              </p>
              <Link to="/create">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Create New Content
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {pendingDrafts.map((draft) => (
              <Card key={draft.id} className="bg-warm-white border-sage/20 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-serif text-charcoal">
                        {draft.topic}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {draft.platform}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Generated {new Date(draft.createdAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      <Calendar className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Content Preview */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-charcoal mb-2">Content:</h4>
                      <div className="bg-cream/50 p-4 rounded-lg border border-sage/20">
                        <p className="text-charcoal leading-relaxed whitespace-pre-wrap">
                          {draft.content}
                        </p>
                      </div>
                    </div>

                    {/* Hashtags */}
                    {draft.hashtags.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-charcoal mb-2">Hashtags:</h4>
                        <div className="flex flex-wrap gap-2">
                          {draft.hashtags.map((hashtag, index) => (
                            <Badge key={index} variant="outline" className="border-sage/30 text-sage">
                              {hashtag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Area */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-charcoal">
                      Edit Content (optional):
                    </h4>
                    <Textarea
                      placeholder="Make any edits to the content here..."
                      className="border-sage/30 focus:border-primary bg-warm-white"
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-sage/20">
                    <Button
                      onClick={() => handleApprove(draft.id)}
                      className="bg-sage hover:bg-sage/90 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Schedule
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRegenerate(draft.id)}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(draft.id)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
