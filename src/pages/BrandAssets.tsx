import { BrandAssetManager } from '@/components/BrandAssetManager';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BrandAssets() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Navigation Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <Link to="/dashboard">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <BrandAssetManager />
      </div>
    </div>
  );
}