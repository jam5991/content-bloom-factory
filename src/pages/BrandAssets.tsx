import { BrandAssetManager } from '@/components/BrandAssetManager';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

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
      <div className="container mx-auto px-4 py-8">
        <BrandAssetManager />
      </div>
    </div>
  );
}