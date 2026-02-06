import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Globe, BadgeCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import logoGold from "@/assets/logoGOLD.webp";

interface Business {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  services: string[] | null;
  city: string;
  region: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  wtuce_status: "verified" | "pending" | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching business:", error);
      } else {
        setBusiness(data);
      }
      setIsLoading(false);
    };

    fetchBusiness();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Entreprise non trouvée</h1>
          <Link to="/" className="text-primary hover:underline">
            Retour à l'accueil
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isVerified = business.wtuce_status === "verified";

  return (
    <div className={`min-h-screen ${isVerified ? "bg-gradient-to-b from-black from-50% to-gold" : "bg-background"}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-24">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la recherche
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 flex-wrap">
            <h1 className={`text-4xl font-bold ${isVerified ? "text-white" : "text-foreground"}`}>{business.name}</h1>
            {business.wtuce_status === "verified" && (
              <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 px-3 py-1.5">
                <BadgeCheck className="h-4 w-4" />
                WTUCE Vérifié
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>{business.address || business.city}, {business.region}</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {business.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">À propos</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {business.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {business.services && business.services.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Services</h2>
                  <div className="flex flex-wrap gap-2">
                    {business.services.map((service, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories */}
            {business.categories && business.categories.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Catégories</h2>
                  <div className="flex flex-wrap gap-2">
                    {business.categories.map((category, idx) => (
                      <Badge key={idx} variant="outline" className="px-3 py-1">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Contact & Map */}
          <div className="space-y-6">
            {/* WTUCE Logo for verified businesses */}
            {isVerified && (
              <div className="flex justify-center">
                <img 
                  src={logoGold} 
                  alt="WTUCE Vérifié" 
                  className="w-[250px] h-[225px] object-contain"
                />
              </div>
            )}
            
            {/* Google Maps */}
            <GoogleMapEmbed
              address={business.address || `${business.city}, ${business.region}`}
              businessName={business.name}
              latitude={business.latitude}
              longitude={business.longitude}
            />

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Contact</h2>
                <div className="space-y-4">
                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      {business.phone}
                    </a>
                  )}
                  {business.email && (
                    <a
                      href={`mailto:${business.email}`}
                      className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      {business.email}
                    </a>
                  )}
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-primary hover:underline"
                    >
                      <Globe className="h-5 w-5" />
                      Visiter le site web
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-primary text-primary-foreground text-center py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Réserver maintenant
              </a>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BusinessDetail;