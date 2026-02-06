import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Globe, BadgeCheck, Loader2, ChevronLeft, ChevronRight, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import logoGold from "@/assets/logoGOLD.webp";
import relaisChateauxLogo from "@/assets/relais-chateaux-logo.png";

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
  images: string[] | null;
  pdf_url: string | null;
}

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
  const isRelaisChateaux = business.categories?.includes("Relais & Châteaux");
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
            {/* Logo */}
            {business.logo_url && (
              <div className="w-20 h-20 rounded-lg border bg-white p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={business.logo_url}
                  alt={`Logo ${business.name}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className={`text-4xl font-bold ${isVerified ? "text-white" : "text-foreground"}`}>{business.name}</h1>
                {business.wtuce_status === "verified" && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 px-3 py-1.5">
                    <BadgeCheck className="h-4 w-4" />
                    WTUCE Vérifié
                  </Badge>
                )}
                {isRelaisChateaux && (
                  <img 
                    src={relaisChateauxLogo} 
                    alt="Relais & Châteaux" 
                    className="h-20 object-contain"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>{business.address || business.city}, {business.region}</span>
          </div>
          <Link
            to={`/city/${encodeURIComponent(business.city)}`}
            className="inline-flex items-center gap-2 mt-2 text-primary hover:underline text-sm"
          >
            <MapPin className="h-4 w-4" />
            Voir toutes les entreprises à {business.city}
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {business.images && business.images.length > 0 && (
              <Card className="overflow-hidden">
                <div className="relative aspect-video">
                  <img
                    src={business.images[currentImageIndex]}
                    alt={`${business.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {business.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === 0 ? business.images!.length - 1 : prev - 1
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === business.images!.length - 1 ? 0 : prev + 1
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {business.images.length}
                      </div>
                    </>
                  )}
                </div>
                {business.images.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {business.images.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          idx === currentImageIndex 
                            ? "border-primary" 
                            : "border-transparent hover:border-muted-foreground"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Miniature ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

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

            {/* PDF Document */}
            {business.pdf_url && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Document</h2>
                  <div className="space-y-4">
                    {/* PDF Preview */}
                    <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
                      <iframe
                        src={`${business.pdf_url}#toolbar=0&navpanes=0`}
                        className="w-full h-full"
                        title="PDF Document"
                      />
                    </div>
                    {/* Download Button */}
                    <a
                      href={business.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-5 w-5" />
                      Télécharger le PDF
                    </a>
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