import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowUp, ArrowDown, LayoutGrid, Video, Search, Monitor, FileText, Settings2, Home, Smartphone, Play, Image, MapPinned, FlaskConical, Youtube, MessageSquare, ImageDown } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import VideoLightbox from "@/components/staff/VideoLightbox";
import YouTubeBackofficePanel from "@/components/staff/YouTubeBackofficePanel";
import VideoThumbnailLocker from "@/components/staff/VideoThumbnailLocker";
import ImageCompressionPanel from "@/components/staff/ImageCompressionPanel";

interface FrontVideo {
  id: string;
  url: string;
  name: string | null;
  thumbnail_url: string | null;
  business_name: string;
}

const MOBILE_RESOLUTIONS = [
  { res: "390×844 (iPhone 14/15)", ratio: "~25%" },
  { res: "393×873 (iPhone 15 Pro)", ratio: "~15%" },
  { res: "360×800 (Android standard)", ratio: "~20%" },
  { res: "412×915 (Samsung Galaxy)", ratio: "~12%" },
  { res: "375×812 (iPhone X/11 Pro)", ratio: "~10%" },
];

const useMarrakechFrontVideos = () => {
  const [videos, setVideos] = useState<FrontVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: bizIds } = await supabase
        .from("businesses")
        .select("id")
        .eq("city", "Marrakech");
      if (!bizIds || bizIds.length === 0) { setLoading(false); return; }

      const ids = bizIds.map(b => b.id);
      const batchSize = 200;
      const allDocs: any[] = [];
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { data } = await supabase
          .from("business_documents")
          .select("id, url, name, thumbnail_url, front_sort_order, business_id")
          .eq("type", "video")
          .eq("show_on_front", true)
          .in("business_id", batch)
          .order("front_sort_order", { ascending: true });
        if (data) allDocs.push(...data);
      }

      allDocs.sort((a, b) => (a.front_sort_order || 0) - (b.front_sort_order || 0));
      const top9 = allDocs.slice(0, 9);

      const uniqueBizIds = [...new Set(top9.map(d => d.business_id))];
      if (uniqueBizIds.length > 0) {
        const { data: businesses } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", uniqueBizIds);
        const nameMap = new Map((businesses || []).map(b => [b.id, b.name]));
        setVideos(top9.map(d => ({
          id: d.id, url: d.url, name: d.name, thumbnail_url: d.thumbnail_url,
          business_name: nameMap.get(d.business_id) || "",
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  return { videos, loading };
};

const PreviewTab = ({ width, maxWidth, title, resolutions, breakpoints, cellSize }: {
  width: number; maxWidth?: string; title: string;
  resolutions: { res: string; ratio: string }[]; breakpoints: string;
  cellSize: number;
}) => {
  const { videos, loading } = useMarrakechFrontVideos();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const gridWidth = cellSize * 3 + 16;

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-8 items-start">
        <div className="border rounded-lg overflow-hidden shadow-sm p-4 bg-background" style={{ width, maxWidth: maxWidth || "100%" }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">Aperçu {title} — Grille vidéos Marrakech</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Chargement…</div>
          ) : videos.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Aucune vidéo sélectionnée pour le front</div>
          ) : (
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-2" style={{ width: gridWidth }}>
                {videos.map((v) => (
                  <div key={v.id} className="flex flex-col rounded-md border overflow-hidden bg-muted/30">
                    <button
                      className="relative bg-black group"
                      style={{ width: cellSize, height: cellSize * 9 / 16 }}
                      onClick={() => setLightboxUrl(v.url)}
                    >
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <VideoThumbnail src={v.url} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
                          <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </button>
                    <div className="px-1.5 py-1 truncate text-[10px] text-foreground">{v.business_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border rounded-lg bg-background p-5 shadow-sm text-sm" style={{ minWidth: 340 }}>
          <h3 className="font-bold text-foreground mb-3">Résolutions {title.toLowerCase()} courantes</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2 font-semibold text-foreground">Résolution CSS</th>
                <th className="py-2 font-semibold text-foreground text-right">Ratio</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {resolutions.map((r, i) => (
                <tr key={i} className={i < resolutions.length - 1 ? "border-b" : ""}>
                  <td className="py-2">{r.res}</td>
                  <td className="py-2 text-right">{r.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Breakpoints Tailwind : {breakpoints.split(" · ").map((bp, i) => (
              <span key={i}>{i > 0 && " · "}<code className="bg-muted px-1 rounded">{bp}</code></span>
            ))}
          </p>
        </div>
      </div>
      {lightboxUrl && <VideoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

/* ── Popup Panel ── */
interface PopupDoc {
  id: string;
  url: string;
  name: string | null;
  business_name: string;
  type: string;
}

const PopupPanel = () => {
  const [popupImages, setPopupImages] = useState<PopupDoc[]>([]);
  const [popupVideos, setPopupVideos] = useState<PopupDoc[]>([]);
  const [bizPopupImages, setBizPopupImages] = useState<{ id: string; name: string; popup_image_url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch popup documents
      const { data: docs } = await supabase
        .from("business_documents")
        .select("id, url, name, type, business_id")
        .eq("popup", true)
        .order("created_at", { ascending: false });

      // Fetch businesses with popup_image_url
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id, name, popup_image_url")
        .not("popup_image_url", "is", null)
        .neq("popup_image_url", "")
        .order("name");

      setBizPopupImages((bizData || []).filter(b => b.popup_image_url) as any);

      if (!docs || docs.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch business names for documents
      const uniqueBizIds = [...new Set(docs.map(d => d.business_id))];
      const nameMap = new Map<string, string>();
      const batchSize = 200;
      for (let i = 0; i < uniqueBizIds.length; i += batchSize) {
        const batch = uniqueBizIds.slice(i, i + batchSize);
        const { data: businesses } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", batch);
        if (businesses) businesses.forEach(b => nameMap.set(b.id, b.name));
      }

      const enriched: PopupDoc[] = docs.map(d => ({
        id: d.id,
        url: d.url,
        name: d.name,
        type: d.type,
        business_name: nameMap.get(d.business_id) || "—",
      }));

      setPopupImages(enriched.filter(d => d.type === "image"));
      setPopupVideos(enriched.filter(d => d.type === "video"));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Popup Images */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Image className="h-5 w-5" />
          Images Popup ({bizPopupImages.length + popupImages.length})
        </h3>
        {bizPopupImages.length === 0 && popupImages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune image popup trouvée.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Établissement</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Aperçu</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bizPopupImages.map(b => (
                  <tr key={`biz-${b.id}`}>
                    <td className="py-2 px-3 font-medium">{b.name}</td>
                    <td className="py-2 px-3">
                      <img src={b.popup_image_url} alt="" className="h-12 w-20 object-cover rounded border" />
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">Champ popup_image_url</td>
                  </tr>
                ))}
                {popupImages.map(d => (
                  <tr key={`doc-${d.id}`}>
                    <td className="py-2 px-3 font-medium">{d.business_name}</td>
                    <td className="py-2 px-3">
                      <img src={d.url} alt="" className="h-12 w-20 object-cover rounded border" />
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">Document image</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popup Videos */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Video className="h-5 w-5" />
          Vidéos Popup ({popupVideos.length})
        </h3>
        {popupVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vidéo popup trouvée.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Établissement</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Nom</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {popupVideos.map(d => (
                  <tr key={d.id}>
                    <td className="py-2 px-3 font-medium">{d.business_name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{d.name || "—"}</td>
                    <td className="py-2 px-3">
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate block max-w-[300px]">
                        {d.url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import logoGold from "@/assets/logoGOLDsimple.webp";
import FrontStructureManagement from "@/components/staff/FrontStructureManagement";
import DestinationVideosPanel from "@/components/staff/DestinationVideosPanel";
import RegenerateHomepageSnapshotButton from "@/components/staff/RegenerateHomepageSnapshotButton";
import HomepageFrontStructurePreview from "@/components/staff/HomepageFrontStructurePreview";
import HomepageCardsFront from "@/components/HomepageCardsFront";
import PopularSearchesManagement from "@/components/staff/PopularSearchesManagement";
import DisplayPanel from "@/components/staff/DisplayPanel";
import CountryVideosPanel from "@/components/staff/CountryVideosPanel";
import ServiceVideosPanel from "@/components/staff/ServiceVideosPanel";
import PoiVideosPanel from "@/components/staff/PoiVideosPanel";
import DestinationVideosPanelTab from "@/components/staff/DestinationVideosPanelTab";
import BlogManagement from "@/components/staff/BlogManagement";
import SocialLinksManagement from "@/components/staff/SocialLinksManagement";
import VideoPoiAssignmentPanel from "@/components/staff/VideoPoiAssignmentPanel";
import GenericVideosPanel from "@/components/staff/GenericVideosPanel";
import FrontStructureVideosPanel from "@/components/staff/FrontStructureVideosPanel";
import VideoDbStructurePanel from "@/components/staff/VideoDbStructurePanel";
import TestNoteViewer from "@/components/staff/TestNoteViewer";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import { PAGE_META } from "@/seo/pageMeta";
import PageMetaDescriptionEditor from "@/components/staff/PageMetaDescriptionEditor";
import { DYNAMIC_PATTERNS } from "@/seo/RouteSeo";

const StaffFront = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const [showTopArrow, setShowTopArrow] = useState(false);
  const [showBottomArrow, setShowBottomArrow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const st = window.scrollY;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      setShowTopArrow(st > 120);
      setShowBottomArrow(st + winH < docH - 120);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/staff/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/staff/login");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-gold.webp" alt="Logo" className="h-10 w-10 object-contain" />
            <span className="font-serif text-lg font-bold text-background">Présentation</span>
          </div>
          <Button variant="ghost" size="sm" className="text-background hover:text-gold" onClick={() => navigate("/staff/backoffice")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </header>

      <main className="w-full px-4 py-6">
        <Tabs defaultValue="front-structure">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="front-structure" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Structure du front
            </TabsTrigger>
            <TabsTrigger value="homepage" className="gap-2">
              <Home className="h-4 w-4" />
              Homepage
            </TabsTrigger>
            <TabsTrigger value="popup" className="gap-2">
              <Image className="h-4 w-4" />
              Popup
            </TabsTrigger>
            <TabsTrigger value="preview-mobile" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Structure DB
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <Search className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Monitor className="h-4 w-4" />
              Affichage
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FileText className="h-4 w-4" />
              Ressources
            </TabsTrigger>
            <TabsTrigger value="social-links" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Réseaux sociaux
            </TabsTrigger>
            <TabsTrigger value="pages" className="gap-2">
              <FileText className="h-4 w-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="image-compression" className="gap-2">
              <ImageDown className="h-4 w-4" />
              Compression d'images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="front-structure">
            <FrontStructureManagement open={true} onOpenChange={() => {}} inline />
          </TabsContent>

          <TabsContent value="image-compression">
            <ImageCompressionPanel />
          </TabsContent>



          <TabsContent value="homepage">
            <Tabs defaultValue="marrakech">
              <TabsList className="mb-4">
                <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
                <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
              </TabsList>
              <TabsContent value="marrakech">
                <RegenerateHomepageSnapshotButton cityName="Marrakech" />
                <HomepageFrontStructurePreview city="Marrakech" />
              </TabsContent>
              <TabsContent value="essaouira">
                <RegenerateHomepageSnapshotButton cityName="Essaouira" />
                <HomepageFrontStructurePreview city="Essaouira" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="popup">
            <PopupPanel />
          </TabsContent>

          <TabsContent value="country-videos">
            <Tabs defaultValue="">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="front-videos">Homepage</TabsTrigger>
                <TabsTrigger value="fs-videos">Structure du front</TabsTrigger>
                <TabsTrigger value="sub-videos">Avec sous-catégorie</TabsTrigger>
                <TabsTrigger value="no-sub-videos">Sans sous-catégorie</TabsTrigger>
                <TabsTrigger value="service-videos">Services</TabsTrigger>
                <TabsTrigger value="poi-videos">POI</TabsTrigger>
                <TabsTrigger value="dest-videos">Destinations</TabsTrigger>
                <TabsTrigger value="pois-videos">POIS</TabsTrigger>
                <TabsTrigger value="generic-videos">Génériques</TabsTrigger>
                <TabsTrigger value="db-structure">Toutes</TabsTrigger>
              </TabsList>
              <TabsContent value="front-videos">
                <Tabs defaultValue="marrakech">
                  <TabsList className="mb-4">
                    <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
                    <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
                  </TabsList>
                  <TabsContent value="marrakech">
                    <DestinationVideosPanel cityName="Marrakech" />
                  </TabsContent>
                  <TabsContent value="essaouira">
                    <DestinationVideosPanel cityName="Essaouira" />
                  </TabsContent>
                </Tabs>
              </TabsContent>
              <TabsContent value="sub-videos">
                <CountryVideosPanel withSubcategory={true} />
              </TabsContent>
              <TabsContent value="no-sub-videos">
                <CountryVideosPanel withSubcategory={false} />
              </TabsContent>
              <TabsContent value="service-videos">
                <ServiceVideosPanel />
              </TabsContent>
              <TabsContent value="poi-videos">
                <PoiVideosPanel />
              </TabsContent>
              <TabsContent value="dest-videos">
                <DestinationVideosPanelTab />
              </TabsContent>
              <TabsContent value="pois-videos">
                <VideoPoiAssignmentPanel />
              </TabsContent>
              <TabsContent value="generic-videos">
                <GenericVideosPanel />
              </TabsContent>
              <TabsContent value="fs-videos">
                <FrontStructureVideosPanel />
              </TabsContent>
              <TabsContent value="db-structure">
                <VideoDbStructurePanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="youtube">
            <YouTubeBackofficePanel />
          </TabsContent>

          <TabsContent value="video-id">
            <VideoThumbnailLocker />
          </TabsContent>

          <TabsContent value="test">
            <TestNoteViewer />
          </TabsContent>

          <TabsContent value="preview-mobile">
            <div className="grid grid-cols-2 gap-6 w-full">
              {/* Business Documents (videos) */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">business_documents <span className="text-muted-foreground font-normal">(type = video)</span></h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-1.5 px-2 font-medium">Champ</th>
                        <th className="text-left py-1.5 px-2 font-medium">Type</th>
                        <th className="text-center py-1.5 px-2 font-medium">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { col: "id", type: "uuid", nullable: false },
                        { col: "business_id", type: "uuid", nullable: false },
                        { col: "type", type: "text", nullable: false },
                        { col: "url", type: "text", nullable: false },
                        { col: "name", type: "text", nullable: true },
                        { col: "language", type: "text", nullable: true },
                        { col: "sort_order", type: "integer", nullable: false },
                        { col: "created_at", type: "timestamptz", nullable: false },
                        { col: "icon", type: "text", nullable: true },
                        { col: "poi_id", type: "uuid", nullable: true },
                        { col: "destination_id", type: "uuid", nullable: true },
                        { col: "linked_business_id", type: "uuid", nullable: true },
                        { col: "subcategory_id", type: "uuid", nullable: true },
                        { col: "city", type: "text", nullable: true },
                        { col: "description", type: "text", nullable: true },
                        { col: "neighborhood", type: "text", nullable: true },
                        { col: "price", type: "text", nullable: true },
                        { col: "price_type", type: "text", nullable: true },
                        { col: "thumbnail_url", type: "text", nullable: true },
                        { col: "service_id", type: "uuid", nullable: true },
                        { col: "popup", type: "boolean", nullable: false },
                        { col: "start_date", type: "date", nullable: true },
                        { col: "end_date", type: "date", nullable: true },
                        { col: "show_on_front", type: "boolean", nullable: false },
                        { col: "front_sort_order", type: "integer", nullable: false },
                        { col: "force_external", type: "boolean", nullable: false },
                        { col: "event_id", type: "uuid", nullable: true },
                      ].map(f => (
                        <tr key={f.col} className="hover:bg-muted/30">
                          <td className="py-1 px-2 font-mono text-[11px]">{f.col}</td>
                          <td className="py-1 px-2 text-muted-foreground">{f.type}</td>
                          <td className="py-1 px-2 text-center">{f.nullable ? "✓" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Generic Videos */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">generic_videos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-1.5 px-2 font-medium">Champ</th>
                        <th className="text-left py-1.5 px-2 font-medium">Type</th>
                        <th className="text-center py-1.5 px-2 font-medium">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { col: "id", type: "uuid", nullable: false },
                        { col: "url", type: "text", nullable: false },
                        { col: "name", type: "text", nullable: true },
                        { col: "thumbnail_url", type: "text", nullable: true },
                        { col: "city", type: "text", nullable: true },
                        { col: "neighborhood", type: "text", nullable: true },
                        { col: "sort_order", type: "integer", nullable: false },
                        { col: "created_at", type: "timestamptz", nullable: false },
                        { col: "updated_at", type: "timestamptz", nullable: false },
                        { col: "instagram_account", type: "text", nullable: true },
                        { col: "instagram_url", type: "text", nullable: true },
                        { col: "tiktok_account", type: "text", nullable: true },
                        { col: "tiktok_url", type: "text", nullable: true },
                        { col: "youtube_account", type: "text", nullable: true },
                        { col: "youtube_url", type: "text", nullable: true },
                        { col: "description", type: "text", nullable: true },
                        { col: "instagram_video_url", type: "text", nullable: true },
                        { col: "tiktok_video_url", type: "text", nullable: true },
                        { col: "youtube_video_url", type: "text", nullable: true },
                      ].map(f => (
                        <tr key={f.col} className="hover:bg-muted/30">
                          <td className="py-1 px-2 font-mono text-[11px]">{f.col}</td>
                          <td className="py-1 px-2 text-muted-foreground">{f.type}</td>
                          <td className="py-1 px-2 text-center">{f.nullable ? "✓" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <PopularSearchesManagement />
          </TabsContent>

          <TabsContent value="display">
            <DisplayPanel />
          </TabsContent>

          <TabsContent value="resources">
            <BlogManagement />
          </TabsContent>

          <TabsContent value="social-links">
            <SocialLinksManagement />
          </TabsContent>

          <TabsContent value="pages">
            {(() => {
              const pages: { group: string; name: string; url: string; description: string }[] = [
                // Pages principales
                { group: "Principales", name: "Homepage", url: "/", description: "Page d'accueil avec étapes inspirationnelles et sélections éditoriales." },
                { group: "Principales", name: "Recherche", url: "/search", description: "Moteur de recherche principal (établissements, vidéos, destinations…)." },
                { group: "Principales", name: "Carte globale", url: "/carte", description: "Carte interactive de tous les établissements actifs." },
                { group: "Principales", name: "Hôtels", url: "/hotels", description: "Recherche d'hôtels avec disponibilités et prix." },
                { group: "Principales", name: "Blog", url: "/blog", description: "Liste des articles éditoriaux." },
                { group: "Principales", name: "Article blog", url: "/blog/:slug", description: "Page d'un article de blog." },
                { group: "Principales", name: "Vidéos", url: "/videos", description: "Page dédiée aux vidéos (vignettes 1 entité = 1 vignette)." },

                // Articles blog dédiés (pages statiques)
                
                { group: "Articles blog dédiés", name: "5 jours Marrakech artisanat", url: "/blog/5-jours-marrakech-artisanat", description: "Itinéraire artisanat à Marrakech." },
                { group: "Articles blog dédiés", name: "Galeries d'art Marrakech", url: "/blog/galeries-art-marrakech", description: "Sélection des galeries d'art à Marrakech." },
                { group: "Articles blog dédiés", name: "Ancien accueil", url: "/blog/ancien-accueil", description: "Archive de l'ancienne page d'accueil." },
                { group: "Articles blog dédiés", name: "Typographie", url: "/blog/typographie", description: "Démo / article typographie." },
                { group: "Articles blog dédiés", name: "Icon preview", url: "/blog/icon-preview", description: "Aperçu des icônes utilisées sur le site." },

                // Autres
                { group: "Autres", name: "Ancien index", url: "/ancien-index", description: "Ancienne version de la homepage (archive)." },
                { group: "Autres", name: "Test", url: "/test", description: "Page de test interne (même composant que /videos)." },
                { group: "Autres", name: "Search analytics", url: "/search-analytics", description: "Statistiques de recherche (accès interne)." },

                // Pages marque / corporate
                { group: "Marque", name: "Corporate", url: "/corporate", description: "Présentation institutionnelle de One World Morocco." },
                { group: "Marque", name: "Club OWM", url: "/club", description: "Présentation du club et de ses avantages membres." },
                { group: "Marque", name: "Join", url: "/join", description: "Page d'adhésion / inscription au club." },
                { group: "Marque", name: "Card", url: "/card", description: "Présentation de la carte OWM." },
                { group: "Marque", name: "Mission", url: "/mission", description: "Page mission et valeurs." },
                { group: "Marque", name: "Contact", url: "/contact", description: "Formulaire et coordonnées de contact." },
                { group: "Marque", name: "Devenir affilié", url: "/devenir-affilie", description: "Présentation du programme d'affiliation et formulaire de candidature." },

                // Footer / légal
                { group: "Footer / Légal", name: "Conditions générales", url: "/conditions-generales", description: "CGU / CGV du site." },
                { group: "Footer / Légal", name: "Désabonnement", url: "/unsubscribe", description: "Page de désabonnement aux emails." },
                { group: "Footer / Légal", name: "Installation PWA", url: "/install", description: "Guide d'installation de l'application." },

                // Taxonomies
                { group: "Taxonomies", name: "Catégorie", url: "/category/:categoryName", description: "Page d'une catégorie (ex: Restaurants, Hôtels…)." },
                { group: "Taxonomies", name: "Sous-catégorie", url: "/subcategory/:subcategoryName", description: "Page d'une sous-catégorie." },
                { group: "Taxonomies", name: "Service", url: "/service/*", description: "Page d'un service (ex: Spa, Cours de cuisine…)." },

                // Géographie
                { group: "Géographie", name: "Ville", url: "/city/:city", description: "Page d'une ville (homepage ville + carte)." },
                { group: "Géographie", name: "Quartier", url: "/neighborhood/:neighborhood", description: "Page d'un quartier." },
                { group: "Géographie", name: "Destination", url: "/destination/:destinationName", description: "Page d'une destination touristique." },

                // Fiches
                { group: "Fiches", name: "Fiche immersive", url: "/fiche/:slug", description: "Fiche établissement immersive (partage). Redirige vers /search avec contexte." },
                { group: "Fiches", name: "Établissement (legacy)", url: "/business/:slug", description: "Redirection legacy vers la fiche immersive." },
                { group: "Fiches", name: "Vanity URL", url: "/:vanitySlug", description: "Alias court qui redirige vers une fiche ou une destination." },

                // Profils publics
                { group: "Profils publics", name: "Chaîne YouTube", url: "/y/:slug", description: "Page publique d'une chaîne YouTube référencée." },
                { group: "Profils publics", name: "Profil membre club", url: "/u/:pseudo", description: "Page publique d'un membre du club OWM." },

                // Espace affiliés
                { group: "Affiliés", name: "Connexion affilié", url: "/affiliates", description: "Page de connexion des affiliés." },
                { group: "Affiliés", name: "Reset mot de passe", url: "/affiliates/reset-password", description: "Réinitialisation du mot de passe affilié." },
                { group: "Affiliés", name: "Dashboard affilié", url: "/affiliates/dashboard", description: "Tableau de bord de l'affilié." },
                { group: "Affiliés", name: "Présence affilié", url: "/affiliates/presence", description: "Gestion de la présence en ligne de l'affilié." },

                // Système
                { group: "Système", name: "404", url: "*", description: "Page non trouvée." },
              ];
              const groups = Array.from(new Set(pages.map((p) => p.group)));
              return (
                <div className="rounded-lg border bg-card p-6 space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold">Pages</h2>
                    <p className="text-sm text-muted-foreground">
                      Inventaire des types de pages publiques du site.
                    </p>
                  </div>
                  {groups.map((g) => (
                    <div key={g}>
                      <h3 className="text-base font-semibold mb-2">{g}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b bg-muted/40">
                              <th className="text-left p-2 font-medium w-[18%]">Nom</th>
                              <th className="text-left p-2 font-medium w-[22%]">URL</th>
                              <th className="text-left p-2 font-medium w-[28%]">Fonction</th>
                              <th className="text-left p-2 font-medium">Description (meta)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pages.filter((p) => p.group === g).map((p) => {
                              const isDynamic = DYNAMIC_PATTERNS.has(p.url);
                              return (
                                <tr key={p.url + p.name} className="border-b last:border-0 align-top">
                                  <td className="p-2 font-medium">{p.name}</td>
                                  <td className="p-2 font-mono text-xs text-muted-foreground">{p.url}</td>
                                  <td className="p-2 text-muted-foreground">{p.description}</td>
                                  <td className="p-2 text-muted-foreground text-xs">
                                    {isDynamic ? (
                                      <div className="space-y-1 text-muted-foreground/70 italic">
                                        <div className="inline-block text-[9px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                          Géré dynamiquement (SEO)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {PAGE_META[p.url]?.description || "Génération dynamique par le code"}
                                        </p>
                                      </div>
                                    ) : (
                                      <PageMetaDescriptionEditor
                                        routePattern={p.url}
                                        fallback={PAGE_META[p.url]?.description ?? ""}
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffFront;
