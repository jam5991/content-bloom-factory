
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowDown, Plus, CheckCircle, Share2, Sparkles } from "lucide-react";

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animation on mount
  useState(() => {
    setTimeout(() => setIsVisible(true), 100);
  });

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-beau-soft z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-serif font-semibold text-beau-dark">
            ContentCraft
          </div>
          <div className="flex gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-beau-charcoal hover:text-beau-dark hover:bg-beau-warm/50 transition-all duration-300">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-beau-dark hover:bg-beau-charcoal text-white transition-all duration-300 transform hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-5xl">
          <div className={`mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Sparkles className="h-16 w-16 text-beau-dark mx-auto mb-6 animate-gentle-float" />
          </div>
          
          <h1 className={`text-6xl md:text-8xl font-serif font-semibold text-beau-dark mb-8 leading-tight transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Boost je business
            <span className="block mt-2 text-beau-charcoal/80">met AI</span>
          </h1>
          
          <p className={`text-xl md:text-2xl text-beau-charcoal/70 mb-12 max-w-3xl mx-auto leading-relaxed font-sans transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Jouw persoonlijke AI-expert die je helpt om AI voor jou te laten werken.
            Genereer, goedkeur en publiceer automatisch boeiende sociale media content.
          </p>

          <div className={`flex flex-col sm:flex-row gap-6 justify-center mb-20 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Link to="/signup">
              <Button size="lg" className="bg-beau-dark hover:bg-beau-charcoal text-white px-10 py-6 text-lg font-medium transition-all duration-300 transform hover:scale-105">
                Zo kan ik je helpen
              </Button>
            </Link>
            <Link to="#how-it-works">
              <Button variant="outline" size="lg" className="border-beau-soft text-beau-dark hover:bg-beau-warm/50 px-10 py-6 text-lg transition-all duration-300">
                Ontdek meer
              </Button>
            </Link>
          </div>

          <div className={`animate-bounce transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <ArrowDown className="h-8 w-8 text-beau-charcoal/50 mx-auto" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-24 px-6 bg-white/60">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-serif font-semibold text-beau-dark mb-8">
              Hoe het werkt
            </h2>
            <p className="text-xl text-beau-charcoal/70 max-w-2xl mx-auto leading-relaxed">
              Drie eenvoudige stappen om je sociale media aanwezigheid te transformeren
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <Card className="p-10 bg-white/90 border-beau-soft hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
              <div className="bg-beau-yellow/30 rounded-full w-20 h-20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-10 w-10 text-beau-dark" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-beau-dark mb-6">
                Creëer & Genereer
              </h3>
              <p className="text-beau-charcoal/70 leading-relaxed text-lg">
                Deel je content brief met onderwerpen, toon en doelgroep. 
                Onze AI-agenten genereren op maat gemaakte content voor elk platform.
              </p>
            </Card>

            <Card className="p-10 bg-white/90 border-beau-soft hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
              <div className="bg-beau-warm/50 rounded-full w-20 h-20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-10 w-10 text-beau-dark" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-beau-dark mb-6">
                Beoordeel & Keur Goed
              </h3>
              <p className="text-beau-charcoal/70 leading-relaxed text-lg">
                Bekijk je content in onze elegante goedkeuringswachtrij. 
                Maak aanpassingen, genereer variaties of keur goed met één klik.
              </p>
            </Card>

            <Card className="p-10 bg-white/90 border-beau-soft hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
              <div className="bg-beau-yellow/20 rounded-full w-20 h-20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Share2 className="h-10 w-10 text-beau-dark" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-beau-dark mb-6">
                Publiceer & Volg
              </h3>
              <p className="text-beau-charcoal/70 leading-relaxed text-lg">
                Publiceer automatisch naar Instagram, Facebook, LinkedIn en X. 
                Volg prestaties en optimaliseer je strategie in de loop van de tijd.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-5xl md:text-6xl font-serif font-semibold text-beau-dark mb-8">
            Klaar om je content strategie te transformeren?
          </h2>
          <p className="text-xl text-beau-charcoal/70 mb-12 leading-relaxed max-w-2xl mx-auto">
            Sluit je aan bij honderden creators en merken die hun sociale media succes hebben geautomatiseerd
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-beau-dark hover:bg-beau-charcoal text-white px-12 py-6 text-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg">
              Start nu gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-beau-dark text-white">
        <div className="container mx-auto text-center">
          <div className="text-3xl font-serif font-semibold mb-4">
            ContentCraft
          </div>
          <p className="text-white/70 mb-8 text-lg">
            AI-gedreven sociale media content die converteert
          </p>
          <div className="text-sm text-white/50">
            © 2024 ContentCraft. Alle rechten voorbehouden.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
