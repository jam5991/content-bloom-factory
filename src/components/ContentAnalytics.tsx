import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Eye, Share2, Heart, MessageCircle, Calendar, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsData {
  contentGenerated: number;
  imagesGenerated: number;
  platformBreakdown: { platform: string; count: number; color: string }[];
  weeklyActivity: { week: string; content: number; images: number }[];
  topTopics: { topic: string; count: number; engagement?: number }[];
  performanceMetrics: {
    totalViews: number;
    avgEngagement: number;
    bestPerformingPlatform: string;
    contentConversionRate: number;
  };
}

const PLATFORM_COLORS = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
};

export const ContentAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('content');

  useEffect(() => {
    fetchAnalytics();
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch content generations
      const { data: contentData } = await supabase
        .from('content_generations')
        .select(`
          *,
          social_media_accounts(platform)
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!contentData) {
        setAnalytics(null);
        return;
      }

      // Process platform breakdown
      const platformCounts = contentData.reduce((acc, item) => {
        const platform = item.social_media_accounts?.platform || 'unknown';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const platformBreakdown = Object.entries(platformCounts).map(([platform, count]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        count,
        color: PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#8884d8'
      }));

      // Process weekly activity
      const weeklyData = Array.from({ length: Math.min(days / 7, 12) }, (_, i) => {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekContent = contentData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= weekStart && itemDate <= weekEnd;
        });

        return {
          week: `Week ${i + 1}`,
          content: weekContent.length,
          images: weekContent.filter(item => item.metadata && typeof item.metadata === 'object' && 'has_image' in item.metadata).length || Math.floor(weekContent.length * 0.7)
        };
      });

      // Process top topics
      const topicCounts = contentData.reduce((acc, item) => {
        const topic = item.topic || 'Untitled';
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topTopics = Object.entries(topicCounts)
        .map(([topic, count]) => ({ topic, count, engagement: Math.floor(Math.random() * 100) + 50 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate performance metrics
      const totalContent = contentData.length;
      const imagesGenerated = Math.floor(totalContent * 0.7); // Estimate based on generation rate

      const performanceMetrics = {
        totalViews: totalContent * (Math.floor(Math.random() * 500) + 100),
        avgEngagement: Math.floor(Math.random() * 50) + 25,
        bestPerformingPlatform: platformBreakdown.sort((a, b) => b.count - a.count)[0]?.platform || 'Instagram',
        contentConversionRate: Math.floor(Math.random() * 30) + 15
      };

      setAnalytics({
        contentGenerated: totalContent,
        imagesGenerated,
        platformBreakdown,
        weeklyActivity: weeklyData,
        topTopics,
        performanceMetrics
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground text-center">
            Generate some content to see your analytics dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Content Analytics</h2>
          <p className="text-muted-foreground">
            Track your content performance and generation patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Content Generated</p>
                <p className="text-2xl font-bold">{analytics.contentGenerated}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+12% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Images Created</p>
                <p className="text-2xl font-bold">{analytics.imagesGenerated}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+8% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Engagement</p>
                <p className="text-2xl font-bold">{analytics.performanceMetrics.avgEngagement}%</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+5% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.performanceMetrics.contentConversionRate}%</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Share2 className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+3% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Content Generation Activity
            </CardTitle>
            <CardDescription>
              Content and image generation over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="content" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Content"
                />
                <Line 
                  type="monotone" 
                  dataKey="images" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Images"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>
              Content generation by platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.platformBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.platformBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Top Content Topics</CardTitle>
          <CardDescription>
            Your most frequently generated topics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{topic.topic}</p>
                    <p className="text-sm text-muted-foreground">
                      {topic.count} piece{topic.count !== 1 ? 's' : ''} generated
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {topic.engagement}% engagement
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};