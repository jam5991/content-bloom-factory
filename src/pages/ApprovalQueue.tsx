
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, X, RefreshCw, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load content from database
  useEffect(() => {
    if (user) {
      loadContentFromDatabase();
    }
  }, [user]);

  const loadContentFromDatabase = async () => {
    try {
      const { data: contentGenerations, error } = await supabase
        .from('content_generations')
        .select(`
          id,
          topic,
          generated_content,
          status,
          created_at,
          metadata,
          social_media_accounts!content_generations_social_media_account_id_fkey(platform)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading content:', error);
        toast({
          title: "Error",
          description: "Failed to load content from database",
          variant: "destructive",
        });
        return;
      }

      const formattedDrafts: ContentDraft[] = contentGenerations.map((item: any) => ({
        id: item.id,
        topic: item.topic,
        platform: item.social_media_accounts.platform,
        content: item.generated_content,
        hashtags: item.metadata?.hashtags || [],
        status: item.status === 'generated' ? 'pending' : item.status,
        createdAt: item.created_at,
      }));

      setDrafts(formattedDrafts);
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const handleApprove = async (id: string) => {
    try {
      // Update content_generations status
      const { error: updateError } = await supabase
        .from('content_generations')
        .update({ status: 'approved' })
        .eq('id', id);

      if (updateError) {
        console.error('Error approving content:', updateError);
        toast({
          title: "Error",
          description: "Failed to approve content",
          variant: "destructive",
        });
        return;
      }

      // Insert approval record for audit trail
      const { error: approvalError } = await supabase
        .from('content_approvals')
        .insert({
          content_generation_id: id,
          user_id: user.id,
          approved: true,
        });

      if (approvalError) {
        console.error('Error creating approval record:', approvalError);
        // Don't block the flow, just log the error
      }

      setDrafts(prev => prev.map(draft => 
        draft.id === id ? { ...draft, status: "approved" as const } : draft
      ));

      // Trigger RAG pattern analysis for the approved content
      try {
        await fetch(`https://nypqqbgrqiiaueqhrvgv.supabase.co/functions/v1/analyze-content-patterns`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHFxYmdycWlpYXVlcWhydmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzUyMzAsImV4cCI6MjA2NDgxMTIzMH0.PdEGmQZYimCZyA-T0JNrNSoxtYzuJ85iYW6Jle3pkOs`,
          },
          body: JSON.stringify({
            contentId: id,
            userId: user.id,
          }),
        });
        console.log('RAG pattern analysis triggered for content:', id);
      } catch (ragError) {
        console.error('Error triggering RAG analysis:', ragError);
        // Don't show error to user - this is background learning
      }

      toast({
        title: "Content Approved",
        description: "Content has been approved and patterns learned for future generation",
      });
    } catch (error) {
      console.error('Error approving content:', error);
      toast({
        title: "Error",
        description: "Failed to approve content",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      // Update content_generations status
      const { error: updateError } = await supabase
        .from('content_generations')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (updateError) {
        console.error('Error rejecting content:', updateError);
        toast({
          title: "Error",
          description: "Failed to reject content",
          variant: "destructive",
        });
        return;
      }

      // Insert rejection record for audit trail
      const { error: approvalError } = await supabase
        .from('content_approvals')
        .insert({
          content_generation_id: id,
          user_id: user.id,
          approved: false,
        });

      if (approvalError) {
        console.error('Error creating rejection record:', approvalError);
        // Don't block the flow, just log the error
      }

      setDrafts(prev => prev.map(draft => 
        draft.id === id ? { ...draft, status: "rejected" as const } : draft
      ));
      toast({
        title: "Content Rejected",
        description: "Content has been rejected and moved to drafts",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast({
        title: "Error",
        description: "Failed to reject content",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async (id: string) => {
    setRegeneratingId(id);
    
    try {
      const draft = drafts.find(d => d.id === id);
      if (!draft) return;

      // Get the original content data
      const { data: contentData, error: fetchError } = await supabase
        .from('content_generations')
        .select(`
          topic,
          description,
          tone,
          audience,
          hashtags,
          user_feedback,
          social_media_accounts!content_generations_social_media_account_id_fkey(platform)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch content details');
      }

      // Call the regeneration edge function
      const response = await fetch(`https://nypqqbgrqiiaueqhrvgv.supabase.co/functions/v1/generate-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cHFxYmdycWlpYXVlcWhydmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzUyMzAsImV4cCI6MjA2NDgxMTIzMH0.PdEGmQZYimCZyA-T0JNrNSoxtYzuJ85iYW6Jle3pkOs`,
        },
        body: JSON.stringify({
          topic: contentData.topic,
          description: contentData.description || `Please regenerate this content with user feedback: ${contentData.user_feedback || 'No specific feedback provided'}`,
          tone: contentData.tone,
          audience: contentData.audience,
          platforms: [contentData.social_media_accounts.platform],
          hashtags: contentData.hashtags || "",
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate content: ${response.status}`);
      }

      const { content } = await response.json();
      const newContent = content[0];

      // Update the database with new content
      const { error: updateError } = await supabase
        .from('content_generations')
        .update({
          generated_content: newContent.content,
          metadata: { hashtags: newContent.hashtags },
          status: 'generated'
        })
        .eq('id', id);

      if (updateError) {
        throw new Error('Failed to save regenerated content');
      }

      // Update local state
      setDrafts(prev => prev.map(draft => 
        draft.id === id 
          ? { ...draft, content: newContent.content, hashtags: newContent.hashtags, status: 'pending' }
          : draft
      ));

      toast({
        title: "Content Regenerated",
        description: "New version created successfully!",
      });

    } catch (error) {
      console.error('Error regenerating content:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const pendingDrafts = drafts.filter(draft => draft.status === "pending");
  const approvedDrafts = drafts.filter(draft => draft.status === "approved");
  const rejectedDrafts = drafts.filter(draft => draft.status === "rejected");

  const renderDraftCard = (draft: ContentDraft, showActions: boolean = true) => (
    <Card key={draft.id} className="bg-warm-white border-sage/20 shadow-lg relative">
      {regeneratingId === draft.id && (
        <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <p className="text-primary font-medium">Regenerating content...</p>
          </div>
        </div>
      )}
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
          <Badge className={
            draft.status === "pending" ? "bg-primary/10 text-primary" :
            draft.status === "approved" ? "bg-sage/10 text-sage" :
            "bg-destructive/10 text-destructive"
          }>
            <Calendar className="h-3 w-3 mr-1" />
            {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
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

        {/* Edit Area - only for pending */}
        {showActions && draft.status === "pending" && (
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
        )}

        {/* Action Buttons - only for pending */}
        {showActions && draft.status === "pending" && (
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
              disabled={regeneratingId === draft.id}
              className="border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingId === draft.id ? 'animate-spin' : ''}`} />
              {regeneratingId === draft.id ? 'Regenerating...' : 'Regenerate'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReject(draft.id)}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
            Content Queue
          </h1>
          <p className="text-xl text-muted-foreground">
            Review and manage all your AI-generated content
          </p>
        </div>

        {drafts.length === 0 ? (
          <Card className="bg-warm-white border-sage/20 text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-sage mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-charcoal mb-2">
                No content yet!
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first piece of content to get started
              </p>
              <Link to="/create">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Create New Content
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {/* Pending Section */}
            {pendingDrafts.length > 0 && (
              <div>
                <h2 className="text-2xl font-serif font-semibold text-charcoal mb-6 flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary">
                    {pendingDrafts.length}
                  </Badge>
                  Pending Approval
                </h2>
                <div className="space-y-6">
                  {pendingDrafts.map((draft) => renderDraftCard(draft, true))}
                </div>
              </div>
            )}

            {/* Approved Section */}
            {approvedDrafts.length > 0 && (
              <div>
                <h2 className="text-2xl font-serif font-semibold text-charcoal mb-6 flex items-center gap-2">
                  <Badge className="bg-sage/10 text-sage">
                    {approvedDrafts.length}
                  </Badge>
                  Approved Content
                </h2>
                <div className="space-y-6">
                  {approvedDrafts.map((draft) => renderDraftCard(draft, false))}
                </div>
              </div>
            )}

            {/* Rejected Section */}
            {rejectedDrafts.length > 0 && (
              <div>
                <h2 className="text-2xl font-serif font-semibold text-charcoal mb-6 flex items-center gap-2">
                  <Badge className="bg-destructive/10 text-destructive">
                    {rejectedDrafts.length}
                  </Badge>
                  Rejected Content
                </h2>
                <div className="space-y-6">
                  {rejectedDrafts.map((draft) => renderDraftCard(draft, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
