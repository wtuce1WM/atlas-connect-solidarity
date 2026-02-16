import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnimatedBusinessStrip from "@/components/AnimatedBusinessStrip";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BlogAnimations = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate("/blog")}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white font-['Playfair_Display'] italic">
            Animations
          </h1>
          <p className="text-white/60 mt-2">Démonstration des bandeau animés d'établissements</p>
        </div>
      </div>

      <div className="py-12 space-y-16">
        {/* Version fond noir */}
        <div>
          <div className="container mx-auto px-4 mb-4">
            <h2 className="text-xl font-bold text-foreground">Version fond noir</h2>
          </div>
          <AnimatedBusinessStrip
            title="{count} adresses à découvrir"
            category="Hôtellerie"
            lightMode={false}
          />
        </div>

        {/* Version fond blanc */}
        <div>
          <div className="container mx-auto px-4 mb-4">
            <h2 className="text-xl font-bold text-foreground">Version fond blanc</h2>
          </div>
          <AnimatedBusinessStrip
            title="{count} adresses à découvrir"
            category="Hôtellerie"
            lightMode={true}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogAnimations;
