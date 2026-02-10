import { useEffect, useState } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Globe, BadgeCheck, Loader2, ChevronLeft, ChevronRight, FileText, Download, ShoppingBag, Facebook, Instagram, Linkedin, Youtube, MessageCircle, Clock, AlertTriangle, ChevronDown, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import ImageLightbox from "@/components/ImageLightbox";
import RelatedEstablishments from "@/components/RelatedEstablishments";
import ServiceListItem from "@/components/ServiceListItem";
import { useValidatedImages, useValidatedUrl } from "@/hooks/useValidatedImages";
import logoGold from "@/assets/logoGOLDsimple.webp";
import relaisChateauxLogo from "@/assets/relais-chateaux-logo.png";
import restaurantGuruLogo from "@/assets/restaurant-guru-logo.webp";

interface OpeningHour {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  monday?: OpeningHour;
  tuesday?: OpeningHour;
  wednesday?: OpeningHour;
  thursday?: OpeningHour;
  friday?: OpeningHour;
  saturday?: OpeningHour;
  sunday?: OpeningHour;
}

interface Business {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  services: string[] | null;
  keywords: string[] | null;
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
  online_shop_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_url: string | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  google_reviews_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  booking_url: string | null;
  google_maps_url: string | null;
  pinterest_url: string | null;
  airbnb_url: string | null;
  skype: string | null;
  vimeo_url: string | null;
  video_1_url: string | null;
  opening_hours: OpeningHours | null;
  rating: number | null;
  reserve_now_url: string | null;
  show_opening_hours: boolean | null;
  is_open_24h: boolean | null;
  ice: string | null;
  kp_regroupement: string | null;
  vacation_dates: VacationDate[] | null;
  account_type: string | null;
  neighborhood: string | null;
  gamme_id: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
}

interface VacationDate {
  start_date: string;
  end_date: string;
}

interface BusinessLabel {
  id: string;
  label_id: string;
  custom_url: string | null;
  label: {
    id: string;
    name_fr: string;
    image_url: string | null;
    url_fr: string | null;
  } | null;
}

// Helper to convert video URL to embeddable format
const getEmbedUrl = (url: string): { url: string; type: 'iframe' | 'video' | 'facebook' } | null => {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { url: `https://www.youtube.com/embed/${youtubeMatch[1]}`, type: 'iframe' };
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { url: `https://player.vimeo.com/video/${vimeoMatch[1]}`, type: 'iframe' };
  }
  // Facebook video (various formats)
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const encodedUrl = encodeURIComponent(url);
    return { url: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false`, type: 'facebook' };
  }
  // Direct video link
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return { url, type: 'video' };
  }
  return null;
};

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLabels, setBusinessLabels] = useState<BusinessLabel[]>([]);
  const [gamme, setGamme] = useState<Gamme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Validate images and PDF URLs
  const { validImages, isValidating: isValidatingImages, brokenCount: brokenImagesCount } = useValidatedImages(business?.images ?? null);
  const { isValid: isPdfValid, isValidating: isValidatingPdf } = useValidatedUrl(business?.pdf_url ?? null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!id) return;

      // Fetch business data
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching business:", error);
        setBusiness(null);
      } else if (data) {
        setBusiness({
          ...data,
          opening_hours: data.opening_hours as OpeningHours | null,
          vacation_dates: (data.vacation_dates as unknown as VacationDate[]) || null,
        });
        
        // Fetch business labels
        const { data: labelsData } = await supabase
          .from("business_labels" as any)
          .select("id, label_id, custom_url")
          .eq("business_id", id)
          .order("sort_order", { ascending: true });
        
        if (labelsData && labelsData.length > 0) {
          // Fetch label details
          const labelIds = (labelsData as any[]).map(bl => bl.label_id);
          const { data: labelDetails } = await supabase
            .from("labels" as any)
            .select("id, name_fr, image_url, url_fr")
            .in("id", labelIds);
          
          const labelsWithDetails = (labelsData as any[]).map(bl => ({
            ...bl,
            label: (labelDetails as any[])?.find(l => l.id === bl.label_id) || null
          }));
          
          setBusinessLabels(labelsWithDetails as BusinessLabel[]);
        }

        // Fetch gamme if business has gamme_id
        if (data.gamme_id) {
          const { data: gammeData } = await supabase
            .from("gammes")
            .select("id, name_fr, color_hex")
            .eq("id", data.gamme_id)
            .maybeSingle();
          if (gammeData) setGamme(gammeData as Gamme);
        }
      } else {
        setBusiness(null);
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
    return <Navigate to="/404" replace />;
  }

  const isVerified = business.wtuce_status === "verified";
  const isInstitution = business.account_type?.toLowerCase() === "institution";
  return (
    <div className={`min-h-screen ${isVerified ? "bg-gradient-to-b from-black from-50% to-gold" : "bg-background"}`}>
      <Header />
      
      <main className="container mx-auto px-0 md:px-0 lg:px-4 py-24">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 mb-8 transition-colors ${isVerified ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Header */}
        <div className="mb-8 px-4 lg:px-0">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 flex-wrap">
            {/* Logo */}
            {business.logo_url && (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg border bg-white p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={business.logo_url}
                  alt={`Logo ${business.name}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col items-center sm:items-start gap-2">
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap justify-center sm:justify-start">
                  <h1 className={`text-2xl sm:text-4xl font-semibold ${isVerified ? "text-white" : "text-foreground"}`} style={{ fontFamily: "'Raleway', sans-serif" }}>{business.name}</h1>
                  {/* Business Labels - hidden on mobile */}
                  {businessLabels.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 flex-wrap">
                      {businessLabels.map((bl) => {
                        if (!bl.label?.image_url) return null;
                        const linkUrl = bl.custom_url || bl.label.url_fr;
                        
                        return linkUrl ? (
                          <a
                            key={bl.id}
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={bl.label.image_url}
                              alt={bl.label.name_fr}
                              className="h-20 object-contain"
                            />
                          </a>
                        ) : (
                          <img
                            key={bl.id}
                            src={bl.label.image_url}
                            alt={bl.label.name_fr}
                            className="h-20 object-contain"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                {(gamme || (business.wtuce_status === "verified" && !isInstitution)) && (
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    {gamme && (
                      <Badge 
                        className="text-xs text-black border border-black whitespace-nowrap"
                        style={{ backgroundColor: gamme.color_hex || '#666666' }}
                      >
                        {gamme.name_fr}
                      </Badge>
                    )}
                    {business.wtuce_status === "verified" && !isInstitution && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 px-3 py-1.5">
                        <BadgeCheck className="h-4 w-4" />
                        WTUCE Vérifié
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Rating and WTUCE Logo - below title on mobile, inline on desktop */}
              {isVerified && !isInstitution && (
                <div className="flex items-center justify-center sm:justify-start gap-3 mt-3 sm:hidden">
                  {business.rating !== null && business.rating !== undefined && (
                    <div className="text-gold font-bold text-4xl italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {business.rating}/20
                    </div>
                  )}
                  <img 
                    src={logoGold} 
                    alt="WTUCE Vérifié" 
                    className="w-[60px] h-[54px] object-contain"
                  />
                </div>
              )}
            </div>
            
            {/* Rating and WTUCE Logo for verified businesses - desktop only */}
            {isVerified && !isInstitution && (
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {business.rating !== null && business.rating !== undefined && (
                  <div className="text-gold font-bold text-5xl italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {business.rating}/20
                  </div>
                )}
                <img 
                  src={logoGold} 
                  alt="WTUCE Vérifié" 
                  className="w-[80px] h-[72px] object-contain"
                />
              </div>
            )}
          </div>
          <div className={`flex items-center justify-center sm:justify-start gap-2 mt-3 ${isVerified ? "text-white/70" : "text-muted-foreground"}`}>
            <MapPin className="h-5 w-5" />
            <span>{business.address || business.city}{business.neighborhood ? <> - <strong>{business.neighborhood}</strong></> : ""}</span>
          </div>
          {/* Phone & WhatsApp quick links */}
          {(business.phone || business.whatsapp) && (
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 flex-wrap">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className={`inline-flex items-center gap-2 font-semibold transition-colors ${isVerified ? "text-gold hover:text-gold/80" : "text-foreground hover:text-primary"}`}
                >
                  <Phone className="h-5 w-5" />
                  {business.phone}
                </a>
              )}
              {business.whatsapp && (
                <a
                  href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold hover:opacity-80 transition-opacity"
                  style={{ color: "#25D366" }}
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </a>
              )}
            </div>
          )}
          <div className="flex justify-center sm:justify-start">
            <Link
              to={`/city/${encodeURIComponent(business.city)}`}
              className="inline-flex items-center gap-2 mt-2 text-primary hover:underline text-sm"
            >
              <MapPin className="h-4 w-4" />
              Voir toutes les entreprises à {business.city}
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 overflow-x-hidden">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6 overflow-hidden">
            {/* Hook */}
            {(() => {
              const hook = language === 'ar' ? (business.hook_ar || business.hook_fr) : language === 'en' ? (business.hook_en || business.hook_fr) : business.hook_fr;
              if (!hook) return null;
              return (
                <p className={`text-2xl md:text-3xl font-semibold italic leading-snug text-center ${isVerified ? 'text-white' : 'text-foreground/80'}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {hook}
                </p>
              );
            })()}

            {/* Video */}
            {business.video_1_url && (() => {
              const embedData = getEmbedUrl(business.video_1_url);
              if (!embedData) return null;
              
              return (
                <Card className="overflow-hidden bg-black border-black max-w-full">
                  <div className="aspect-video w-full relative">
                    {embedData.type === 'video' ? (
                      <>
                        <video
                          src={embedData.url}
                          controls
                          className="w-full h-full object-cover"
                          onPlay={() => setIsVideoPlaying(true)}
                          onPause={() => setIsVideoPlaying(false)}
                          onEnded={() => setIsVideoPlaying(false)}
                        />
                        {!isVideoPlaying && (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity duration-300"
                            onClick={(e) => {
                              const video = (e.currentTarget.previousElementSibling) as HTMLVideoElement;
                              if (video) video.play();
                            }}
                          >
                            <div className="rounded-full bg-white/90 p-4 shadow-lg">
                              <Play className="h-10 w-10 text-black fill-black" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <iframe
                        src={embedData.url}
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
            {isValidatingImages && business.images && business.images.length > 0 && (
              <Card className="overflow-hidden bg-black border-black">
                <div className="flex items-center justify-center bg-black min-h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </Card>
            )}
            {!isValidatingImages && validImages.length > 0 && (
              <Card className="overflow-hidden bg-black border-black">
                {brokenImagesCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 text-sm border-b">
                    <AlertTriangle className="h-4 w-4" />
                    {brokenImagesCount} image(s) indisponible(s)
                  </div>
                )}
                <div className="relative flex items-center justify-center bg-black min-h-[200px]">
                  <img
                    src={validImages[currentImageIndex]}
                    alt={`${business.name} - Image ${currentImageIndex + 1}`}
                    className="max-w-full max-h-[70vh] w-auto h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsLightboxOpen(true)}
                  />
                  {validImages.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === 0 ? validImages.length - 1 : prev - 1
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === validImages.length - 1 ? 0 : prev + 1
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {validImages.length}
                      </div>
                    </>
                  )}
                </div>
                {validImages.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto bg-black">
                    {validImages.map((url, idx) => (
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
            {validImages.length > 0 && (
              <ImageLightbox
                images={validImages}
                currentIndex={currentImageIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                onPrevious={() => setCurrentImageIndex((prev) => 
                  prev === 0 ? validImages.length - 1 : prev - 1
                )}
                onNext={() => setCurrentImageIndex((prev) => 
                  prev === validImages.length - 1 ? 0 : prev + 1
                )}
              />
            )}

            {/* Description */}
            {business.description && (
              <Card>
                <CardContent className="p-6">
                  <div 
                    className="text-muted-foreground leading-relaxed prose max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg prose-a:text-primary [&_p:empty]:min-h-[1em] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 max-h-[400px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: business.description }}
                  />
                </CardContent>
              </Card>
            )}

            {/* PDF - Collapsible */}
            {business.pdf_url && !isValidatingPdf && isPdfValid && (
              <Card>
                <CardContent className="p-4">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents annexes
                      </h2>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 mt-4">
                      {/* PDF Preview */}
                      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
                        <iframe
                          src={`${business.pdf_url}#toolbar=0&navpanes=0`}
                          className="w-full h-full"
                          title="Documents annexes"
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
                  </details>
                </CardContent>
              </Card>
            )}
            {business.pdf_url && !isValidatingPdf && !isPdfValid && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Documents annexes indisponibles</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sous-catégories, Services */}
            {/* Services */}
            {business.services && business.services.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">Services</h2>
                  <ul className="space-y-3 text-foreground max-h-[400px] overflow-y-auto">
                    {[...business.services].sort((a, b) => a.localeCompare(b, 'fr')).map((service, index) => (
                      <ServiceListItem 
                        key={index} 
                        service={service} 
                        currentBusinessId={business.id}
                        city={business.city}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Related Establishments (same KP regroupement) */}
            {business.kp_regroupement && (
              <RelatedEstablishments
                currentBusinessId={business.id}
                kpRegroupement={business.kp_regroupement}
                isVerified={isVerified}
              />
            )}
          </div>

          {/* Sidebar - Contact & Map */}
          <div className="space-y-6">
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
                  {business.whatsapp && (
                    <a
                      href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 text-[#25D366]" />
                      WhatsApp
                    </a>
                  )}
                  {business.skype && (
                    <a
                      href={`skype:${business.skype}?chat`}
                      className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                    >
                      <svg className="h-5 w-5 text-[#00AFF0]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882c.227-.9.345-1.836.345-2.798 0-3.151-1.24-6.105-3.494-8.319C17.79.651 14.791-.569 11.591-.569c-.866 0-1.72.086-2.553.252C7.688-1.228 6.126-1.68 4.469-1.68c-4.687 0-8.5 3.813-8.5 8.5 0 1.599.442 3.095 1.209 4.376-.27.939-.414 1.922-.414 2.931 0 3.151 1.24 6.105 3.494 8.319 2.214 2.175 5.213 3.395 8.413 3.395.866 0 1.72-.086 2.553-.252 1.351.911 2.913 1.363 4.57 1.363 4.687 0 8.5-3.813 8.5-8.5 0-1.599-.442-3.095-1.209-4.376"/>
                      </svg>
                      Skype
                    </a>
                  )}
                  {business.address && (
                    <div className="flex items-start gap-3 text-foreground">
                      <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{business.address}</span>
                    </div>
                  )}
                  {business.neighborhood && (
                    <div className="flex items-start gap-3 text-foreground">
                      <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>
                        Autres lieux intéressants de :{" "}
                        <Link
                          to={`/neighborhood/${encodeURIComponent(business.neighborhood)}?city=${encodeURIComponent(business.city)}`}
                          className="font-bold text-primary hover:underline"
                        >
                          {business.neighborhood}
                        </Link>
                      </span>
                    </div>
                  )}
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

            {/* Avis clients */}
            {(business.tripadvisor_review_url || business.restaurant_guru_url || business.google_reviews_url) && (
              <Card className="bg-white border">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Avis clients
                    {(() => {
                      const ratings: { rating: number; count: number }[] = [];
                      if (business.google_rating && business.google_review_count) {
                        ratings.push({ rating: Number(business.google_rating), count: Number(business.google_review_count) });
                      }
                      if (business.tripadvisor_rating && business.tripadvisor_review_count) {
                        ratings.push({ rating: Number(business.tripadvisor_rating), count: Number(business.tripadvisor_review_count) });
                      }
                      if (business.restaurant_guru_rating && business.restaurant_guru_review_count) {
                        ratings.push({ rating: Number(business.restaurant_guru_rating), count: Number(business.restaurant_guru_review_count) });
                      }
                      if (ratings.length === 0) return null;
                      const totalCount = ratings.reduce((sum, r) => sum + r.count, 0);
                      const weightedAvg = ratings.reduce((sum, r) => sum + (r.rating / 5) * 20 * r.count, 0) / totalCount;
                      const avg20 = weightedAvg.toFixed(2).replace('.', ',');
                      return (
                        <span className="text-gold font-bold ml-3 text-2xl">
                          {avg20}/20 <span className="text-lg font-bold text-muted-foreground">sur {totalCount.toLocaleString('fr-FR')} avis</span>
                        </span>
                      );
                    })()}
                  </h2>
                  <div className="space-y-3">
                    {business.tripadvisor_review_url && (
                      <a
                        href={business.tripadvisor_review_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-foreground hover:text-[#00AF87] transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00AF87] text-white flex-shrink-0">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.075 1.598 5.997 5.997 0 0 0 4.04-10.43L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.758c1.91.216 3.716.974 5.198 2.24a5.97 5.97 0 0 0-1.198.754A7.48 7.48 0 0 0 12 8.76a7.48 7.48 0 0 0-4 .992 5.97 5.97 0 0 0-1.198-.754A9.473 9.473 0 0 1 12 6.758zm-6.003 3.02a4.03 4.03 0 1 1 0 8.059 4.03 4.03 0 0 1 0-8.058zm12.006 0a4.03 4.03 0 1 1 0 8.059 4.03 4.03 0 0 1 0-8.058z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">TripAdvisor Avis ↗</span>
                          {(business.tripadvisor_rating != null || business.tripadvisor_review_count != null) && (
                            <div className="text-xs text-muted-foreground">
                              {business.tripadvisor_rating != null && <span className="font-semibold text-[#00AF87]">{business.tripadvisor_rating}/5</span>}
                              {business.tripadvisor_rating != null && business.tripadvisor_review_count != null && <span> · </span>}
                              {business.tripadvisor_review_count != null && <span>{business.tripadvisor_review_count} avis</span>}
                            </div>
                          )}
                        </div>
                      </a>
                    )}
                    {business.restaurant_guru_url && (
                      <a
                        href={business.restaurant_guru_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-foreground hover:text-[#E4322B] transition-colors"
                      >
                        <img src={restaurantGuruLogo} alt="Restaurant Guru" className="w-8 h-8 object-contain flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">Restaurant Guru ↗</span>
                          {(business.restaurant_guru_rating != null || business.restaurant_guru_review_count != null) && (
                            <div className="text-xs text-muted-foreground">
                              {business.restaurant_guru_rating != null && <span className="font-semibold text-[#E4322B]">{business.restaurant_guru_rating}/5</span>}
                              {business.restaurant_guru_rating != null && business.restaurant_guru_review_count != null && <span> · </span>}
                              {business.restaurant_guru_review_count != null && <span>{business.restaurant_guru_review_count} avis</span>}
                            </div>
                          )}
                        </div>
                      </a>
                    )}
                    {business.google_reviews_url && (
                      <a
                        href={business.google_reviews_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-foreground hover:text-[#4285F4] transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 flex-shrink-0">
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">Google Avis ↗</span>
                          {(business.google_rating != null || business.google_review_count != null) && (
                            <div className="text-xs text-muted-foreground">
                              {business.google_rating != null && <span className="font-semibold text-[#4285F4]">{business.google_rating}/5</span>}
                              {business.google_rating != null && business.google_review_count != null && <span> · </span>}
                              {business.google_review_count != null && <span>{business.google_review_count} avis</span>}
                            </div>
                          )}
                        </div>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Media */}
            {(business.facebook_url || business.instagram_url || business.linkedin_url || business.youtube_url || business.tiktok_url || business.twitter_url || business.pinterest_url || business.vimeo_url) && (
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
                    {business.pinterest_url && (
                      <a
                        href={business.pinterest_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#E60023] text-white hover:opacity-80 transition-opacity"
                        title="Pinterest"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                        </svg>
                      </a>
                    )}
                    {business.vimeo_url && (
                      <a
                        href={business.vimeo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1AB7EA] text-white hover:opacity-80 transition-opacity"
                        title="Vimeo"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plateformes de réservation */}
            {(business.booking_url || business.tripadvisor_url || business.airbnb_url) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Plateformes de réservation</h2>
                  <div className="flex flex-wrap gap-3">
                    {business.booking_url && (
                      <a
                        href={business.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#003580] text-white hover:opacity-80 transition-opacity"
                        title="Booking.com"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.273 0v24h10.715c6.066 0 8.739-3.098 8.739-7.133 0-2.829-1.558-5.203-4.107-6.174v-.078c1.908-.893 3.136-2.789 3.136-5.066C20.756 2.36 18.238 0 13.183 0H2.273zm5.882 4.344h3.885c2.127 0 3.156.975 3.156 2.477 0 1.658-1.263 2.593-3.506 2.593H8.155V4.344zm0 9.16h4.274c2.594 0 3.786 1.092 3.786 2.789 0 1.736-1.23 2.672-3.786 2.672H8.155v-5.461z"/>
                        </svg>
                      </a>
                    )}
                    {business.tripadvisor_url && (
                      <a
                        href={business.tripadvisor_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00AF87] text-white hover:opacity-80 transition-opacity"
                        title="TripAdvisor"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.075 1.598 5.997 5.997 0 0 0 4.04-10.43L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.758c1.91.216 3.716.974 5.198 2.24a5.97 5.97 0 0 0-1.198.754A7.48 7.48 0 0 0 12 8.76a7.48 7.48 0 0 0-4 .992 5.97 5.97 0 0 0-1.198-.754A9.473 9.473 0 0 1 12 6.758zm-6.003 3.02a4.03 4.03 0 1 1 0 8.059 4.03 4.03 0 0 1 0-8.058zm12.006 0a4.03 4.03 0 1 1 0 8.059 4.03 4.03 0 0 1 0-8.058zM5.997 11.29a2.49 2.49 0 1 0 0 4.98 2.49 2.49 0 0 0 0-4.98zm12.006 0a2.49 2.49 0 1 0 0 4.98 2.49 2.49 0 0 0 0-4.98zm-12.006 1a1.49 1.49 0 1 1 0 2.98 1.49 1.49 0 0 1 0-2.98zm12.006 0a1.49 1.49 0 1 1 0 2.98 1.49 1.49 0 0 1 0-2.98z"/>
                        </svg>
                      </a>
                    )}
                    {business.airbnb_url && (
                      <a
                        href={business.airbnb_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FF5A5F] text-white hover:opacity-80 transition-opacity"
                        title="Airbnb"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.001 18.275c-.768-1.041-1.497-2.093-2.209-3.155-.717-1.069-1.39-2.164-1.974-3.31-.578-1.138-1.05-2.313-1.05-3.503 0-1.394.575-2.63 1.447-3.501A4.94 4.94 0 0 1 12 3.374c1.353 0 2.63.521 3.567 1.432a4.94 4.94 0 0 1 1.449 3.5c0 1.19-.471 2.366-1.05 3.503-.585 1.147-1.257 2.241-1.974 3.31-.712 1.063-1.441 2.114-2.209 3.155l-.393.521-.389-.52zm.002-8.348a2.033 2.033 0 0 0 2.032-2.032 2.033 2.033 0 0 0-2.032-2.032 2.033 2.033 0 0 0-2.032 2.032c0 1.12.912 2.032 2.032 2.032zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            {business.reserve_now_url && (
              <a
                href={business.reserve_now_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-primary text-primary-foreground text-center py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Réserver maintenant
              </a>
            )}


            {/* Opening Hours */}
            {business.show_opening_hours !== false && (business.is_open_24h || (business.opening_hours && Object.keys(business.opening_hours).length > 0)) && (() => {
              if (business.is_open_24h) {
                return (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Horaires d'ouverture
                      </h2>
                      <div className="text-sm font-medium text-primary">Ouvert 24h/24</div>
                    </CardContent>
                  </Card>
                );
              }

              const dayNames: { [key: string]: string } = {
                monday: "Lundi",
                tuesday: "Mardi",
                wednesday: "Mercredi",
                thursday: "Jeudi",
                friday: "Vendredi",
                saturday: "Samedi",
                sunday: "Dimanche"
              };
              const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
              const hours = business.opening_hours as OpeningHours;
              
              const hasAnyHours = dayOrder.some(day => {
                const dayHours = hours[day as keyof OpeningHours];
                return dayHours && (dayHours.closed || (dayHours.open && dayHours.close));
              });
              
              if (!hasAnyHours) return null;
              
              return (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Horaires d'ouverture
                    </h2>
                    <div className="space-y-2">
                      {dayOrder.map(day => {
                        const dayHours = hours[day as keyof OpeningHours];
                        if (!dayHours) return null;
                        
                        return (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="font-medium">{dayNames[day]}</span>
                            <span className="text-muted-foreground">
                              {dayHours.closed 
                                ? "Fermé" 
                                : dayHours.open && dayHours.close 
                                  ? `${dayHours.open} - ${dayHours.close}`
                                  : "—"
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Vacation Dates */}
            {business.vacation_dates && business.vacation_dates.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Vacances / Fermetures exceptionnelles
                  </h2>
                  <div className="space-y-2">
                    {business.vacation_dates.map((vd, idx) => (
                      <div key={idx} className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-foreground">
                        Du {format(parseISO(vd.start_date), "d MMMM yyyy", { locale: fr })} au {format(parseISO(vd.end_date), "d MMMM yyyy", { locale: fr })}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer variant={isVerified ? "verified" : "default"} />
    </div>
  );
};

export default BusinessDetail;