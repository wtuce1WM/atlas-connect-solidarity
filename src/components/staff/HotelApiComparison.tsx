import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Star, MapPin, Hotel, Image, ExternalLink, X, Pencil, Check, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LiteApiHotel {
  hotelId: string;
  name: string;
  cityCode?: string;
  rating?: string;
  guestRating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  mainImage?: string;
  description?: string;
  images?: string[];
  amenities?: string[];
  available: boolean;
  offers: {
    id: string;
    room: { type: string };
    price: { currency: string; total: string };
  }[];
}

interface SerpApiHotel {
  position: number;
  name: string;
  type?: string;
  hotelClass?: number;
  description?: string;
  link?: string;
  ratePerNight?: { amount: string; currency: string };
  totalRate?: { amount: string; currency: string };
  dealDescription?: string;
  overallRating?: number;
  reviewCount?: number;
  locationRating?: number;
  amenities: string[];
  latitude?: number;
  longitude?: number;
  images: string[];
  thumbnail?: string;
}

interface OwmBusiness {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  images: string[] | null;
  google_rating: number | null;
  google_review_count: number | null;
  main_category: string | null;
}

const CITY_OPTIONS = [
  { label: "Essaouira", value: "Essaouira", code: "ESU" },
  { label: "Marrakech", value: "Marrakech", code: "RAK" },
  { label: "Casablanca", value: "Casablanca", code: "CMN" },
  { label: "Fès", value: "Fez", code: "FEZ" },
  { label: "Tanger", value: "Tangier", code: "TNG" },
  { label: "Agadir", value: "Agadir", code: "AGA" },
  { label: "Rabat", value: "Rabat", code: "RBA" },
  { label: "Ouarzazate", value: "Ouarzazate", code: "OUD" },
];

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};
const dayAfter = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
};

// ── OWM Business matcher for a single SerpApi hotel ──
const OwmMatcher = ({
  serpHotelName,
  matchedBusiness,
  onMatch,
}: {
  serpHotelName: string;
  matchedBusiness: OwmBusiness | null;
  onMatch: (biz: OwmBusiness | null) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<OwmBusiness[]>([]);
  const [showDrop, setShowDrop] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setOptions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, logo_url, images, google_rating, google_review_count, main_category")
        .ilike("name", `%${query}%`)
        .limit(8);
      setOptions((data as OwmBusiness[]) || []);
      setShowDrop(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (!editing && matchedBusiness) {
    const img = (matchedBusiness.images && matchedBusiness.images.length > 0 ? matchedBusiness.images[0] : null) || matchedBusiness.logo_url;
    const imgCount = matchedBusiness.images?.length || 0;
    return (
      <div className="flex gap-3">
        {img && <img src={img} alt="" className="w-20 h-20 rounded-md object-cover shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm truncate flex-1">{matchedBusiness.name}</p>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setEditing(true); setQuery(""); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => onMatch(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {matchedBusiness.google_rating != null && (
              <span className="text-xs flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {matchedBusiness.google_rating}
                {matchedBusiness.google_review_count != null && (
                  <span className="text-muted-foreground">({matchedBusiness.google_review_count})</span>
                )}
              </span>
            )}
          </div>
          {imgCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Image className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{imgCount} photos</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!editing && !matchedBusiness) {
    return (
      <div className="flex items-center justify-center h-20 gap-1.5">
        <Building2 className="h-5 w-5 text-muted-foreground/40" />
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setEditing(true); setQuery(serpHotelName); }}>
          Associer
        </Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-1">
      <div className="flex gap-1">
        <Input
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => options.length > 0 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
          className="h-7 text-xs"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      {showDrop && options.length > 0 && (
        <div className="absolute z-50 bg-popover border rounded-md shadow-md w-full mt-0.5 max-h-40 overflow-y-auto">
          {options.map((b) => (
            <button
              key={b.id}
              className="w-full text-left px-2 py-1.5 hover:bg-muted text-xs"
              onMouseDown={(e) => {
                e.preventDefault();
                onMatch(b);
                setEditing(false);
              }}
            >
              {b.name} {b.city && <span className="text-muted-foreground">— {b.city}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const HotelApiComparison = () => {
  const [city, setCity] = useState("Essaouira");
  const [checkIn, setCheckIn] = useState(tomorrow());
  const [checkOut, setCheckOut] = useState(dayAfter());
  const [adults, setAdults] = useState(2);
  const [loading, setLoading] = useState(false);
  const [liteResults, setLiteResults] = useState<LiteApiHotel[] | null>(null);
  const [serpResults, setSerpResults] = useState<SerpApiHotel[] | null>(null);
  const [liteTime, setLiteTime] = useState(0);
  const [serpTime, setSerpTime] = useState(0);
  const [serpPages, setSerpPages] = useState(0);
  const [liteError, setLiteError] = useState<string | null>(null);
  const [serpError, setSerpError] = useState<string | null>(null);
  const [isStaffUser, setIsStaffUser] = useState<boolean | null>(null);

  // Map: serpHotelName (lowercase) -> OwmBusiness
  const [owmMatches, setOwmMatches] = useState<Record<string, OwmBusiness>>({});
  // Map: serpHotelName (lowercase) -> DB mapping id (for delete)
  const [mappingIds, setMappingIds] = useState<Record<string, string>>({});
  // Keys manually dismissed by the user — prevents auto-match from re-creating them
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const cityOption = CITY_OPTIONS.find((c) => c.value === city) || CITY_OPTIONS[0];

  useEffect(() => {
    const checkStaffAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsStaffUser(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasStaffRole = !!roles?.some((r) => r.role === "admin" || r.role === "staff");
      setIsStaffUser(hasStaffRole);
    };

    checkStaffAccess();
  }, []);

  // Load saved mappings from DB for current city — returns set of saved keys
  const loadSavedMappings = useCallback(async (hotels: SerpApiHotel[]): Promise<Set<string>> => {
    if (hotels.length === 0) return new Set();
    const names = hotels.map(h => h.name);
    const { data } = await supabase
      .from("hotel_mappings")
      .select("id, serp_hotel_name, business_id")
      .eq("city", cityOption.label)
      .in("serp_hotel_name", names);
    if (!data || data.length === 0) return new Set();

    const bizIds = [...new Set(data.map(m => m.business_id))];
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, name, city, logo_url, images, google_rating, google_review_count, main_category")
      .in("id", bizIds);

    if (!businesses) return new Set();
    const bizMap: Record<string, OwmBusiness> = {};
    for (const b of businesses) bizMap[b.id] = b as OwmBusiness;

    const matches: Record<string, OwmBusiness> = {};
    const ids: Record<string, string> = {};
    const savedKeys = new Set<string>();
    for (const m of data) {
      const key = m.serp_hotel_name.toLowerCase().trim();
      if (bizMap[m.business_id]) {
        matches[key] = bizMap[m.business_id];
        ids[key] = m.id;
        savedKeys.add(key);
      }
    }
    setOwmMatches(prev => ({ ...prev, ...matches }));
    setMappingIds(prev => ({ ...prev, ...ids }));
    return savedKeys;
  }, [cityOption.label]);

  // Normalize hotel name for matching: lowercase, remove accents, common prefixes
  const normalizeName = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(hotel|hôtel|riad|dar|villa|maison|residence|residences|resort|spa|boutique|& spa|by|le |la |les |l'|the )\b/gi, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Business names to exclude from auto-matching (too generic, cause false positives)
  const AUTOMATCH_BLACKLIST = new Set(["la villa's", "l'hôtel marrakech", "cruiser mogador essaouira", "hotel vents des iles"]);

  // Auto-match SerpApi hotels to DB businesses by name (skips already-saved mappings)
  const autoMatch = useCallback(async (hotels: SerpApiHotel[], savedKeys: Set<string>) => {
    if (hotels.length === 0) return;
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, name, city, logo_url, images, google_rating, google_review_count, main_category")
      .eq("city", cityOption.label)
      .eq("main_category", "Hôtellerie")
      .eq("is_active", true);

    if (!businesses || businesses.length === 0) return;

    // Pre-compute normalized business names, excluding blacklisted ones
    const bizNorm = businesses
      .filter((b) => !AUTOMATCH_BLACKLIST.has(b.name.toLowerCase().trim()))
      .map((b) => ({
        biz: b as OwmBusiness,
        norm: normalizeName(b.name),
        lower: b.name.toLowerCase().trim(),
      }));

    const matches: Record<string, OwmBusiness> = {};
    for (const hotel of hotels) {
      const hotelKey = hotel.name.toLowerCase().trim();
      // Skip hotels already mapped from DB or manually dismissed
      if (savedKeys.has(hotelKey)) continue;
      if (dismissedKeys.has(hotelKey)) continue;

      const hotelNorm = normalizeName(hotel.name);
      // Skip very short normalized names (e.g. "villas" → "") to avoid false positives
      if (hotelNorm.length < 3) continue;

      // 1. Exact match
      const exact = bizNorm.find((b) => b.lower === hotelKey);
      if (exact) { matches[hotelKey] = exact.biz; continue; }

      // 2. Normalized exact match
      const normExact = bizNorm.find((b) => b.norm === hotelNorm);
      if (normExact) { matches[hotelKey] = normExact.biz; continue; }

      // 3. Partial: one contains the other (original) — require min 4 chars to avoid generic matches
      const partial = bizNorm.find(
        (b) => b.lower.length >= 4 && hotelKey.length >= 4 && (hotelKey.includes(b.lower) || b.lower.includes(hotelKey))
      );
      if (partial) { matches[hotelKey] = partial.biz; continue; }

      // 4. Normalized partial — require min 4 chars
      const normPartial = bizNorm.find(
        (b) => b.norm.length >= 4 && hotelNorm.length >= 4 && (hotelNorm.includes(b.norm) || b.norm.includes(hotelNorm))
      );
      if (normPartial) { matches[hotelKey] = normPartial.biz; continue; }

      // 5. Word overlap: if ≥60% of normalized words match (min 2 words each)
      const hotelWords = hotelNorm.split(" ").filter(Boolean);
      if (hotelWords.length >= 2) {
        const best = bizNorm.reduce<{ biz: OwmBusiness | null; score: number }>((acc, b) => {
          const bizWords = b.norm.split(" ").filter(Boolean);
          if (bizWords.length < 2) return acc;
          const common = hotelWords.filter((w) => bizWords.includes(w)).length;
          const score = common / Math.max(hotelWords.length, bizWords.length);
          return score > acc.score ? { biz: b.biz, score } : acc;
        }, { biz: null, score: 0 });
        if (best.biz && best.score >= 0.6) {
          matches[hotelKey] = best.biz;
        }
      }
    }
    // Merge with existing (saved) matches — don't overwrite
    setOwmMatches(prev => ({ ...prev, ...matches }));

    // Auto-save new matches to DB
    const matchEntries = Object.entries(matches);
    if (matchEntries.length > 0 && isStaffUser === true) {
      const rows = matchEntries.map(([serpKey, biz]) => {
        // Find original hotel name (preserving case) from the hotels array
        const original = hotels.find(h => h.name.toLowerCase().trim() === serpKey);
        return {
          serp_hotel_name: original?.name || serpKey,
          city: cityOption.label,
          business_id: biz.id,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from("hotel_mappings")
        .upsert(rows, { onConflict: "serp_hotel_name,city" });
      if (error) {
        console.error("Auto-save error:", error);
      } else {
        // Fetch mapping IDs for the newly saved entries
        const names = rows.map(r => r.serp_hotel_name);
        const { data: saved } = await supabase
          .from("hotel_mappings")
          .select("id, serp_hotel_name")
          .eq("city", cityOption.label)
          .in("serp_hotel_name", names);
        if (saved) {
          const newIds: Record<string, string> = {};
          for (const s of saved) newIds[s.serp_hotel_name.toLowerCase().trim()] = s.id;
          setMappingIds(prev => ({ ...prev, ...newIds }));
        }
        toast.success(`${matchEntries.length} association(s) auto-sauvegardée(s)`);
      }
    }
  }, [cityOption.label, isStaffUser, dismissedKeys]);

  const handleSearch = async () => {
    setLoading(true);
    setLiteResults(null);
    setSerpResults(null);
    setLiteError(null);
    setSerpError(null);
    setSerpPages(0);
    setMappingIds({});

    const litePromise = (async () => {
      const t0 = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("liteapi-hotels", {
          body: {
            fallbackCityName: cityOption.value,
            cityCode: cityOption.code,
            checkIn,
            checkOut,
            adults,
            rooms: 1,
            currency: "EUR",
          },
        });
        setLiteTime(Math.round(performance.now() - t0));
        if (error) throw new Error(String(error));
        if (data?.error) throw new Error(data.error);
        const sorted = (data?.data || []).slice().sort((a: LiteApiHotel, b: LiteApiHotel) => a.name.localeCompare(b.name, 'fr'));
        setLiteResults(sorted);
      } catch (e: any) {
        setLiteTime(Math.round(performance.now() - t0));
        setLiteError(e.message);
        setLiteResults([]);
      }
    })();

    let serpData: SerpApiHotel[] = [];
    const serpPromise = (async () => {
      const t0 = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("serpapi-hotels", {
          body: {
            cityName: cityOption.value,
            checkIn,
            checkOut,
            adults,
            currency: "EUR",
          },
        });
        setSerpTime(Math.round(performance.now() - t0));
        if (error) throw new Error(String(error));
        if (data?.error) throw new Error(data.error);
        const sorted = (data?.data || []).slice().sort((a: SerpApiHotel, b: SerpApiHotel) => a.name.localeCompare(b.name, 'fr'));
        setSerpResults(sorted);
        setSerpPages(data?.pages || 1);
        serpData = sorted;
      } catch (e: any) {
        setSerpTime(Math.round(performance.now() - t0));
        setSerpError(e.message);
        setSerpResults([]);
      }
    })();

    await Promise.all([litePromise, serpPromise]);
    setLoading(false);

    // Load saved DB mappings first, then auto-match remaining
    if (serpData.length > 0) {
      const savedKeys = await loadSavedMappings(serpData);
      autoMatch(serpData, savedKeys);
    }
  };

  // Save or delete mapping in DB
  const handleOwmMatch = async (serpName: string, biz: OwmBusiness | null) => {
    const key = serpName.toLowerCase().trim();
    if (biz) {
      if (isStaffUser !== true) {
        toast.error("Connexion staff/admin requise pour sauvegarder l'association");
        return;
      }

      // Upsert into hotel_mappings
      const { error } = await supabase
        .from("hotel_mappings")
        .upsert(
          { serp_hotel_name: serpName, city: cityOption.label, business_id: biz.id, updated_at: new Date().toISOString() },
          { onConflict: "serp_hotel_name,city" }
        );
      if (error) {
        console.error("Upsert error:", error);
        toast.error("Erreur sauvegarde : " + error.message);
        return;
      }
      // Fetch the mapping id
      const { data: mapping } = await supabase
        .from("hotel_mappings")
        .select("id")
        .eq("serp_hotel_name", serpName)
        .eq("city", cityOption.label)
        .maybeSingle();
      setOwmMatches((prev) => ({ ...prev, [key]: biz }));
      if (mapping) setMappingIds((prev) => ({ ...prev, [key]: mapping.id }));
      toast.success("Association sauvegardée");
    } else {
      // Delete from hotel_mappings
      const mappingId = mappingIds[key];
      if (mappingId) {
        if (isStaffUser !== true) {
          toast.error("Connexion staff/admin requise pour supprimer l'association");
          return;
        }

        const { error } = await supabase.from("hotel_mappings").delete().eq("id", mappingId);
        if (error) {
          toast.error("Erreur suppression : " + error.message);
          return;
        }
      }
      setOwmMatches((prev) => { const next = { ...prev }; delete next[key]; return next; });
      setMappingIds((prev) => { const next = { ...prev }; delete next[key]; return next; });
      setDismissedKeys((prev) => new Set(prev).add(key));
      toast.success("Association supprimée");
    }
  };

  const owmMatchCount = Object.keys(owmMatches).length;

  return (
    <div className="space-y-6">
      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hotel className="h-5 w-5" />
            Comparaison API Hôtels — LiteAPI vs SerpApi vs OWM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ville</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check-in</label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check-out</label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Adultes</label>
              <Input type="number" min={1} max={6} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-20" />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Comparer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results: 3 columns */}
      {(liteResults !== null || serpResults !== null) && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* LiteAPI column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">LiteAPI</h3>
              <Badge variant="secondary">{liteResults?.length ?? 0}</Badge>
              <span className="text-xs text-muted-foreground">{liteTime}ms</span>
            </div>
            {liteError && <p className="text-sm text-destructive">{liteError}</p>}
            {liteResults?.map((h) => (
              <HotelCardLite key={h.hotelId} hotel={h} />
            ))}
            {liteResults?.length === 0 && !liteError && (
              <p className="text-sm text-muted-foreground">Aucun résultat</p>
            )}
          </div>

          {/* SerpApi column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">Google Hotels</h3>
              <Badge variant="secondary">{serpResults?.length ?? 0}</Badge>
              {serpPages > 1 && <Badge variant="outline" className="text-[10px]">{serpPages} p.</Badge>}
              <span className="text-xs text-muted-foreground">{serpTime}ms</span>
            </div>
            {serpError && <p className="text-sm text-destructive">{serpError}</p>}
            {serpResults?.map((h, i) => (
              <HotelCardSerp key={`${h.name}-${i}`} hotel={h} />
            ))}
            {serpResults?.length === 0 && !serpError && (
              <p className="text-sm text-muted-foreground">Aucun résultat</p>
            )}
          </div>

          {/* OWM column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">ONE WORLD MOROCCO</h3>
              <Badge variant="secondary">{owmMatchCount}/{serpResults?.length ?? 0}</Badge>
            </div>
            {isStaffUser === false && (
              <p className="text-xs text-destructive">Connexion staff/admin requise pour persister les associations</p>
            )}
            {serpResults?.map((h, i) => {
              const key = h.name.toLowerCase().trim();
              const matched = owmMatches[key] || null;
              return (
                <Card key={`owm-${h.name}-${i}`} className="overflow-hidden min-h-[120px]">
                  <div className="p-3 h-full">
                    <p className="text-[10px] text-muted-foreground mb-1.5 truncate">↔ {h.name}</p>
                    <OwmMatcher
                      serpHotelName={h.name}
                      matchedBusiness={matched}
                      onMatch={(biz) => handleOwmMatch(h.name, biz)}
                    />
                  </div>
                </Card>
              );
            })}
            {(!serpResults || serpResults.length === 0) && (
              <p className="text-sm text-muted-foreground">Lancez une recherche pour voir les correspondances</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HotelCardLite = ({ hotel }: { hotel: LiteApiHotel }) => {
  const bestOffer = hotel.offers[0];
  const price = bestOffer?.price?.total ? `${bestOffer.price.total} ${bestOffer.price.currency}` : "—";

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {hotel.mainImage && (
          <img src={hotel.mainImage} alt={hotel.name} className="w-20 h-20 rounded-md object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm truncate">{hotel.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {hotel.rating && (
              <Badge variant="outline" className="text-[10px] py-0">
                {hotel.rating}★
              </Badge>
            )}
            {hotel.guestRating != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Star className="h-3 w-3" /> {hotel.guestRating}
                {hotel.reviewCount != null && <span>({hotel.reviewCount})</span>}
              </span>
            )}
          </div>
          {hotel.address && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {hotel.address}
            </p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm font-bold text-primary">{price}/nuit</span>
            <span className="text-[10px] text-muted-foreground">{hotel.offers.length} offre(s)</span>
          </div>
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hotel.amenities.slice(0, 5).map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] py-0 px-1">{a}</Badge>
              ))}
              {hotel.amenities.length > 5 && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1">+{hotel.amenities.length - 5}</Badge>
              )}
            </div>
          )}
          {hotel.images && hotel.images.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Image className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{hotel.images.length} photos</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const HotelCardSerp = ({ hotel }: { hotel: SerpApiHotel }) => {
  const price = hotel.ratePerNight?.amount || "—";

  return (
    <Card className="overflow-hidden min-h-[120px]">
      <div className="flex gap-3 p-3">
        {hotel.thumbnail && (
          <img src={hotel.thumbnail} alt={hotel.name} className="w-20 h-20 rounded-md object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{hotel.name}</h4>
            <Badge variant="outline" className="text-[10px] py-0 shrink-0">#{hotel.position}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {hotel.hotelClass && (
              <Badge variant="outline" className="text-[10px] py-0">
                {hotel.hotelClass}★
              </Badge>
            )}
            {hotel.overallRating != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Star className="h-3 w-3" /> {hotel.overallRating}
                {hotel.reviewCount != null && <span>({hotel.reviewCount})</span>}
              </span>
            )}
            {hotel.locationRating != null && (
              <span className="text-[10px] text-muted-foreground">
                📍 {hotel.locationRating}
              </span>
            )}
          </div>
          {hotel.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{hotel.description}</p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{price}/nuit</span>
              {hotel.dealDescription && (
                <Badge className="text-[9px] py-0 bg-green-600">{hotel.dealDescription}</Badge>
              )}
            </div>
            {hotel.link && (
              <a href={hotel.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hotel.amenities.slice(0, 5).map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] py-0 px-1">{a}</Badge>
              ))}
              {hotel.amenities.length > 5 && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1">+{hotel.amenities.length - 5}</Badge>
              )}
            </div>
          )}
          {hotel.images.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Image className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{hotel.images.length} photos</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default HotelApiComparison;
