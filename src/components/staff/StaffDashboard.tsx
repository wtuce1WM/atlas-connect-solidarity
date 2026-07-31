import { useMemo, useState, useEffect, useCallback } from "react";
import { Upload, Volume2, RefreshCw, Languages } from "lucide-react";
import {
  Building2,
  Eye,
  AlertTriangle,
  ImageOff,
  MapPinOff,
  FileWarning,
  Clock,
  Plus,
  Folder,
  MapPin,
  UserCheck,
  Star,
  Award,
  Gem,
  CheckCircle2,
  Globe,
  Phone as PhoneIcon,
  Mail,
  Image,
  FileText,
  Tag,
  Video,
  BarChart3,
  ChevronDown,
  ImageMinus,
  Loader2,
  Download,
  Link2Off,
  StickyNote,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import RichTextEditor from "./RichTextEditor";

type Business = Tables<"businesses">;

interface BrokenFilesMap {
  [businessId: string]: {
    brokenImages: number;
    brokenLogo: boolean;
    brokenPdf: boolean;
    brokenLabel: boolean;
    totalBroken: number;
  };
}

interface BrokenLinksResult {
  businessId: string;
  businessName: string;
  brokenUrls: { field: string; url: string; status?: number | null; cdnExpired?: boolean }[];
}

interface StaffDashboardProps {
  businesses: Business[];
  onNavigateTab: (tab: string) => void;
  onNewBusiness: () => void;
  onEditBusiness: (business: Business) => void;
  brokenFilesMap: BrokenFilesMap;
  isCheckingBrokenFiles: boolean;
  hasCheckedBrokenFiles: boolean;
  onCheckBrokenFiles: () => void;
  brokenLinks: BrokenLinksResult[];
  isCheckingBrokenLinks: boolean;
  hasCheckedBrokenLinks: boolean;
  brokenLinksProgress: { checked: number; total: number };
  onCheckBrokenLinks: () => void;
}

const StaffDashboard = ({ businesses, onNavigateTab, onNewBusiness, onEditBusiness, brokenFilesMap, isCheckingBrokenFiles, hasCheckedBrokenFiles, onCheckBrokenFiles, brokenLinks, isCheckingBrokenLinks, hasCheckedBrokenLinks, brokenLinksProgress, onCheckBrokenLinks }: StaffDashboardProps) => {
  // === STATISTICS ===
  const stats = useMemo(() => {
    const total = businesses.length;
    const active = businesses.filter(b => b.is_active).length;
    const verified = businesses.filter(b => b.wtuce_status === "verified").length;
    const pending = businesses.filter(b => b.wtuce_status === "pending").length;
    const featured = businesses.filter(b => b.is_featured).length;

    // Cities breakdown
    const cityCounts: Record<string, number> = {};
    businesses.forEach(b => {
      cityCounts[b.city] = (cityCounts[b.city] || 0) + 1;
    });
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Category breakdown
    const catCounts: Record<string, number> = {};
    businesses.forEach(b => {
      if (b.main_category) catCounts[b.main_category] = (catCounts[b.main_category] || 0) + 1;
    });
    const topCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return { total, active, verified, pending, featured, topCities, topCategories };
  }, [businesses]);

  // === QUALITY ALERTS ===
  const alerts = useMemo(() => {
    const noImages = businesses.filter(b => !b.images || b.images.length === 0);
    const noDescription = businesses.filter(b => !b.description || b.description.trim().length === 0);
    const noGPS = businesses.filter(b => !b.latitude || !b.longitude);
    const noPhone = businesses.filter(b => !b.phone);
    const noCategory = businesses.filter(b => !b.main_category);
    const noGoogleMaps = businesses.filter(b => !b.google_maps_url);
    return { noImages, noDescription, noGPS, noPhone, noCategory, noGoogleMaps };
  }, [businesses]);

  // === CATALOG QUALITY ===
  const catalogQuality = useMemo(() => {
    const total = businesses.length;
    if (total === 0) return { score: 0, criteria: [] as { label: string; icon: any; count: number; total: number }[] };

    const criteria = [
      { label: "Avec images", icon: Image, count: businesses.filter(b => b.images && b.images.length > 0).length, total },
      { label: "Avec description", icon: FileText, count: businesses.filter(b => b.description && b.description.trim().length > 0).length, total },
      { label: "Avec téléphone", icon: PhoneIcon, count: businesses.filter(b => !!b.phone).length, total },
      { label: "Avec email", icon: Mail, count: businesses.filter(b => !!b.email).length, total },
      { label: "Avec site web", icon: Globe, count: businesses.filter(b => !!b.website).length, total },
      { label: "Avec GPS", icon: MapPin, count: businesses.filter(b => b.latitude && b.longitude).length, total },
      { label: "Avec catégorie", icon: Tag, count: businesses.filter(b => !!b.main_category).length, total },
      { label: "Avec logo", icon: Image, count: businesses.filter(b => !!b.logo_url).length, total },
      { label: "Avec vidéo", icon: Video, count: businesses.filter(b => !!b.video_1_url).length, total },
      { label: "Avec services", icon: CheckCircle2, count: businesses.filter(b => b.services && b.services.length > 0).length, total },
    ];

    // Weighted score: images, description, phone, GPS are most important
    const weights = [20, 20, 15, 5, 5, 15, 10, 5, 2, 3];
    const score = Math.round(
      criteria.reduce((acc, c, i) => acc + (c.count / c.total) * weights[i], 0)
    );

    return { score, criteria };
  }, [businesses]);

  // === RECENT ACTIVITY ===
  const recentBusinesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8);
  }, [businesses]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `il y a ${diffMins}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Building2} label="Total" value={stats.total} color="text-gold bg-gold/10" />
        <StatCard icon={Eye} label="Actives" value={stats.active} color="text-green-600 bg-green-100" />
        <StatCard icon={Eye} label="Vérifiées" value={stats.verified} color="text-primary bg-primary/10" />
        <StatCard icon={Clock} label="En attente" value={stats.pending} color="text-amber-600 bg-amber-100" />
        <StatCard icon={Star} label="En vedette" value={stats.featured} color="text-yellow-500 bg-yellow-50" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-businesses-csv`;
            window.open(url, "_blank");
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV Google My Maps
        </Button>
        <InternalizeImagesButton />
        <BatchTranslateReviewsButton lang="fr" label="Traduire avis FR" />
        <BatchTranslateReviewsButton lang="en" label="Traduire avis EN" />
        <BatchTranslateReviewsButton lang="ar" label="Traduire avis AR" />
      </div>




      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertes qualité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Broken files alert */}
            {isCheckingBrokenFiles ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Vérification des fichiers…</span>
              </div>
            ) : !hasCheckedBrokenFiles ? (
              <button
                onClick={onCheckBrokenFiles}
                className="flex items-center justify-between w-full p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ImageMinus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Images/fichiers introuvables</span>
                </div>
                <Badge variant="outline" className="text-xs">Lancer la vérification</Badge>
              </button>
            ) : (
              (() => {
                const brokenBusinesses = businesses.filter(b => brokenFilesMap[b.id]);
                return (
                  <AlertRow
                    icon={ImageMinus}
                    label={brokenBusinesses.length > 0 ? `Images/fichiers introuvables (${brokenBusinesses.length} entreprises)` : "Images/fichiers introuvables"}
                    count={brokenBusinesses.length}
                    color={brokenBusinesses.length > 0 ? "text-destructive" : "text-green-600"}
                    items={brokenBusinesses}
                    onEdit={onEditBusiness}
                  />
                );
              })()
            )}
            {/* Broken external links alert */}
            {isCheckingBrokenLinks ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Vérification des liens externes… {brokenLinksProgress.checked}/{brokenLinksProgress.total}</span>
              </div>
            ) : !hasCheckedBrokenLinks ? (
              <button
                onClick={onCheckBrokenLinks}
                className="flex items-center justify-between w-full p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Link2Off className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Liens externes cassés</span>
                </div>
                <Badge variant="outline" className="text-xs">Lancer la vérification</Badge>
              </button>
            ) : (
              (() => {
                const brokenLinkBusinesses = businesses.filter(b => brokenLinks.some(bl => bl.businessId === b.id));
                return (
                  <AlertRow
                    icon={Link2Off}
                    label={brokenLinkBusinesses.length > 0 ? `Liens externes cassés (${brokenLinkBusinesses.length} entreprises)` : "Liens externes cassés"}
                    count={brokenLinkBusinesses.length}
                    color={brokenLinkBusinesses.length > 0 ? "text-destructive" : "text-green-600"}
                    items={brokenLinkBusinesses}
                    onEdit={onEditBusiness}
                  />
                );
              })()
            )}
            <AlertRow
              icon={ImageOff}
              label="Sans images"
              count={alerts.noImages.length}
              color="text-amber-600"
              items={alerts.noImages}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={FileWarning}
              label="Sans description"
              count={alerts.noDescription.length}
              color="text-orange-600"
              items={alerts.noDescription}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={MapPinOff}
              label="Sans coordonnées GPS"
              count={alerts.noGPS.length}
              color="text-red-600"
              items={alerts.noGPS}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={AlertTriangle}
              label="Sans téléphone"
              count={alerts.noPhone.length}
              color="text-yellow-600"
              items={alerts.noPhone}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={MapPin}
              label="Sans Google Maps"
              count={alerts.noGoogleMaps.length}
              color="text-blue-600"
              items={alerts.noGoogleMaps}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={Folder}
              label="Sans catégorie"
              count={alerts.noCategory.length}
              color="text-purple-600"
              items={alerts.noCategory}
              onEdit={onEditBusiness}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentBusinesses.map(b => (
                <button
                  key={b.id}
                  onClick={() => onEditBusiness(b)}
                  className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.city} · {b.main_category || "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDate(b.updated_at)}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Catalog Quality */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Qualité du catalogue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Global score */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-20 w-20 flex-shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={catalogQuality.score >= 70 ? "hsl(var(--primary))" : catalogQuality.score >= 40 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)"}
                  strokeWidth="3"
                  strokeDasharray={`${catalogQuality.score}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{catalogQuality.score}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">
                Score global de complétion
              </p>
              <p className="text-xs text-muted-foreground">
                Basé sur la présence d'images, descriptions, coordonnées, contacts et taxonomie
              </p>
            </div>
          </div>

          {/* Criteria grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalogQuality.criteria.map((c) => {
              const pct = c.total > 0 ? Math.round((c.count / c.total) * 100) : 0;
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{c.label}</span>
                      <span className="text-xs text-muted-foreground">{c.count}/{c.total}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 80 ? "hsl(var(--primary))" : pct >= 50 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Par ville</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCities.map(([city, count]) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-sm">{city}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-gold/20 rounded-full w-32">
                      <div
                        className="h-2 bg-gold rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm">{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded-full w-32">
                      <div
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TTS Intro Phrase */}
      <TTSPhraseEditor />


      {/* Internal Notes */}
      <InternalNotesSection />
    </div>
  );
};

// --- Sub-components ---

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-background rounded-lg p-4 border">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color.split(" ").slice(1).join(" ")}`}>
          <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  label,
  count,
  color,
  items,
  onEdit,
}: {
  icon: any;
  label: string;
  count: number;
  color: string;
  items: Business[];
  onEdit: (b: Business) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = count > 0;

  return (
    <div>
      <button
        onClick={() => hasItems && setExpanded(!expanded)}
        className={`flex items-center justify-between w-full p-2 rounded-md bg-muted/50 transition-colors ${hasItems ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {count}
          </Badge>
          {hasItems && <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />}
        </div>
      </button>
      {expanded && (
        <div className="mt-1 ml-6 space-y-0.5 max-h-40 overflow-y-auto">
          {items.map(b => (
            <button
              key={b.id}
              onClick={() => onEdit(b)}
              className="flex items-center justify-between w-full text-left px-2 py-1 rounded hover:bg-muted/80 transition-colors text-xs"
            >
              <span className="truncate">{b.name}</span>
              <span className="text-muted-foreground whitespace-nowrap ml-2">{b.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InternalizeImagesButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ total: number; failed: number } | null>(null);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    let totalDone = 0;
    let totalFailed = 0;
    const failedBusinessIds = new Set<string>();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      };
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/internalize-images`;

      // Loop in batches until no more remaining
      let remaining = 1;
      while (remaining > 0) {
        setProgress(`${totalDone} rapatriée(s)…`);
        const res = await fetch(baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ limit: 5, exclude_ids: Array.from(failedBusinessIds) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        totalDone += data.totalInternalized;
        totalFailed += data.totalFailed;
        remaining = data.remaining || 0;

        // Track failed business IDs to exclude them from next batches
        if (data.details) {
          for (const d of data.details) {
            if (d.error && d.businessId) failedBusinessIds.add(d.businessId);
          }
        }

        // Stop if nothing happened at all
        if (data.totalInternalized === 0 && data.totalFailed === 0) break;
        if (remaining <= 0) break;
      }

      setResult({ total: totalDone, failed: totalFailed });
      toast({
        title: `${totalDone} image(s) rapatriée(s)`,
        description: totalFailed > 0 ? `${totalFailed} échec(s)` : "Toutes les images externes ont été internalisées.",
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
      setProgress("");
    }
  }, []);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRun}
      disabled={isRunning}
    >
      {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
      {isRunning ? progress || "Rapatriement…" : result ? `✓ ${result.total} rapatriée(s)` : "Rapatrier images externes"}
    </Button>
  );
}
function TTSPhraseEditor() {
  const [phrase, setPhrase] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("staff_notes")
      .select("content")
      .eq("key", "tts_intro_phrase")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content) setPhrase(data.content);
        setIsLoaded(true);
      });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("staff_notes")
      .upsert({ key: "tts_intro_phrase", content: phrase, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setIsSaving(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder la phrase TTS.", variant: "destructive" });
    } else {
      toast({ title: "Sauvegardé", description: "Phrase d'introduction TTS mise à jour." });
    }
  }, [phrase]);

  if (!isLoaded) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Phrase d'introduction TTS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Cette phrase sera prononcée au début de chaque résumé vocal de recherche.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Ex: Bienvenue sur WTUCE, votre guide de confiance au Maroc."
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            maxLength={300}
          />
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Sauvegarder
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{phrase.length}/300 caractères</p>
      </CardContent>
    </Card>
  );
}


function InternalNotesSection() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const MAX_CHARS = 10000;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("staff_notes")
        .select("content")
        .eq("key", "dashboard_internal_note")
        .single();
      if (data) setContent(data.content || "");
      setIsLoaded(true);
    };
    load();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("staff_notes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("key", "dashboard_internal_note");
    setIsSaving(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder la note.", variant: "destructive" });
    } else {
      toast({ title: "Sauvegardé", description: "Note interne mise à jour." });
    }
  }, [content]);

  const charCount = content.replace(/<[^>]*>/g, "").length;

  if (!isLoaded) return null;

  return (
    <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-amber-600" />
            Note interne
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${charCount > MAX_CHARS ? "text-destructive font-bold" : "text-muted-foreground"}`}>
              {charCount} / {MAX_CHARS}
            </span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || charCount > MAX_CHARS}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Sauvegarder
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Notes internes du tableau de bord..."
          maxHeight="700px"
        />
      </CardContent>
    </Card>
  );
}

function BatchTranslateReviewsButton({ lang, label }: { lang: 'fr' | 'en' | 'ar'; label: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState("");
  const abortRef = useMemo(() => ({ current: false }), []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResult("");
    abortRef.current = false;
    let totalTranslated = 0;

    try {
      while (!abortRef.current) {
        const { data, error } = await supabase.functions.invoke("batch-translate-reviews", {
          body: { limit: 50, targetLang: lang },
        });
        if (error) { toast({ title: "Erreur de traduction", variant: "destructive" }); break; }
        totalTranslated += data.translated || 0;
        setProgress(`${totalTranslated} traduits, ${data.remaining} restants`);
        if (data.done || data.remaining === 0) {
          const msg = totalTranslated > 0
            ? `${totalTranslated} avis traduits (${lang.toUpperCase()})`
            : `Tous les avis sont déjà traduits (${lang.toUpperCase()})`;
          setResult(msg);
          toast({ title: msg });
          break;
        }
        await new Promise(r => setTimeout(r, 500));
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
    setIsRunning(false);
    setProgress("");
  }, [abortRef, lang]);

  return (
    <Button size="sm" variant="outline" onClick={isRunning ? () => { abortRef.current = true; } : handleRun}>
      {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
      {isRunning ? progress || `Traduction ${lang.toUpperCase()}…` : result || label}
    </Button>
  );
}

export default StaffDashboard;
