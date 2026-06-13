import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Mail, Globe, Star, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BusinessInfoPanelProps {
  businessId: string;
}

const BusinessInfoPanel = ({ businessId }: BusinessInfoPanelProps) => {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();
      setBusiness(data);
      setLoading(false);
    };
    load();
  }, [businessId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Établissement introuvable
      </div>
    );
  }

  const images = (business.images || []).filter(Boolean);
  const heroImage = images[0] || business.logo_url;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Hero image */}
      {heroImage && (
        <div className="relative w-full aspect-[16/9] bg-muted">
          <img src={heroImage} alt={business.name} className="w-full h-full object-cover" />
          {business.logo_url && images[0] && (
            <div className="absolute bottom-3 left-3 h-12 w-12 rounded-full bg-background border-2 border-background shadow-lg overflow-hidden">
              <img src={business.logo_url} alt="" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Name + Badge */}
        <div>
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {business.name}
          </h2>
          {business.hook_fr && (
            <p className="text-sm text-muted-foreground mt-0.5">{business.hook_fr}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {business.main_category && (
              <Badge variant="secondary" className="text-xs">{business.main_category}</Badge>
            )}
            {business.city && (
              <Badge variant="outline" className="text-xs gap-1">
                <MapPin className="h-3 w-3" />{business.city}
              </Badge>
            )}
            {business.neighborhood && (
              <Badge variant="outline" className="text-xs">{business.neighborhood}</Badge>
            )}
          </div>
        </div>

        {/* Rating */}
        {business.computed_rating && business.computed_rating > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-bold text-foreground">{business.computed_rating}</span>
              <span className="text-xs text-muted-foreground">/20</span>
            </div>
            {business.total_review_count > 0 && (
              <span className="text-xs text-muted-foreground">{business.total_review_count} avis</span>
            )}
          </div>
        )}

        {/* Description */}
        {business.description && !business.hide_description && (
          <div className="text-sm text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: business.description }} />
        )}

        {/* Contact info */}
        <div className="space-y-2">
          {business.address && (
            <div className="flex items-start gap-2 text-sm text-foreground/70">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{business.address}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <Phone className="h-4 w-4 shrink-0" />
              <a href={`tel:${business.phone}`} className="hover:text-primary">{business.phone}</a>
            </div>
          )}
          {business.email && (
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <Mail className="h-4 w-4 shrink-0" />
              <a href={`mailto:${business.email}`} className="hover:text-primary truncate">{business.email}</a>
            </div>
          )}
          {business.website && (
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <Globe className="h-4 w-4 shrink-0" />
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">{business.website}</a>
            </div>
          )}
        </div>

        {/* Images grid */}
        {images.length > 1 && (
          <div className="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden">
            {images.slice(1, 7).map((img: string, i: number) => (
              <div key={i} className="aspect-square bg-muted">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Opening hours hint */}
        {business.is_open_24h && (
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Ouvert 24h/24</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessInfoPanel;
