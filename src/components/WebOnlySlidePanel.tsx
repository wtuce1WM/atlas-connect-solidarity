import { useState, useEffect } from "react";
import { Globe, Phone, Mail, ExternalLink, ShoppingBag, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ShareButton from "@/components/ShareButton";
import BookmarkButton from "@/components/BookmarkButton";
import { FacebookIcon, InstagramIcon, LinkedInIcon, YouTubeIcon, TikTokIcon, TwitterIcon, PinterestIcon, VimeoIcon } from "@/components/staff/SocialMediaIcons";
import { Skeleton } from "@/components/ui/skeleton";

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface WebOnlySlidePanelProps {
  businessId: string;
  onClose: () => void;
}

interface WebOnlyBusiness {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  logo_url: string | null;
  logo_bg: string | null;
  images: string[] | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  online_shop_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  categories: string[] | null;
  main_category: string | null;
}

const WebOnlySlidePanel = ({ businessId, onClose }: WebOnlySlidePanelProps) => {
  const { language } = useLanguage();
  const [business, setBusiness] = useState<WebOnlyBusiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBusiness = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, description, hook_fr, hook_en, hook_ar, logo_url, logo_bg, images, city, address, phone, email, website, whatsapp, online_shop_url, facebook_url, instagram_url, linkedin_url, youtube_url, tiktok_url, twitter_url, pinterest_url, vimeo_url, categories, main_category")
        .eq("id", businessId)
        .eq("is_active", true)
        .maybeSingle();

      setBusiness(data as WebOnlyBusiness | null);
      setIsLoading(false);
    };
    fetchBusiness();
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background p-6 space-y-6">
        <Skeleton className="w-full aspect-video rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (!business) return null;

  const shopUrl = business.online_shop_url || business.website;
  const hook =
    language === "en" ? business.hook_en :
    language === "ar" ? business.hook_ar :
    business.hook_fr;
  const heroImage = business.images?.[0] || null;

  const socialLinks = [
    { url: business.instagram_url, icon: <InstagramIcon className="h-5 w-5" />, label: "Instagram" },
    { url: business.facebook_url, icon: <FacebookIcon className="h-5 w-5" />, label: "Facebook" },
    { url: business.tiktok_url, icon: <TikTokIcon className="h-5 w-5" />, label: "TikTok" },
    { url: business.youtube_url, icon: <YouTubeIcon className="h-5 w-5" />, label: "YouTube" },
    { url: business.linkedin_url, icon: <LinkedInIcon className="h-5 w-5" />, label: "LinkedIn" },
    { url: business.twitter_url, icon: <TwitterIcon className="h-5 w-5" />, label: "Twitter" },
    { url: business.pinterest_url, icon: <PinterestIcon className="h-5 w-5" />, label: "Pinterest" },
    { url: business.vimeo_url, icon: <VimeoIcon className="h-5 w-5" />, label: "Vimeo" },
  ].filter((l) => l.url);

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Hero image / logo area */}
      <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Logo + name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
          {business.logo_url && (
            <div
              className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-background shadow-lg"
              style={{ backgroundColor: business.logo_bg || "#fff" }}
            >
              <img
                src={business.logo_url}
                alt=""
                className="w-full h-full object-contain p-1"
              />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{business.name}</h2>
            {business.city && (
              <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {business.city}
              </p>
            )}
          </div>
        </div>

        {/* WEB ONLY badge */}
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider uppercase shadow-lg">
            Web Only
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* CTA: Shop online */}
        {shopUrl && (
          <a
            href={shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-md hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="h-5 w-5" />
            {language === "en" ? "Visit Online Shop" : "Visiter la boutique en ligne"}
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        )}

        {/* Hook / description */}
        {(hook || business.description) && (
          <div className="space-y-2">
            {hook && (
              <p className="text-sm font-medium text-primary italic">{hook}</p>
            )}
            {business.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {business.description}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Contact */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {language === "en" ? "Contact" : "Contact"}
          </h3>
          <div className="grid gap-2">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>{business.phone}</span>
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
              >
                <WhatsAppIcon className="h-4 w-4 text-green-600 shrink-0" />
                <span>WhatsApp</span>
              </a>
            )}
            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{business.email}</span>
              </a>
            )}
            {business.website && business.website !== business.online_shop_url && (
              <a
                href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
              >
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{business.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {language === "en" ? "Social Media" : "Réseaux sociaux"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    title={link.label}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Share & Bookmark */}
        <div className="flex items-center justify-center gap-4 py-2">
          <ShareButton title={business.name} />
          <BookmarkButton businessId={business.id} />
        </div>
      </div>
    </div>
  );
};

export default WebOnlySlidePanel;
