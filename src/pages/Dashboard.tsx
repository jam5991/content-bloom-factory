
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle, Clock, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ContentItem {
  id: string;
  title: string;
  platform: string[];
  status: "draft" | "approved" | "published" | "failed";
  createdAt: string;
  scheduledAt?: string;
}

const Dashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContentItems = async () => {
      try {
        const { data: contentGenerations, error } = await supabase
          .from('content_generations')
          .select(`
            id,
            topic,
            status,
            created_at,
            social_media_accounts!inner(
              platform
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error loading content:', error);
          return;
        }

        const formattedItems: ContentItem[] = contentGenerations?.map(item => ({
          id: item.id,
          title: item.topic,
          platform: [item.social_media_accounts.platform],
          status: item.status as "draft" | "approved" | "published" | "failed",
          createdAt: new Date(item.created_at).toISOString().split('T')[0]
        })) || [];

        setContentItems(formattedItems);
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContentItems();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-sage text-white";
      case "approved": return "bg-primary text-white";
      case "draft": return "bg-muted text-muted-foreground";
      case "failed": return "bg-destructive text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published": return <CheckCircle className="h-4 w-4" />;
      case "approved": return <Clock className="h-4 w-4" />;
      case "draft": return <Calendar className="h-4 w-4" />;
      case "failed": return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
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
          <div className="flex items-center gap-4">
            <Link to="/create">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Create Content
              </Button>
            </Link>
            <Link to="/approval-queue">
              <Button variant="outline" className="border-sage text-charcoal hover:bg-sage/10">
                Approval Queue
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="border-sage text-charcoal hover:bg-sage/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-semibold text-charcoal mb-4">
            Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage your content pipeline and track performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-warm-white border-sage/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-semibold text-charcoal">
                {contentItems.length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warm-white border-sage/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-semibold text-sage">
                {contentItems.filter(item => item.status === "published").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warm-white border-sage/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-semibold text-primary">
                {contentItems.filter(item => item.status === "draft").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warm-white border-sage/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-semibold text-terracotta">
                {contentItems.filter(item => item.status === "approved").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content List */}
        <Card className="bg-warm-white border-sage/20">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-charcoal">
              Recent Content
            </CardTitle>
            <CardDescription>
              Track your content across all platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading content...</p>
              </div>
            ) : contentItems.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-sage mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-charcoal mb-2">No content yet</h3>
                <p className="text-muted-foreground mb-4">Start creating content to see it here</p>
                <Link to="/create">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-sage/20 rounded-lg hover:bg-cream/30 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-charcoal mb-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        {item.platform.map((platform) => (
                          <Badge
                            key={platform}
                            variant="outline"
                            className="border-sage/30 text-sage capitalize"
                          >
                            {platform}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                        {item.scheduledAt && (
                          <span className="ml-4">
                            Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-charcoal hover:text-primary">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
