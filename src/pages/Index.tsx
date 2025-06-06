
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowDown, Plus, CheckCircle, Share2 } from "lucide-react";

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animation on mount
  useState(() => {
    setTimeout(() => setIsVisible(true), 100);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-white via-cream to-sage/10">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-warm-white/80 backdrop-blur-md border-b border-sage/20 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-serif font-semibold text-charcoal">
            ContentCraft
          </div>
          <div className="flex gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-charcoal hover:text-primary">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className={`text-6xl md:text-7xl font-serif font-semibold text-charcoal mb-8 leading-tight transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Your AI-Powered
            <span className="text-terracotta block mt-2">Content Factory</span>
          </h1>
          
          <p className={`text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Generate, approve, and automatically publish engaging social media content across all platforms. 
            Let AI agents handle your content strategy while you focus on growing your brand.
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Link to="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-medium">
                Start Creating Content
              </Button>
            </Link>
            <Link to="/demo">
              <Button variant="outline" size="lg" className="border-sage text-charcoal hover:bg-sage/10 px-8 py-4 text-lg">
                Watch Demo
              </Button>
            </Link>
          </div>

          <div className={`animate-bounce transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <ArrowDown className="h-8 w-8 text-sage mx-auto" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-cream/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-semibold text-charcoal mb-6">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform your social media presence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-warm-white border-sage/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="bg-terracotta/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Plus className="h-8 w-8 text-terracotta" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-charcoal mb-4">
                Create & Generate
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Submit your content brief with topics, tone, and target audience. 
                Our AI agents generate tailored content for each platform.
              </p>
            </Card>

            <Card className="p-8 bg-warm-white border-sage/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="bg-sage/20 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-sage" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-charcoal mb-4">
                Review & Approve
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Preview your content in our elegant approval queue. 
                Make edits, regenerate variations, or approve with one click.
              </p>
            </Card>

            <Card className="p-8 bg-warm-white border-sage/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Share2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-charcoal mb-4">
                Publish & Track
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically publish to Instagram, Facebook, LinkedIn, and X. 
                Track performance and optimize your strategy over time.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary/5 to-terracotta/5">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-serif font-semibold text-charcoal mb-6">
            Ready to Transform Your Content Strategy?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Join hundreds of creators and brands who've automated their social media success
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 text-lg font-medium">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-charcoal text-warm-white">
        <div className="container mx-auto text-center">
          <div className="text-2xl font-serif font-semibold mb-4">
            ContentCraft
          </div>
          <p className="text-warm-white/70 mb-6">
            AI-powered social media content that converts
          </p>
          <div className="text-sm text-warm-white/50">
            © 2024 ContentCraft. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
