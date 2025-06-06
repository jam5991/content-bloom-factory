
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log("Login attempt:", { email });
    
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in to your content factory",
      });
      navigate("/dashboard");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link to="/" className="text-4xl font-serif font-semibold text-beau-dark hover:text-beau-charcoal transition-colors duration-300">
            ContentCraft
          </Link>
          <p className="text-beau-charcoal/70 mt-2 font-sans">Your AI-powered content factory</p>
        </div>

        {/* Login Form */}
        <Card className="bg-white/90 backdrop-blur-sm border-beau-soft shadow-xl animate-fade-in-delayed">
          <CardHeader className="text-center space-y-3 pb-8">
            <CardTitle className="text-3xl font-serif text-beau-dark">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-beau-charcoal/70 text-lg leading-relaxed">
              Sign in to continue creating amazing content
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-beau-dark font-medium text-base">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="border-beau-soft focus:border-beau-dark bg-white/80 h-12 text-base transition-all duration-300"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-beau-dark font-medium text-base">
                    Password
                  </Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-beau-charcoal/70 hover:text-beau-dark transition-colors duration-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-beau-soft focus:border-beau-dark bg-white/80 h-12 text-base transition-all duration-300"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-beau-dark hover:bg-beau-charcoal text-white font-medium h-12 text-base transition-all duration-300 transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-beau-soft text-center">
              <p className="text-beau-charcoal/70">
                Don't have an account?{" "}
                <Link 
                  to="/signup" 
                  className="text-beau-dark hover:text-beau-charcoal font-medium transition-colors duration-300 underline underline-offset-4"
                >
                  Create one
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
