
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle, Clock, X, LogOut, Home, FileText, Users, BarChart3, Settings, Play } from "lucide-react";
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
            social_media_accounts!content_generations_social_media_account_id_fkey(
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

  const sidebarItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", active: true },
    { icon: Plus, label: "Create", href: "/create", active: false },
    { icon: FileText, label: "Content", href: "/approval-queue", active: false },
    { icon: Settings, label: "Brand Assets", href: "/brand-assets", active: false },
    { icon: BarChart3, label: "Analytics", href: "/analytics", active: false },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">C</span>
            </div>
            <span className="text-xl font-serif font-semibold text-foreground">ContentCraft</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  item.active 
                    ? "bg-destructive text-destructive-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* User Actions */}
        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>

        {/* Trial Info */}
        <div className="p-4 bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">Trial</div>
          <div className="text-xs text-muted-foreground mb-2">Trial ends in 6 days.</div>
          <div className="text-2xl font-bold text-destructive">{contentItems.length}</div>
          <div className="text-xs text-muted-foreground">Content items</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-card border-b border-border p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-serif font-semibold text-foreground">Content Setup</h1>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 border-0">
              <Play className="h-4 w-4 mr-2" />
              Watch Tutorial
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Academy</span>
            <Button variant="ghost" size="sm">
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 bg-muted/20">
          <div className="max-w-4xl">
            {/* Description */}
            <p className="text-muted-foreground mb-8">
              Set up your content pipeline once, and let our AI generate on-brand content assets.
            </p>

            {/* Setup Steps */}
            <div className="space-y-6">
              {/* Step 1 */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">1</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Connect Social Media Accounts</h3>
                        <p className="text-sm text-muted-foreground">Link your social platforms for seamless publishing</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Required</Badge>
                      <Button size="sm">
                        Setup
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">2</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Create Your First Content</h3>
                        <p className="text-sm text-muted-foreground">Start generating content with our AI tools</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Required</Badge>
                      <Link to="/create">
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">3</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Review Content Pipeline</h3>
                        <p className="text-sm text-muted-foreground">Approve and schedule your generated content</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Recommended</Badge>
                      <Link to="/approval-queue">
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">4</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Monitor Performance</h3>
                        <p className="text-sm text-muted-foreground">Track engagement and optimize your content strategy</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Optional</Badge>
                      <Button variant="outline" size="sm">
                        View Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Content Section */}
            {contentItems.length > 0 && (
              <Card className="bg-card mt-8">
                <CardHeader>
                  <CardTitle className="text-xl font-serif text-foreground">Recent Content</CardTitle>
                  <CardDescription>Your latest generated content items</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading content...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contentItems.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {item.platform.map((platform) => (
                                <Badge key={platform} variant="outline" className="text-xs capitalize">
                                  {platform}
                                </Badge>
                              ))}
                              <Badge className={getStatusColor(item.status)}>
                                {getStatusIcon(item.status)}
                                <span className="ml-1 capitalize">{item.status}</span>
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                      {contentItems.length > 3 && (
                        <div className="text-center pt-2">
                          <Link to="/approval-queue">
                            <Button variant="outline" size="sm">
                              View All Content
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
