
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // TODO: Implement Supabase authentication
    console.log("Signup attempt:", { email, password });
    
    // Simulate signup for now
    setTimeout(() => {
      toast({
        title: "Account created successfully!",
        description: "Welcome to your content factory",
      });
      setIsLoading(false);
    }, 1000);
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

        {/* Signup Form */}
        <Card className="bg-white/90 backdrop-blur-sm border-beau-soft shadow-xl animate-fade-in-delayed">
          <CardHeader className="text-center space-y-3 pb-8">
            <CardTitle className="text-3xl font-serif text-beau-dark">
              Start Creating
            </CardTitle>
            <CardDescription className="text-beau-charcoal/70 text-lg leading-relaxed">
              Join thousands of creators automating their social media presence
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
                <Label htmlFor="password" className="text-beau-dark font-medium text-base">
                  Password
                </Label>
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

              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-beau-dark font-medium text-base">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? "Creating your account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-beau-soft text-center">
              <p className="text-beau-charcoal/70">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="text-beau-dark hover:text-beau-charcoal font-medium transition-colors duration-300 underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-beau-charcoal/60">
          <p>By creating an account, you agree to our terms of service and privacy policy</p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
