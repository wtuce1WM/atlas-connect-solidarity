import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Star, BedDouble, ExternalLink, Building2, Clock, ChevronLeft, ChevronRight, Link2, Unlink, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HotelOffer {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  room: {
    type: string;
    typeEstimated?: { category?: string; beds?: number; bedType?: string };
    description?: { text?: string };
  };
  price: { currency: string; total: string; base?: string };
  policies?: { paymentType?: string; cancellations?: { description?: { text?: string }; deadline?: string }[] };
}

export interface HotelResult {
  hotel: {
    hotelId: string;
    name: string;
    cityCode: string;
    latitude?: number;
    longitude?: number;
    rating?: string;
    guestRating?: number;
    reviewCount?: number;
    address?: string;
    city?: string;
    mainImage?: string;
    amenities?: string[];
    description?: string;
    checkinTime?: string;
    checkoutTime?: string;
    images?: string[];
    accessibilityAttributes?: {
      attributes?: string[];
      [key: string]: unknown;
    } | null;
  };
  available: boolean;
  offers?: HotelOffer[];
}

interface Props {
  hotel: HotelResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatPrice: (price: string, currency: string) => string;
  onViewBusiness?: (businessId: string, hotelResult: HotelResult) => void;
}

export default function HotelDetailDialog({ hotel, open, onOpenChange, formatPrice, onViewBusiness }: Props) {
  const { language } = useLanguage();
  const [dbBusiness, setDbBusiness] = useState<{ id: string; name: string } | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isStaff, setIsStaff] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  // Check staff status
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsStaff(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      setIsStaff(!!roles && roles.some((r: any) => r.role === "admin" || r.role === "staff"));
    };
    check();
  }, []);

  // Look up mapping when dialog opens
  useEffect(() => {
    if (!hotel || !open) { setDbBusiness(null); setCurrentImageIdx(0); setLinkMode(false); return; }
    const lookup = async () => {
      setLoadingDb(true);
      try {
        // 1. Check manual mapping first
        const { data: mappings } = await (supabase as any)
          .rpc("get_hotel_mappings_by_liteapi_ids", { _ids: [hotel.hotel.hotelId] });
        const mapping = (mappings as any[] | null)?.[0] ?? null;

        if (mapping?.business_id) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("id, name")
            .eq("id", mapping.business_id)
            .single();
          setDbBusiness(biz || null);
        } else {
          // 2. Fallback: auto-match by name (first 3 words)
          const name = hotel.hotel.name;
          const { data } = await supabase
            .from("businesses")
            .select("id, name")
            .ilike("name", `%${name.split(" ").slice(0, 3).join(" ")}%`)
            .eq("is_active", true)
            .limit(1);
          setDbBusiness(data?.[0] || null);
        }
      } catch { setDbBusiness(null); }
      setLoadingDb(false);
    };
    lookup();
  }, [hotel, open]);

  const handleSearchBusiness = async () => {
    if (!linkSearch.trim()) return;
    setLinkSearching(true);
    try {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city")
        .ilike("name", `%${linkSearch.trim()}%`)
        .eq("is_active", true)
        .limit(10);
      setLinkResults(data || []);
    } catch { setLinkResults([]); }
    setLinkSearching(false);
  };

  const handleLink = async (businessId: string) => {
    if (!hotel) return;
    setLinking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Upsert mapping
      const { error } = await supabase
        .from("hotel_api_mappings")
        .upsert({
          liteapi_hotel_id: hotel.hotel.hotelId,
          business_id: businessId,
          created_by: session?.user?.id || null,
        }, { onConflict: "liteapi_hotel_id" });
      if (error) throw error;

      // Refresh
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .single();
      setDbBusiness(biz || null);
      setLinkMode(false);
      setLinkSearch("");
      setLinkResults([]);
      toast.success("Association enregistrée");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'association");
    }
    setLinking(false);
  };

  const handleUnlink = async () => {
    if (!hotel) return;
    setLinking(true);
    try {
      const { error } = await supabase
        .from("hotel_api_mappings")
        .delete()
        .eq("liteapi_hotel_id", hotel.hotel.hotelId);
      if (error) throw error;
      setDbBusiness(null);
      toast.success("Association supprimée");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
    setLinking(false);
  };

  if (!hotel) return null;

  const h = hotel.hotel;
  const offers = hotel.offers || [];
  const allImages = h.images && h.images.length > 0 ? h.images : h.mainImage ? [h.mainImage] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {h.name}
            {h.rating && (
              <Badge variant="secondary" className="ml-1">
                {"★".repeat(parseInt(h.rating))}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {h.address || h.city || h.cityCode}
          </DialogDescription>
        </DialogHeader>

        {/* Image Gallery */}
        {allImages.length > 0 && (
          <div className="relative">
            <img
              src={allImages[currentImageIdx]}
              alt={`${h.name} - ${currentImageIdx + 1}`}
              className="w-full h-52 object-cover rounded-lg"
            />
            {allImages.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIdx((i) => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1 hover:bg-background"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentImageIdx((i) => (i + 1) % allImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1 hover:bg-background"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 right-2 bg-background/80 text-xs px-2 py-0.5 rounded">
                  {currentImageIdx + 1}/{allImages.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Check-in/out times */}
        {(h.checkinTime || h.checkoutTime) && (
          <div className="flex gap-4 text-sm">
            {h.checkinTime && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Check-in: <strong className="text-foreground">{h.checkinTime}</strong></span>
              </div>
            )}
            {h.checkoutTime && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Check-out: <strong className="text-foreground">{h.checkoutTime}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {h.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {h.description}
          </p>
        )}

        {/* Accessibility */}
        {h.accessibilityAttributes?.attributes && h.accessibilityAttributes.attributes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <span>♿</span>
              {language === "en" ? "Accessibility" : language === "ar" ? "إمكانية الوصول" : "Accessibilité"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {h.accessibilityAttributes.attributes.slice(0, 8).map((attr) => (
                <Badge key={attr} variant="outline" className="text-[10px] font-normal">
                  {attr.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}
                </Badge>
              ))}
              {h.accessibilityAttributes.attributes.length > 8 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  +{h.accessibilityAttributes.attributes.length - 8}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* DB cross-reference & Staff link management */}
        {dbBusiness ? (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {language === "en" ? "Listed on our platform" : "Référencé sur notre plateforme"}
              </p>
              <p className="text-xs text-muted-foreground">{dbBusiness.name}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                if (onViewBusiness && hotel) {
                  onViewBusiness(dbBusiness.id, hotel);
                  onOpenChange(false);
                }
              }}>
                {language === "en" ? "View" : "Voir"}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              {isStaff && (
                <Button size="sm" variant="ghost" onClick={handleUnlink} disabled={linking} title="Dissocier">
                  <Unlink className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          isStaff && !loadingDb && (
            <div className="p-3 border border-dashed border-muted-foreground/30 rounded-lg space-y-2">
              {!linkMode ? (
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => setLinkMode(true)}>
                  <Link2 className="h-4 w-4" />
                  Associer à un établissement
                </Button>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rechercher un établissement..."
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchBusiness()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleSearchBusiness} disabled={linkSearching}>
                      {linkSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  {linkResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {linkResults.map((biz) => (
                        <button
                          key={biz.id}
                          onClick={() => handleLink(biz.id)}
                          disabled={linking}
                          className="w-full text-left p-2 rounded hover:bg-accent text-sm flex justify-between items-center"
                        >
                          <span className="font-medium truncate">{biz.name}</span>
                          {biz.city && <span className="text-xs text-muted-foreground ml-2 shrink-0">{biz.city}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {linkResults.length === 0 && linkSearch && !linkSearching && (
                    <p className="text-xs text-muted-foreground text-center py-1">Aucun résultat</p>
                  )}
                  <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => { setLinkMode(false); setLinkResults([]); setLinkSearch(""); }}>
                    Annuler
                  </Button>
                </>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                ID LiteAPI: <code className="bg-muted px-1 rounded">{h.hotelId}</code>
              </p>
            </div>
          )
        )}

        {/* Amenities */}
        {h.amenities && h.amenities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {language === "en" ? "Amenities" : "Équipements"}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {h.amenities.slice(0, 15).map((a, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {a}
                </Badge>
              ))}
              {h.amenities.length > 15 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{h.amenities.length - 15}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* All offers */}
        <div>
          <h3 className="text-sm font-semibold mb-2">
            {offers.length} {language === "en" ? "room offers" : "offres de chambres"}
          </h3>
          <div className="space-y-2">
            {offers.map((offer, idx) => (
              <div
                key={offer.id || idx}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {(() => {
                      const raw = offer.room?.typeEstimated?.category?.replace(/_/g, " ") || offer.room?.type || "Standard";
                      return raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : raw;
                    })()}
                  </p>
                  {offer.room?.description?.text && offer.room.description.text !== offer.room?.typeEstimated?.category && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {offer.room.description.text}
                    </p>
                  )}
                  {offer.policies?.paymentType && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {offer.policies.paymentType}
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-bold text-primary ml-3 shrink-0">
                  {formatPrice(offer.price.total, offer.price.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
