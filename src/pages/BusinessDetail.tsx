import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Globe, BadgeCheck, Loader2, ChevronLeft, ChevronRight, FileText, Download, ShoppingBag, Facebook, Instagram, Linkedin, Youtube, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import ImageLightbox from "@/components/ImageLightbox";
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
  label1_url: string | null;
  online_shop_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  tripadvisor_url: string | null;
  booking_url: string | null;
  google_maps_url: string | null;
  video_1_url: string | null;
}

// Helper to convert video URL to embeddable format
const getEmbedUrl = (url: string): string | null => {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  // Direct video link
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return url;
  }
  return null;
};

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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
                {business.label1_url && (
                  <img 
                    src={business.label1_url} 
                    alt="Label1" 
                    className="h-16 object-contain"
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
            {/* Video */}
            {business.video_1_url && (() => {
              const embedUrl = getEmbedUrl(business.video_1_url);
              if (!embedUrl) return null;
              
              const isDirectVideo = business.video_1_url.match(/\.(mp4|webm|ogg)$/i);
              
              return (
                <Card className="overflow-hidden">
                  <div className="aspect-video">
                    {isDirectVideo ? (
                      <video
                        src={embedUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Vidéo de présentation"
                      />
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* Image Gallery */}
            {business.images && business.images.length > 0 && (
              <Card className="overflow-hidden">
                <div className="relative aspect-video">
                  <img
                    src={business.images[currentImageIndex]}
                    alt={`${business.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsLightboxOpen(true)}
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

            {/* Lightbox */}
            {business.images && business.images.length > 0 && (
              <ImageLightbox
                images={business.images}
                currentIndex={currentImageIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                onPrevious={() => setCurrentImageIndex((prev) => 
                  prev === 0 ? business.images!.length - 1 : prev - 1
                )}
                onNext={() => setCurrentImageIndex((prev) => 
                  prev === business.images!.length - 1 ? 0 : prev + 1
                )}
              />
            )}

            {/* Description */}
            {business.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">À propos</h2>
                  <div 
                    className="text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: business.description }}
                  />
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

            {/* PDF */}
            {business.pdf_url && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-3">PDF</h2>
                  <div className="space-y-3">
                    {/* PDF Preview */}
                    <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
                      <iframe
                        src={`${business.pdf_url}#toolbar=0&navpanes=0`}
                        className="w-full h-full"
                        title="PDF"
                      />
                    </div>
                    {/* Download Button */}
                    <a
                      href={business.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger
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
                  {business.online_shop_url && (
                    <a
                      href={business.online_shop_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-primary hover:underline"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Boutique en ligne
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            {(business.facebook_url || business.instagram_url || business.linkedin_url || business.youtube_url || business.tiktok_url || business.whatsapp || business.twitter_url) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Réseaux sociaux</h2>
                  <div className="flex flex-wrap gap-3">
                    {business.facebook_url && (
                      <a
                        href={business.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1877F2] text-white hover:opacity-80 transition-opacity"
                        title="Facebook"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {business.instagram_url && (
                      <a
                        href={business.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white hover:opacity-80 transition-opacity"
                        title="Instagram"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {business.linkedin_url && (
                      <a
                        href={business.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0A66C2] text-white hover:opacity-80 transition-opacity"
                        title="LinkedIn"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {business.youtube_url && (
                      <a
                        href={business.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FF0000] text-white hover:opacity-80 transition-opacity"
                        title="YouTube"
                      >
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {business.tiktok_url && (
                      <a
                        href={business.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:opacity-80 transition-opacity"
                        title="TikTok"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                      </a>
                    )}
                    {business.twitter_url && (
                      <a
                        href={business.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:opacity-80 transition-opacity"
                        title="X (Twitter)"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    )}
                    {business.whatsapp && (
                      <a
                        href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white hover:opacity-80 transition-opacity"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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