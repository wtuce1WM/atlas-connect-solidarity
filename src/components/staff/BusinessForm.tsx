import { useState, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { businessUrl } from "@/lib/businessUrl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import restaurantGuruLogo from "@/assets/restaurant-guru-logo.webp";
import glovoLogo from "@/assets/glovo-logo.png";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import { whatsappUrl } from "@/lib/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { ArrowLeft, ArrowDown, Save, Award, Trash2, MapPinned, AlertCircle, Copy, ExternalLink, Globe, Star, Plus, Merge, ArrowRight, Loader2, FileText, X, Upload, Image as ImageIcon, ChevronUp, ChevronDown, GripVertical, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { Tables } from "@/integrations/supabase/types";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import PDFUploader from "./PDFUploader";
import VideoUploader from "./VideoUploader";
import LogoUploader from "./LogoUploader";
import BusinessLabelsEditor from "./BusinessLabelsEditor";
import OpeningHoursEditor, { OpeningHours, DEFAULT_OPENING_HOURS } from "./OpeningHoursEditor";
import VacationDatesEditor, { VacationPeriod } from "./VacationDatesEditor";
import SocialPostsEditor from "./SocialPostsEditor";
import WebOnlyEditor from "./WebOnlyEditor";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedInIcon,
  YouTubeIcon,
  TikTokIcon,
  WhatsAppIcon,
  TripAdvisorIcon,
  BookingIcon,
  GoogleMapsIcon,
  AirbnbIcon,
  PinterestIcon,
  SkypeIcon,
  VimeoIcon,
} from "./SocialMediaIcons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Business = Tables<"businesses">;

interface BrokenLinkEntry {
  field: string;
  url: string;
}

interface BusinessFormProps {
  business: Business | null;
  onSuccess: () => void;
  onCancel: () => void;
  brokenLinks?: BrokenLinkEntry[];
}

const REGIONS = [
  "Tanger-Tétouan-Al Hoceïma",
  "L'Oriental",
  "Fès-Meknès",
  "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra",
  "Casablanca-Settat",
  "Marrakech-Safi",
  "Drâa-Tafilalet",
  "Souss-Massa",
  "Guelmim-Oued Noun",
  "Laâyoune-Sakia El Hamra",
  "Dakhla-Oued Ed-Dahab",
];

const CATEGORIES = [
  "Hôtellerie",
  "Restauration",
  "Transport",
  "Artisanat",
  "Commerce",
  "Services",
  "Tourisme",
  "Agriculture",
  "Industrie",
  "Éducation",
  "Santé",
  "Sport & Loisirs",
  "Bien-être",
  "Culture",
  "Technologie",
];

// Subcategories and services are now fetched from the database

const SERVICES: Record<string, string[]> = {
  "Hôtellerie": [
    "WiFi",
    "Piscine",
    "Spa",
    "Restaurant",
    "Bar",
    "Room service",
    "Parking",
    "Climatisation",
    "Petit-déjeuner inclus",
    "Transfert aéroport",
    "Conciergerie",
    "Salle de sport",
    "Terrasse",
    "Vue mer",
    "Vue montagne",
  ],
  "Restauration": [
    "Terrasse",
    "Climatisation",
    "WiFi",
    "Livraison",
    "À emporter",
    "Réservation",
    "Parking",
    "Menu végétarien",
    "Menu halal",
    "Carte des vins",
    "Musique live",
    "Espace fumeur",
  ],
  "Transport": [
    "Climatisation",
    "GPS",
    "Siège bébé",
    "Assurance incluse",
    "Chauffeur",
    "24h/24",
    "Réservation en ligne",
    "Paiement carte",
    "Multilingue",
  ],
  "Artisanat": [
    "Fabrication sur mesure",
    "Livraison",
    "Atelier visitable",
    "Démonstration",
    "Cours/Initiation",
    "Certificat d'authenticité",
    "Export",
  ],
  "Commerce": [
    "Paiement carte",
    "Livraison",
    "Click & Collect",
    "Parking",
    "Climatisation",
    "Service client",
    "Retours acceptés",
  ],
  "Services": [
    "Devis gratuit",
    "Sur rendez-vous",
    "À domicile",
    "En ligne",
    "Multilingue",
    "24h/24",
    "Urgence",
  ],
  "Tourisme": [
    "Guide multilingue",
    "Transport inclus",
    "Repas inclus",
    "Équipement fourni",
    "Assurance incluse",
    "Photos/Vidéos",
    "Petit groupe",
    "Sur mesure",
  ],
  "Agriculture": [
    "Bio",
    "Commerce équitable",
    "Visite de ferme",
    "Vente directe",
    "Livraison",
    "Export",
    "Dégustation",
  ],
  "Industrie": [
    "Certifié ISO",
    "Export",
    "Sur mesure",
    "Livraison",
    "SAV",
    "Formation",
  ],
  "Éducation": [
    "Certificat",
    "En ligne",
    "Présentiel",
    "Tous niveaux",
    "Cours particuliers",
    "Cours collectifs",
    "Stage intensif",
    "Matériel fourni",
  ],
  "Santé": [
    "Rendez-vous en ligne",
    "Urgences",
    "Tiers payant",
    "Parking",
    "Accès PMR",
    "Multilingue",
    "Téléconsultation",
  ],
  "Sport & Loisirs": [
    "Cours débutant",
    "Cours avancé",
    "Location matériel",
    "Encadrement certifié",
    "Vestiaires",
    "Douches",
    "Cours particuliers",
    "Cours collectifs",
    "Stage",
    "Enfants acceptés",
  ],
  "Bien-être": [
    "Sur rendez-vous",
    "Sans rendez-vous",
    "Produits bio",
    "Forfaits",
    "Carte de fidélité",
    "Couples",
    "Privatisation",
    "Vestiaires",
  ],
  "Culture": [
    "Visite guidée",
    "Audioguide",
    "Boutique",
    "Café",
    "Accès PMR",
    "Groupes",
    "Scolaires",
    "Événements privés",
  ],
  "Technologie": [
    "Devis gratuit",
    "Support 24/7",
    "Formation",
    "Maintenance",
    "Hébergement",
    "SEO",
    "E-commerce",
    "Application mobile",
  ],
};

type VideoDocEntry = { id?: string; url: string; name: string; poi_id: string | null; destination_id: string | null; linked_business_id: string | null; subcategory_id: string | null; city: string | null; neighborhood: string | null; description: string | null; price: string | null; price_type: string | null; thumbnail_url: string | null };

/** Generate a JPEG thumbnail from a video URL. Returns a Blob or null. */
async function generateVideoThumbnail(videoUrl: string): Promise<Blob | null> {
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.78));

  const isMostlyBlack = (canvas: HTMLCanvasElement) => {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let total = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }
      return total / pixels < 22;
    } catch {
      // Cross-origin canvas may block pixel reads; in that case we still accept blob capture.
      return false;
    }
  };

  const tryCapture = (useCors: boolean): Promise<Blob | null> =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      if (useCors) video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = videoUrl;

      let done = false;
      const seekRatios = [0.08, 0.2, 0.35, 0.55];
      let seekIndex = 0;

      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        video.remove();
      };

      const finish = (blob: Blob | null) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        cleanup();
        resolve(blob);
      };

      const getSeekTime = () => {
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        if (!duration) return 1.5;
        return Math.max(0.4, Math.min(duration - 0.2, duration * seekRatios[seekIndex]));
      };

      const captureCurrentFrame = async () => {
        try {
          const THUMB_W = 1280;
          const THUMB_H = 720;
          const natW = video.videoWidth || THUMB_W;
          const natH = video.videoHeight || THUMB_H;
          const scale = Math.min(THUMB_W / natW, THUMB_H / natH, 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(natW * scale));
          canvas.height = Math.max(1, Math.round(natH * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const blob = await canvasToBlob(canvas);
          if (!blob || blob.size < 900) return null;
          if (isMostlyBlack(canvas) && seekIndex < seekRatios.length - 1) return null;
          return blob;
        } catch {
          return null;
        }
      };

      const onSeeked = async () => {
        const blob = await captureCurrentFrame();
        if (blob) {
          finish(blob);
          return;
        }

        if (seekIndex < seekRatios.length - 1) {
          seekIndex += 1;
          try {
            video.currentTime = getSeekTime();
          } catch {
            finish(null);
          }
          return;
        }

        finish(null);
      };

      const onLoadedMetadata = () => {
        try {
          video.currentTime = getSeekTime();
        } catch {
          finish(null);
        }
      };

      const onError = () => {
        console.warn("[thumb] video load error", useCors ? "(CORS)" : "(no-CORS)", videoUrl);
        finish(null);
      };

      const timeout = setTimeout(() => {
        console.warn("[thumb] timeout loading video", videoUrl);
        finish(null);
      }, 20000);

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);
    });

  const corsBlob = await tryCapture(true);
  if (corsBlob) return corsBlob;
  console.log("[thumb] CORS attempt failed, retrying without crossOrigin…");
  return tryCapture(false);
}

const isInternalBusinessVideoUrl = (url: string) =>
  /\/storage\/v1\/object\/public\/business-videos\//i.test(url);

async function internalizeExternalVideoUrl(videoUrl: string, businessId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("internalize-video", {
      body: { videoUrl, businessId },
    });

    if (error) {
      console.warn("[thumb] Internalize function error:", error.message);
      return null;
    }

    const publicUrl = data?.publicUrl;
    if (typeof publicUrl === "string" && publicUrl.trim()) {
      console.log("[thumb] Video internalized:", publicUrl);
      return publicUrl;
    }

    return null;
  } catch (e) {
    console.warn("[thumb] Internalize invocation failed:", e);
    return null;
  }
}

interface SortableVideoCardProps {
  id: string;
  doc: VideoDocEntry;
  idx: number;
  videoDocs: VideoDocEntry[];
  setVideoDocs: Dispatch<SetStateAction<VideoDocEntry[]>>;
  poiBusinessesForCity: Array<{ id: string; name: string; neighborhood: string | null }>;
  dbDestinations: Array<{ id: string; name_fr: string }>;
  allBusinessesForVideo: Array<{ id: string; name: string }>;
  videoBusinessSearch: Record<number, string>;
  setVideoBusinessSearch: Dispatch<SetStateAction<Record<number, string>>>;
  dbSubcategories: Array<{ id: string; name_fr: string; category_id: string }>;
  dbCities: Array<{ id: string; name_fr: string; region: string | null }>;
  dbNeighborhoods: Array<{ id: string; name: string; city_id: string }>;
  business: any;
  toast: any;
  onOpenDesc: () => void;
  onDelete: () => void;
}

const SortableDocRow = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-2">{children}</div>
    </div>
  );
};

const SortableVideoCard = ({ id, doc, idx, videoDocs, setVideoDocs, poiBusinessesForCity, dbDestinations, allBusinessesForVideo, videoBusinessSearch, setVideoBusinessSearch, dbSubcategories, dbCities, dbNeighborhoods, business, toast, onOpenDesc, onDelete }: SortableVideoCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1 p-1.5 border rounded-md bg-background relative group">
      {/* Header: drag handle + title + TXT + delete */}
      <div className="flex items-center gap-1">
        <button type="button" {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/><circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/></svg>
        </button>
        <span className="text-[9px] text-muted-foreground shrink-0">{idx + 1}</span>
        <Button type="button" variant={doc.description ? "default" : "outline"} size="sm" className="h-5 px-1.5 text-[9px] shrink-0" title="Description" onClick={onOpenDesc}>
          TXT
        </Button>
        <Input
          value={doc.name}
          onChange={(e) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
          placeholder="Titre"
          className="h-5 text-[10px] flex-1 min-w-0"
        />
        <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:text-destructive shrink-0" title="Supprimer" onClick={onDelete}>
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>
      {/* Preview or input — reduced size */}
      {doc.url ? (
        <div className="space-y-0.5">
          <div className="relative aspect-square w-full rounded overflow-hidden border bg-black">
            {(() => {
              const url = doc.url;
              const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
              if (ytMatch) return <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
              const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
              if (vimeoMatch) return <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
              return <video src={url} controls className="w-full h-full object-contain" playsInline />;
            })()}
            <button type="button" onClick={() => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: "" } : d))}
              className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-80 hover:opacity-100 transition-opacity">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground truncate" title={doc.url}>
            {doc.url.includes("supabase.co/storage") ? "📦" : "🌐"} {doc.url.split('/').pop()?.substring(0, 25)}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <Input
            value={doc.url}
            onChange={(e) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: e.target.value } : d))}
            placeholder="URL vidéo…"
            className="h-5 text-[10px]"
          />
          <div>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" id={`video-doc-upload-${idx}`} className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 100 * 1024 * 1024) { toast({ variant: "destructive", title: "Fichier trop volumineux", description: "Max 100MB" }); return; }
                const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
                const fileName = `${business?.id || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const path = `businesses/${fileName}`;
                const { error } = await supabase.storage.from("business-videos").upload(path, file, { cacheControl: "3600", upsert: false });
                if (error) { toast({ variant: "destructive", title: "Erreur d'upload", description: error.message }); return; }
                const { data: urlData } = supabase.storage.from("business-videos").getPublicUrl(path);
                if (urlData?.publicUrl) { setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: urlData.publicUrl } : d)); toast({ title: "Vidéo uploadée ✓" }); }
              }}
            />
            <Button type="button" variant="outline" size="sm" className="h-5 text-[9px] gap-1 w-full" onClick={() => document.getElementById(`video-doc-upload-${idx}`)?.click()}>
              <Upload className="h-2.5 w-2.5" /> Uploader
            </Button>
          </div>
        </div>
      )}
      {/* POI, Destination, Business, Subcategory & City selectors — collapsible */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full">
            <ChevronDown className="h-2.5 w-2.5 transition-transform [[data-state=open]>&]:rotate-180" />
            Liaisons
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 gap-1 pt-1">
            <div>
              <label className="text-[9px] text-muted-foreground">POI</label>
              <Select value={doc.poi_id || "__none__"} onValueChange={(v) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, poi_id: v === "__none__" ? null : v } : d))}>
                <SelectTrigger className="h-5 text-[9px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun</SelectItem>
                  {poiBusinessesForCity.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Destination</label>
              <Select value={doc.destination_id || "__none__"} onValueChange={(v) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, destination_id: v === "__none__" ? null : v } : d))}>
                <SelectTrigger className="h-5 text-[9px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucune</SelectItem>
                  {dbDestinations.map(d => <SelectItem key={d.id} value={d.id}>{d.name_fr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <label className="text-[9px] text-muted-foreground">Établissement</label>
              {doc.linked_business_id ? (
                <div className="flex items-center gap-0.5 h-5 px-1 border rounded-md bg-background">
                  <span className="text-[9px] truncate flex-1">{allBusinessesForVideo.find(b => b.id === doc.linked_business_id)?.name || "…"}</span>
                  <button type="button" className="shrink-0" onClick={() => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, linked_business_id: null } : d))}>
                    <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <div>
                  <Input
                    value={videoBusinessSearch[idx] || ""}
                    onChange={(e) => setVideoBusinessSearch(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="Rechercher…"
                    className="h-5 text-[9px]"
                  />
                  {(videoBusinessSearch[idx] || "").length >= 2 && (
                    <div className="absolute z-50 mt-0.5 w-full max-h-28 overflow-y-auto bg-popover border rounded-md shadow-md">
                      {allBusinessesForVideo
                        .filter(b => b.name.toLowerCase().includes((videoBusinessSearch[idx] || "").toLowerCase()))
                        .slice(0, 8)
                        .map(b => (
                          <button key={b.id} type="button" className="w-full text-left px-1.5 py-0.5 text-[9px] hover:bg-accent truncate"
                            onClick={() => { setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, linked_business_id: b.id } : d)); setVideoBusinessSearch(prev => ({ ...prev, [idx]: "" })); }}>
                            {b.name}
                          </button>
                        ))}
                      {allBusinessesForVideo.filter(b => b.name.toLowerCase().includes((videoBusinessSearch[idx] || "").toLowerCase())).length === 0 && (
                        <p className="px-1.5 py-0.5 text-[9px] text-muted-foreground">Aucun résultat</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Sous-catégorie</label>
              <Select value={doc.subcategory_id || "__none__"} onValueChange={(v) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, subcategory_id: v === "__none__" ? null : v } : d))}>
                <SelectTrigger className="h-5 text-[9px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucune</SelectItem>
                  {dbSubcategories.slice().sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr')).map(s => <SelectItem key={s.id} value={s.id}>{s.name_fr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Ville</label>
              <Select value={doc.city || "__none__"} onValueChange={(v) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, city: v === "__none__" ? null : v, neighborhood: null } : d))}>
                <SelectTrigger className="h-5 text-[9px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucune</SelectItem>
                  {dbCities.map(c => <SelectItem key={c.id} value={c.name_fr}>{c.name_fr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Quartier</label>
              <Select value={doc.neighborhood || "__none__"} onValueChange={(v) => setVideoDocs(prev => prev.map((d, i) => i === idx ? { ...d, neighborhood: v === "__none__" ? null : v } : d))}>
                <SelectTrigger className="h-5 text-[9px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun</SelectItem>
                  {(() => {
                    const selectedCity = dbCities.find(c => c.name_fr === doc.city);
                    if (!selectedCity) return null;
                    return dbNeighborhoods.filter(n => n.city_id === selectedCity.id).map(n => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>);
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const BusinessForm = ({ business, onSuccess, onCancel, brokenLinks = [] }: BusinessFormProps) => {
  // Set of broken URL values for quick lookup
  const brokenUrlSet = useMemo(() => new Set(brokenLinks.map(bl => bl.url)), [brokenLinks]);
  const isBrokenUrl = (url: string) => url && brokenUrlSet.has(url);

  // Broken URL inline alert badge
  const BrokenUrlBadge = ({ url }: { url: string }) => {
    if (!isBrokenUrl(url)) return null;
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-100 border border-red-300 text-red-700 text-xs font-semibold mt-1 animate-pulse">
        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <span>⚠ Lien cassé — ce lien ne fonctionne pas</span>
      </div>
    );
  };
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showClearSocial, setShowClearSocial] = useState(false);
  const [showClearBooking, setShowClearBooking] = useState(false);
  const [showClearReviews, setShowClearReviews] = useState(false);
  const [isReviewCalcLoading, setIsReviewCalcLoading] = useState(false);
  const [quickAddDialog, setQuickAddDialog] = useState<{ type: "certification" | "engagement" | "commodite" | "badge"; value: string } | null>(null);
  // Track all custom items ever added so they remain visible even when deselected
  const [customCerts, setCustomCerts] = useState<string[]>([]);
  const [customEngs, setCustomEngs] = useState<string[]>([]);
  const [customCommodites, setCustomCommodites] = useState<string[]>([]);
  const [globalCustomOptions, setGlobalCustomOptions] = useState<{ certifications: string[]; engagements: string[]; commodites: string[] }>({
    certifications: [],
    engagements: [],
    commodites: [],
  });
  const { toast } = useToast();
  
  // Dynamic subcategories and services from database
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [dbSubcategories, setDbSubcategories] = useState<Array<{ id: string; name_fr: string; category_id: string }>>([]);
  const [dbServices, setDbServices] = useState<Array<{ id: string; name_fr: string; subcategory_id: string }>>([]);
  const [dbCities, setDbCities] = useState<Array<{ id: string; name_fr: string; region: string | null }>>([]);
  const [dbGammes, setDbGammes] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [gammeCategories, setGammeCategories] = useState<Array<{ gamme_id: string; category_id: string }>>([]);
  const [dbBadges, setDbBadges] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<Array<{ badge_id: string; subcategory_id: string }>>([]);
  const [dbNeighborhoods, setDbNeighborhoods] = useState<Array<{ id: string; name: string; city_id: string }>>([]);
  const [dbAffiliates, setDbAffiliates] = useState<Array<{ id: string; name: string }>>([]);
  const [dbDestinations, setDbDestinations] = useState<Array<{ id: string; name_fr: string; region: string[] | null }>>([]);
  const [dbPOIs, setDbPOIs] = useState<Array<{ id: string; name_fr: string; city_id: string }>>([]);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<string[]>([]);
  const [selectedPOIIds, setSelectedPOIIds] = useState<string[]>([]);
  const [selectedPoiBusinessIds, setSelectedPoiBusinessIds] = useState<string[]>([]);
  const [poiBusinessesForCity, setPoiBusinessesForCity] = useState<Array<{ id: string; name: string; neighborhood: string | null }>>([]);
  const [allBusinessesForVideo, setAllBusinessesForVideo] = useState<Array<{ id: string; name: string }>>([]);
  const [videoBusinessSearch, setVideoBusinessSearch] = useState<Record<number, string>>({});
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [defaultBadgeId, setDefaultBadgeId] = useState<string | null>(null);
  const [intentWords, setIntentWords] = useState<Array<{ id: string; word: string; category_name: string; merge_on_conflict: boolean; is_active: boolean }>>([]);
  const [intentsLoading, setIntentsLoading] = useState(true);
  const [newIntentWord, setNewIntentWord] = useState("");
  const [newIntentCategory, setNewIntentCategory] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [creatingService, setCreatingService] = useState(false);
  useEffect(() => {
    const fetchTaxonomy = async () => {
      const [catRes, subRes, servRes, citiesRes, gammesRes, gammeCatRes, neighborhoodsRes, affiliatesRes, badgesRes, badgeSubcatsRes, destRes, poiRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        fetchAllRows("services", "id, name_fr, subcategory_id", "sort_order"),
        supabase.from("cities").select("id, name_fr, region").order("name_fr"),
        supabase.from("gammes").select("id, name_fr").order("sort_order"),
        supabase.from("gamme_categories").select("gamme_id, category_id"),
        supabase.from("neighborhoods").select("id, name, city_id").order("name"),
        supabase.from("affiliates").select("id, name").order("name"),
        supabase.from("badges").select("id, name_fr").order("sort_order"),
        supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
        supabase.from("destinations").select("id, name_fr, region").order("name_fr"),
        supabase.from("points_of_interest").select("id, name_fr, city_id").order("name_fr"),
      ]);
      
      if (catRes.data) setDbCategories(catRes.data);
      if (subRes.data) setDbSubcategories(subRes.data);
      setDbServices(servRes as any[]);
      if (citiesRes.data) setDbCities(citiesRes.data);
      if (gammesRes.data) setDbGammes(gammesRes.data);
      if (gammeCatRes.data) setGammeCategories(gammeCatRes.data);
      if (neighborhoodsRes.data) setDbNeighborhoods(neighborhoodsRes.data);
      if (affiliatesRes.data) setDbAffiliates(affiliatesRes.data);
      if (badgesRes.data) setDbBadges(badgesRes.data);
      if (badgeSubcatsRes.data) setBadgeSubcategories(badgeSubcatsRes.data);
      if (destRes.data) setDbDestinations(destRes.data);
      if (poiRes.data) setDbPOIs(poiRes.data);
    };
    
    fetchTaxonomy();
  }, []);

/** Standalone sub-component to manage LiteAPI hotel mapping for a single business */
const LiteApiMappingField = ({ businessId }: { businessId: string }) => {
  const [hotelId, setHotelId] = useState("");
  const [currentMapping, setCurrentMapping] = useState<string | null>(null);
  const [loadingMapping, setLoadingMapping] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMapping = async () => {
      setLoadingMapping(true);
      const { data } = await supabase
        .from("hotel_api_mappings")
        .select("liteapi_hotel_id")
        .eq("business_id", businessId)
        .maybeSingle();
      if (data) {
        setCurrentMapping(data.liteapi_hotel_id);
        setHotelId(data.liteapi_hotel_id);
      }
      setLoadingMapping(false);
    };
    fetchMapping();
  }, [businessId]);

  const handleSave = async () => {
    setSaving(true);
    if (!hotelId.trim()) {
      if (currentMapping) {
        await supabase.from("hotel_api_mappings").delete().eq("business_id", businessId);
        setCurrentMapping(null);
      }
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("hotel_api_mappings").upsert(
      { liteapi_hotel_id: hotelId.trim(), business_id: businessId },
      { onConflict: "liteapi_hotel_id" }
    );
    if (error) {
      alert(error.message);
    } else {
      setCurrentMapping(hotelId.trim());
    }
    setSaving(false);
  };

  if (loadingMapping) return <p className="text-xs text-muted-foreground">Chargement...</p>;

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="ID hôtel LiteAPI (ex: lp3e599)"
        value={hotelId}
        onChange={(e) => setHotelId(e.target.value)}
        className="flex-1 text-sm font-mono"
      />
      <Button
        type="button"
        size="sm"
        variant={hotelId !== (currentMapping || "") ? "default" : "outline"}
        onClick={handleSave}
        disabled={saving || hotelId === (currentMapping || "")}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : currentMapping ? "Modifier" : "Associer"}
      </Button>
      {currentMapping && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive px-2"
          onClick={async () => {
            await supabase.from("hotel_api_mappings").delete().eq("business_id", businessId);
            setCurrentMapping(null);
            setHotelId("");
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};



  const updateIntentWord = async (id: string, updates: Partial<{ word: string; category_name: string; merge_on_conflict: boolean; is_active: boolean }>) => {
    const { error } = await supabase.from("search_intent_words").update(updates).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setIntentWords((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    toast({ title: "Mis à jour" });
  };

  const deleteIntentWord = async (id: string, word: string) => {
    if (!confirm(`Supprimer "${word}" ?`)) return;
    const { error } = await supabase.from("search_intent_words").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setIntentWords((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Supprimé", description: `"${word}" supprimé.` });
  };

  const [formData, setFormData] = useState({
    name: business?.name || "",
    description: business?.description || "",
    address: business?.address || "",
    city: business?.city || "",
    region: business?.region || "",
    country: business?.country || "Maroc",
    phone: business?.phone || "",
    email: business?.email || "",
    website: business?.website || "",
    main_category: business?.main_category || "",
    categories: business?.categories || [] as string[],
    services: business?.services || [] as string[],
    default_service: (business as any)?.default_service || "",
    business_type: (business as any)?.business_type || "",
    engagements: (business as any)?.engagements || [] as string[],
    keywords: business?.keywords?.join(", ") || "",
    latitude: business?.latitude?.toString() || "",
    longitude: business?.longitude?.toString() || "",
    wtuce_status: business?.wtuce_status || "pending",
    is_featured: business?.is_featured || false,
    is_active: business ? ((business as any)?.is_active ?? true) : false,
    priority_score: business?.priority_score?.toString() || "0",
    logo_url: business?.logo_url || "",
    _initialLogoUrl: business?.logo_url || "",
    
    ice: (business as any)?.ice || "",
    kp_regroupement: (business as any)?.kp_regroupement || "",
    kp_regroupement_2: (business as any)?.kp_regroupement_2 || "",
    kp_active: (business as any)?.kp_active ?? false,
    facebook_url: (business as any)?.facebook_url || "",
    instagram_url: (business as any)?.instagram_url || "",
    twitter_url: (business as any)?.twitter_url || "",
    linkedin_url: (business as any)?.linkedin_url || "",
    youtube_url: (business as any)?.youtube_url || "",
    tiktok_url: (business as any)?.tiktok_url || "",
    whatsapp: (business as any)?.whatsapp || "",
    telegram: (business as any)?.telegram || "",
    tripadvisor_url: (business as any)?.tripadvisor_url || "",
    booking_url: (business as any)?.booking_url || "",
    account_type: (business as any)?.account_type || "",
    zone_chalandise: (business as any)?.zone_chalandise || "locale",
    is_visible_locale: (business as any)?.is_visible_locale ?? true,
    presentation_mode: (business as any)?.presentation_mode || "reserver_en_ligne",
    languages: (business as any)?.languages || [],
    affiliate_id: (business as any)?.affiliate_id || "",
    internal_notes: (business as any)?.internal_notes || "",
    video_1_url: (business as any)?.video_1_url || "",
    matterport_url: (business as any)?.matterport_url || "",
    flipbook_url: (business as any)?.flipbook_url || "",
    flipbook_name: (business as any)?.flipbook_name || "",
    flipbook_language: (business as any)?.flipbook_language || "",
    google_maps_url: (business as any)?.google_maps_url || "",
    airbnb_url: (business as any)?.airbnb_url || "",
    pinterest_url: (business as any)?.pinterest_url || "",
    skype: (business as any)?.skype || "",
    vimeo_url: (business as any)?.vimeo_url || "",
    images: (business as any)?.images || [] as string[],
    _initialImages: (business as any)?.images || [] as string[], // track original images for cleanup
    pdf_url: (business as any)?.pdf_url || "",
    pdf_name: (business as any)?.pdf_name || "",
    pdf_2_url: (business as any)?.pdf_2_url || "",
    pdf_2_name: (business as any)?.pdf_2_name || "",
    pdf_3_url: (business as any)?.pdf_3_url || "",
    pdf_3_name: (business as any)?.pdf_3_name || "",
    online_shop_url: (business as any)?.online_shop_url || "",
    opening_hours: (business as any)?.opening_hours as OpeningHours | null,
    rating: (business as any)?.rating?.toString() || "",
    reserve_now_url: (business as any)?.reserve_now_url || "",
    show_opening_hours: (business as any)?.show_opening_hours ?? false,
    show_videos: (business as any)?.show_videos ?? false,
    default_sound_on: (business as any)?.default_sound_on ?? true,
    prioritize_images: (business as any)?.prioritize_images ?? false,
    is_open_24h: (business as any)?.is_open_24h ?? false,
    vacation_dates: ((business as any)?.vacation_dates || []) as VacationPeriod[],
    hotels_com_url: (business as any)?.hotels_com_url || "",
    trivago_url: (business as any)?.trivago_url || "",
    getyourguide_url: (business as any)?.getyourguide_url || "",
    getyourguide_rating: (business as any)?.getyourguide_rating ?? "",
    getyourguide_review_count: (business as any)?.getyourguide_review_count ?? "",
    viator_url: (business as any)?.viator_url || "",
    viator_rating: (business as any)?.viator_rating ?? "",
    viator_review_count: (business as any)?.viator_review_count ?? "",
    avis_verifies_url: (business as any)?.avis_verifies_url || "",
    avis_verifies_rating: (business as any)?.avis_verifies_rating ?? "",
    avis_verifies_review_count: (business as any)?.avis_verifies_review_count ?? "",
    trustpilot_url: (business as any)?.trustpilot_url || "",
    trustpilot_rating: (business as any)?.trustpilot_rating ?? "",
    trustpilot_review_count: (business as any)?.trustpilot_review_count ?? "",
    kayak_url: (business as any)?.kayak_url || "",
    kayak_rating: (business as any)?.kayak_rating ?? "",
    kayak_review_count: (business as any)?.kayak_review_count ?? "",
    tourradar_url: (business as any)?.tourradar_url || "",
    tourradar_rating: (business as any)?.tourradar_rating ?? "",
    tourradar_review_count: (business as any)?.tourradar_review_count ?? "",
    tripadvisor_review_url: (business as any)?.tripadvisor_review_url || "",
    tripadvisor_rating: (business as any)?.tripadvisor_rating ?? "",
    tripadvisor_review_count: (business as any)?.tripadvisor_review_count ?? "",
    restaurant_guru_url: (business as any)?.restaurant_guru_url || "",
    restaurant_guru_rating: (business as any)?.restaurant_guru_rating ?? "",
    restaurant_guru_review_count: (business as any)?.restaurant_guru_review_count ?? "",
    google_reviews_url: (business as any)?.google_reviews_url || "",
    google_rating: (business as any)?.google_rating ?? "",
    google_review_count: (business as any)?.google_review_count ?? "",
    other_booking_url: (business as any)?.other_booking_url || "",
    other_booking_name: (business as any)?.other_booking_name || "",
    glovo_url: (business as any)?.glovo_url || "",
    gamme_id: (business as any)?.gamme_id || "",
    badge_id: (business as any)?.badge_id || "",
    neighborhood: (business as any)?.neighborhood || "",
    hook_fr: (business as any)?.hook_fr || "",
    hook_en: (business as any)?.hook_en || "",
    hook_ar: (business as any)?.hook_ar || "",
    menu_url: (business as any)?.menu_url || "",
    menu_name: (business as any)?.menu_name || "",
    menu_language: (business as any)?.menu_language || "",
    
    logo_bg: (business as any)?.logo_bg || "transparent",
    zone_city_ids: (business as any)?.zone_city_ids || [] as string[],
    
    destination_hook: (business as any)?.destination_hook || "",
    destination_description: (business as any)?.destination_description || "",
    poi_hook: (business as any)?.poi_hook || "",
    poi_description: (business as any)?.poi_description || "",
    is_poi: (business as any)?.is_poi ?? false,
    website_force_external: (business as any)?.website_force_external ?? false,
    reserve_now_force_external: (business as any)?.reserve_now_force_external ?? false,
    online_shop_force_external: (business as any)?.online_shop_force_external ?? false,
    youtube_force_external: (business as any)?.youtube_force_external ?? false,
    website_presentation_mode: (business as any)?.website_presentation_mode || "plus_informations",
    online_shop_presentation_mode: (business as any)?.online_shop_presentation_mode || "acheter_en_ligne",
    carousel_badge: (business as any)?.carousel_badge || "",
  });

  // --- Business documents (menus, flipbooks, external links & videos) ---
  type DocEntry = { id?: string; _uid: string; url: string; name: string; language: string; icon: string };
  const [menuDocs, setMenuDocs] = useState<DocEntry[]>([]);
  const [flipbookDocs, setFlipbookDocs] = useState<DocEntry[]>([]);
  type ExternalLinkEntry = { id?: string; _uid: string; url: string; name: string; language: string; image_url: string; description: string };
  const [externalLinkDocs, setExternalLinkDocs] = useState<ExternalLinkEntry[]>([]);
  const [videoDocs, setVideoDocs] = useState<VideoDocEntry[]>([]);
  const [videoDescDialogIdx, setVideoDescDialogIdx] = useState<number | null>(null);
  const [videoDeleteConfirmIdx, setVideoDeleteConfirmIdx] = useState<number | null>(null);

  // --- Menu summaries (multiple per business) ---
  type MenuSummaryEntry = { id?: string; title: string; content: string; avg_price_range: any; price_details: string };
  const [menuSummaries, setMenuSummaries] = useState<MenuSummaryEntry[]>([]);

  useEffect(() => {
    if (!business?.id) return;
    const fetchDocs = async () => {
      const { data } = await supabase
        .from("business_documents" as any)
        .select("*")
        .eq("business_id", business.id)
        .order("sort_order");
      if (data) {
        setMenuDocs((data as any[]).filter((d: any) => d.type === "menu").map((d: any) => ({ id: d.id, _uid: d.id || crypto.randomUUID(), url: d.url, name: d.name || "", language: d.language || "", icon: d.icon || "" })));
        setFlipbookDocs((data as any[]).filter((d: any) => d.type === "flipbook").map((d: any) => ({ id: d.id, _uid: d.id || crypto.randomUUID(), url: d.url, name: d.name || "", language: d.language || "", icon: d.icon || "" })));
        setExternalLinkDocs((data as any[]).filter((d: any) => d.type === "external_link").map((d: any) => ({ id: d.id, _uid: d.id || crypto.randomUUID(), url: d.url, name: d.name || "", language: d.language || "", image_url: d.icon || "", description: d.description || "presse" })));
        setVideoDocs((data as any[]).filter((d: any) => d.type === "video").map((d: any) => ({ id: d.id, url: d.url, name: d.name || "", poi_id: d.poi_id || null, destination_id: d.destination_id || null, linked_business_id: d.linked_business_id || null, subcategory_id: d.subcategory_id || null, city: d.city || null, neighborhood: d.neighborhood || null, description: d.description || null, price: d.price || null, price_type: d.price_type || null, thumbnail_url: d.thumbnail_url || null })));
      }
    };
    const fetchSummaries = async () => {
      const { data } = await supabase
        .from("business_menu_summaries" as any)
        .select("*")
        .eq("business_id", business.id)
        .order("sort_order");
      if (data) {
        setMenuSummaries((data as any[]).map((d: any) => ({
          id: d.id,
          title: d.title || "",
          content: d.content || "",
          avg_price_range: d.avg_price_range || null,
          price_details: d.price_details || "",
        })));
      }
    };
    fetchDocs();
    fetchSummaries();
  }, [business?.id]);

  const DOC_ICON_OPTIONS = [
    { key: "", label: "⊘ Aucune", file: "" },
    { key: "icon_menu", label: "🍽️ Menu", file: "icon_menu.png" },
    { key: "icon_wine", label: "🍷 Vins", file: "icon_wine.png" },
    { key: "icon_cocktails", label: "🍸 Cocktails", file: "icon_cocktails.avif" },
    { key: "icon_cocktails2", label: "🍹 Cocktails 2", file: "icon_cocktails2.png" },
  ];
  const getDocIconSrc = (icon: string | null) => {
    if (!icon) return "";
    const found = DOC_ICON_OPTIONS.find(o => o.key === icon);
    return `/images/doc-icons/${found?.file || "icon_menu.png"}`;
  };

  const LANGUAGE_OPTIONS = [
    { code: "ar", label: "🇲🇦 AR" },
    { code: "ar-std", label: "ض AR" },
    { code: "fr", label: "🇫🇷 FR" },
    { code: "en", label: "🇬🇧 EN" },
    { code: "es", label: "🇪🇸 ES" },
    { code: "de", label: "🇩🇪 DE" },
    { code: "it", label: "🇮🇹 IT" },
    { code: "pt", label: "🇵🇹 PT" },
    { code: "nl", label: "🇳🇱 NL" },
    { code: "zh", label: "🇨🇳 ZH" },
    { code: "ja", label: "🇯🇵 JA" },
    { code: "ru", label: "🇷🇺 RU" },
  ];

  // Fetch intent words filtered by business main_category
  useEffect(() => {
    const fetchIntents = async () => {
      setIntentsLoading(true);
      const mainCat = formData.main_category;
      if (!mainCat) {
        setIntentWords([]);
        setIntentsLoading(false);
        return;
      }
      const { data } = await supabase
        .from("search_intent_words")
        .select("*")
        .eq("category_name", mainCat)
        .order("word");
      if (data) setIntentWords(data as any[]);
      setIntentsLoading(false);
    };
    fetchIntents();
  }, [formData.main_category]);

  const addIntentWord = async () => {
    const word = newIntentWord.trim().toLowerCase();
    if (!word) return;
    const categoryToUse = formData.main_category;
    if (!categoryToUse) return;
    if (intentWords.some((i) => i.word === word)) {
      toast({ title: "Erreur", description: `"${word}" existe déjà.`, variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("search_intent_words")
      .insert({ word, category_name: categoryToUse, merge_on_conflict: true, is_active: true })
      .select()
      .single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setIntentWords((prev) => [...prev, data as any]);
    setNewIntentWord("");
    toast({ title: "Ajouté", description: `"${word}" → ${categoryToUse}` });
  };

  
  const extractCustomOptionsFromEngagements = (engagements: string[]) => ({
    certifications: engagements
      .filter((entry) => entry.startsWith("Certification:"))
      .map((entry) => entry.replace("Certification:", "")),
    engagements: engagements.filter(
      (entry) =>
        !entry.startsWith("Certification:") &&
        !entry.startsWith("Logistique:") &&
        !entry.startsWith("Marché:")
    ),
    commodites: engagements
      .filter((entry) => entry.startsWith("Logistique:"))
      .map((entry) => entry.replace("Logistique:", "")),
  });

  const normalizeGlobalCustomOptions = (content: string | null) => {
    if (!content) {
      return { certifications: [], engagements: [], commodites: [] };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        certifications: Array.isArray(parsed?.certifications) ? parsed.certifications.filter((v: unknown) => typeof v === "string" && v.trim()) : [],
        engagements: Array.isArray(parsed?.engagements) ? parsed.engagements.filter((v: unknown) => typeof v === "string" && v.trim()) : [],
        commodites: Array.isArray(parsed?.commodites) ? parsed.commodites.filter((v: unknown) => typeof v === "string" && v.trim()) : [],
      };
    } catch {
      return { certifications: [], engagements: [], commodites: [] };
    }
  };

  useEffect(() => {
    const loadGlobalCustomOptions = async () => {
      const { data } = await supabase
        .from("staff_notes")
        .select("content")
        .eq("key", "engagement_custom_options_v1")
        .maybeSingle();

      setGlobalCustomOptions(normalizeGlobalCustomOptions(data?.content ?? null));
    };

    loadGlobalCustomOptions();
  }, []);

  const persistGlobalCustomOption = async (type: "certification" | "engagement" | "commodite", value: string) => {
    const option = value.trim();
    if (!option) return;

    const nextOptions = {
      certifications:
        type === "certification"
          ? Array.from(new Set([...globalCustomOptions.certifications, option]))
          : globalCustomOptions.certifications,
      engagements:
        type === "engagement"
          ? Array.from(new Set([...globalCustomOptions.engagements, option]))
          : globalCustomOptions.engagements,
      commodites:
        type === "commodite"
          ? Array.from(new Set([...globalCustomOptions.commodites, option]))
          : globalCustomOptions.commodites,
    };

    const didChange =
      nextOptions.certifications.length !== globalCustomOptions.certifications.length ||
      nextOptions.engagements.length !== globalCustomOptions.engagements.length ||
      nextOptions.commodites.length !== globalCustomOptions.commodites.length;

    if (!didChange) return;

    setGlobalCustomOptions(nextOptions);

    const content = JSON.stringify(nextOptions);
    const { data: existing } = await supabase
      .from("staff_notes")
      .select("id")
      .eq("key", "engagement_custom_options_v1")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("staff_notes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("key", "engagement_custom_options_v1");
    } else {
      await supabase
        .from("staff_notes")
        .insert({ key: "engagement_custom_options_v1", content });
    }
  };

  // Capture initial engagements once so unchecking doesn't remove items from the list
  const [initialEngagements, setInitialEngagements] = useState<string[]>([]);
  useEffect(() => {
    const engs = ((formData as any).engagements || []) as string[];
    if (engs.length > 0 && initialEngagements.length === 0) {
      setInitialEngagements([...engs]);
    }
  }, [(formData as any).engagements]);

  const currentBusinessCustomOptions = useMemo(
    () => {
      const current = ((formData as any).engagements || []) as string[];
      const merged = [...new Set([...current, ...initialEngagements])];
      return extractCustomOptionsFromEngagements(merged);
    },
    [(formData as any).engagements, initialEngagements]
  );

  // Merge global + current business + newly added custom items
  const allCustomCerts = [...new Set([...globalCustomOptions.certifications, ...currentBusinessCustomOptions.certifications, ...customCerts])].sort((a, b) => a.localeCompare(b, "fr"));
  const allCustomEngs = [...new Set([...globalCustomOptions.engagements, ...currentBusinessCustomOptions.engagements, ...customEngs])].sort((a, b) => a.localeCompare(b, "fr"));
  const allCustomCommodites = [...new Set([...globalCustomOptions.commodites, ...currentBusinessCustomOptions.commodites, ...customCommodites])].sort((a, b) => a.localeCompare(b, "fr"));

  // Business labels state (managed separately)
  const [businessLabels, setBusinessLabels] = useState<Array<{ id?: string; label_id: string; custom_url: string }>>([]);

  // Load existing destination & POI associations
  useEffect(() => {
    if (!business?.id) return;
    const loadAssociations = async () => {
      const [destRes, poiRes, badgeRes, poiBizRes] = await Promise.all([
        supabase.from("business_destinations" as any).select("destination_id").eq("business_id", business.id),
        supabase.from("business_points_of_interest" as any).select("point_of_interest_id").eq("business_id", business.id),
        supabase.from("business_badges" as any).select("badge_id, is_default").eq("business_id", business.id),
        supabase.from("business_poi_businesses" as any).select("poi_business_id").eq("business_id", business.id),
      ]);
      if (destRes.data) setSelectedDestinationIds((destRes.data as any[]).map((d: any) => d.destination_id));
      if (poiRes.data) setSelectedPOIIds((poiRes.data as any[]).map((p: any) => p.point_of_interest_id));
      if (poiBizRes.data) setSelectedPoiBusinessIds((poiBizRes.data as any[]).map((p: any) => p.poi_business_id));
      if (badgeRes.data) {
        setSelectedBadgeIds((badgeRes.data as any[]).map((b: any) => b.badge_id));
        const defaultB = (badgeRes.data as any[]).find((b: any) => b.is_default);
        if (defaultB) setDefaultBadgeId(defaultB.badge_id);
      }
    };
    loadAssociations();
  }, [business?.id]);

  // Fetch businesses with is_poi=true in the same city
  useEffect(() => {
    if (!formData.city) { setPoiBusinessesForCity([]); return; }
    const fetchPoiBusinesses = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, neighborhood")
        .eq("city", formData.city)
        .eq("is_poi", true)
        .eq("is_active", true)
        .order("name");
      setPoiBusinessesForCity((data || []).filter(b => b.id !== business?.id).map(b => ({ id: b.id, name: b.name, neighborhood: b.neighborhood || null })));
    };
    fetchPoiBusinesses();
  }, [formData.city, business?.id]);

  // Fetch all businesses for video linking
  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setAllBusinessesForVideo((data || []).filter(b => b.id !== business?.id));
    };
    fetchAll();
  }, [business?.id]);

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const computeReviewsFromForm = (fd: any) => {
    const sources = collectRatingSources({
      google_rating: toNullableNumber(fd.google_rating),
      google_review_count: toNullableNumber(fd.google_review_count),
      tripadvisor_rating: toNullableNumber(fd.tripadvisor_rating),
      tripadvisor_review_count: toNullableNumber(fd.tripadvisor_review_count),
      restaurant_guru_rating: toNullableNumber(fd.restaurant_guru_rating),
      restaurant_guru_review_count: toNullableNumber(fd.restaurant_guru_review_count),
      getyourguide_rating: toNullableNumber(fd.getyourguide_rating),
      getyourguide_review_count: toNullableNumber(fd.getyourguide_review_count),
      viator_rating: toNullableNumber(fd.viator_rating),
      viator_review_count: toNullableNumber(fd.viator_review_count),
      avis_verifies_rating: toNullableNumber(fd.avis_verifies_rating),
      avis_verifies_review_count: toNullableNumber(fd.avis_verifies_review_count),
      trustpilot_rating: toNullableNumber(fd.trustpilot_rating),
      trustpilot_review_count: toNullableNumber(fd.trustpilot_review_count),
      kayak_rating: toNullableNumber(fd.kayak_rating),
      kayak_review_count: toNullableNumber(fd.kayak_review_count),
      tourradar_rating: toNullableNumber(fd.tourradar_rating),
      tourradar_review_count: toNullableNumber(fd.tourradar_review_count),
    });

    const avg = computeWeightedRatingOn20(sources);
    const total = getTotalReviewCount({
      google_review_count: toNullableNumber(fd.google_review_count),
      tripadvisor_review_count: toNullableNumber(fd.tripadvisor_review_count),
      restaurant_guru_review_count: toNullableNumber(fd.restaurant_guru_review_count),
      getyourguide_review_count: toNullableNumber(fd.getyourguide_review_count),
      viator_review_count: toNullableNumber(fd.viator_review_count),
      avis_verifies_review_count: toNullableNumber(fd.avis_verifies_review_count),
      trustpilot_review_count: toNullableNumber(fd.trustpilot_review_count),
      kayak_review_count: toNullableNumber(fd.kayak_review_count),
      tourradar_review_count: toNullableNumber(fd.tourradar_review_count),
    });

    return { avg, total };
  };

  const reviewFetchFieldKeys = [
    "google_rating",
    "google_review_count",
    "tripadvisor_rating",
    "tripadvisor_review_count",
    "restaurant_guru_rating",
    "restaurant_guru_review_count",
    "getyourguide_rating",
    "getyourguide_review_count",
    "viator_rating",
    "viator_review_count",
    "avis_verifies_rating",
    "avis_verifies_review_count",
    "trustpilot_rating",
    "trustpilot_review_count",
    "kayak_rating",
    "kayak_review_count",
    "tourradar_rating",
    "tourradar_review_count",
  ] as const;

  const applyFetchedReviewsToForm = (fd: any, fetched: Record<string, unknown>) => {
    const next = { ...fd };
    for (const key of reviewFetchFieldKeys) {
      const raw = fetched[key];
      if (raw === null || raw === undefined) continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        next[key] = String(parsed);
      }
    }
    return next;
  };

  const handleFetchReviewsAndSaveCalculation = async () => {
    if (!business?.id) {
      toast({ title: "Enregistre d'abord l'établissement", variant: "destructive" });
      return;
    }

    setIsReviewCalcLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-reviews", {
        body: { business_id: business.id },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Impossible de récupérer les avis");

      const mergedFormData = applyFetchedReviewsToForm(formData as any, (data.data || {}) as Record<string, unknown>);
      const { avg, total } = computeReviewsFromForm(mergedFormData);

      setFormData((prev) => ({
        ...prev,
        ...mergedFormData,
        computed_rating: avg !== null ? String(avg) : "",
        total_review_count: String(total),
      }));
      setIsDirty(true);

      const { error: saveError } = await supabase
        .from("businesses")
        .update({
          computed_rating: avg,
          total_review_count: total,
        })
        .eq("id", business.id);

      if (saveError) throw saveError;

      toast({
        title: "Avis récupérés",
        description: avg !== null
          ? `Calcul sauvegardé : ${avg}/20 (${total} avis)`
          : `Aucune note récupérée (${total} avis)`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur récupération avis", description: message, variant: "destructive" });
    } finally {
      setIsReviewCalcLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => {
      const currentCategories = prev.categories;
      if (currentCategories.includes(category)) {
        return { ...prev, categories: currentCategories.filter((c) => c !== category) };
      } else {
        return { ...prev, categories: [...currentCategories, category] };
      }
    });
  };

  const handleServiceToggle = (service: string) => {
    setFormData((prev) => {
      const currentServices = prev.services;
      if (currentServices.includes(service)) {
        const newServices = currentServices.filter((s) => s !== service);
        return { 
          ...prev, 
          services: newServices,
          default_service: prev.default_service === service ? "" : prev.default_service
        };
      } else {
        return { ...prev, services: [...currentServices, service] };
      }
    });
  };

  const handleCreateService = async (subcategoryId: string) => {
    const name = newServiceName.trim();
    if (!name) return;
    // Check if service already exists for this subcategory
    const exists = dbServices.some(s => s.subcategory_id === subcategoryId && s.name_fr.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast({ variant: "destructive", title: "Existe déjà", description: `Le service "${name}" existe déjà pour cette sous-catégorie.` });
      return;
    }
    setCreatingService(true);
    const { data, error } = await supabase.from("services").insert({ name_fr: name, subcategory_id: subcategoryId }).select("id, name_fr, subcategory_id").single();
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer le service." });
    } else if (data) {
      setDbServices(prev => [...prev, data]);
      setNewServiceName("");
      toast({ title: "Créé", description: `Service "${name}" ajouté.` });
    }
    setCreatingService(false);
  };


  const selectedCategory = useMemo(() => 
    dbCategories.find(c => c.name_fr === formData.main_category),
    [dbCategories, formData.main_category]
  );
  
  // Get subcategories for selected category from database (sorted alphabetically)
  const availableSubcategories = useMemo(() => 
    selectedCategory
      ? dbSubcategories
          .filter(sub => sub.category_id === selectedCategory.id)
          .map(sub => sub.name_fr)
          .sort((a, b) => a.localeCompare(b, 'fr'))
      : [],
    [selectedCategory, dbSubcategories]
  );

  // Get services for ALL selected subcategories from database (sorted alphabetically)
  // This includes subcategories from any category, not just the current main category
  const selectedSubcategoryIds = useMemo(() => 
    dbSubcategories
      .filter(sub => formData.categories.includes(sub.name_fr))
      .map(sub => sub.id),
    [dbSubcategories, formData.categories]
  );
  
  const availableServices = useMemo(() => 
    selectedSubcategoryIds.length > 0
      ? dbServices
          .filter(srv => selectedSubcategoryIds.includes(srv.subcategory_id))
          .map(srv => srv.name_fr)
          .sort((a, b) => a.localeCompare(b, 'fr'))
      : [],
    [dbServices, selectedSubcategoryIds]
  );

  // Group services by subcategory for tabbed display
  const servicesGroupedBySubcategory = useMemo(() => {
    if (selectedSubcategoryIds.length === 0) return [];
    const selectedSubs = dbSubcategories.filter(sub => selectedSubcategoryIds.includes(sub.id));
    // Group by subcategory name, merging services from all subcategories with the same name
    const groupMap = new Map<string, { subcategoryId: string; subcategoryName: string; serviceNames: Set<string> }>();
    for (const sub of selectedSubs) {
      const existing = groupMap.get(sub.name_fr);
      const svcNames = dbServices
        .filter(srv => srv.subcategory_id === sub.id)
        .map(srv => srv.name_fr);
      if (existing) {
        for (const name of svcNames) existing.serviceNames.add(name);
      } else {
        groupMap.set(sub.name_fr, {
          subcategoryId: sub.id,
          subcategoryName: sub.name_fr,
          serviceNames: new Set(svcNames),
        });
      }
    }
    return [...groupMap.values()].map(g => ({
      subcategoryId: g.subcategoryId,
      subcategoryName: g.subcategoryName,
      services: [...g.serviceNames].sort((a, b) => a.localeCompare(b, 'fr')),
    }));
  }, [dbSubcategories, dbServices, selectedSubcategoryIds]);

  // Get gammes available for the selected main category
  const availableGammes = useMemo(() => {
    if (!selectedCategory) return [];
    const gammeIdsForCategory = gammeCategories
      .filter((gc) => gc.category_id === selectedCategory.id)
      .map((gc) => gc.gamme_id);
    return dbGammes
      .filter((g) => gammeIdsForCategory.includes(g.id))
      .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }, [selectedCategory, gammeCategories, dbGammes]);

  // Get all available badges
  const availableBadges = useMemo(() => {
    return dbBadges.sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }, [dbBadges]);

  // Get neighborhoods for the selected city
  const neighborhoodsForCity = useMemo(() => {
    if (!formData.city) return [];
    const selectedCity = dbCities.find(c => c.name_fr === formData.city);
    if (!selectedCity) return [];
    return dbNeighborhoods.filter(n => n.city_id === selectedCity.id);
  }, [formData.city, dbCities, dbNeighborhoods]);

  // Get all destinations (not filtered by region/city)
  const allDestinations = useMemo(() => {
    return dbDestinations.sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }, [dbDestinations]);

  // Get POIs filtered by region (via city) and city
  const poisForCity = useMemo(() => {
    if (!formData.city && !formData.region) return [];
    const selectedCity = formData.city ? dbCities.find(c => c.name_fr === formData.city) : null;
    if (selectedCity) {
      return dbPOIs.filter(p => p.city_id === selectedCity.id);
    }
    // If only region, show POIs from all cities in that region
    const cityIdsInRegion = dbCities.filter(c => c.region === formData.region).map(c => c.id);
    return dbPOIs.filter(p => cityIdsInRegion.includes(p.city_id));
  }, [formData.city, formData.region, dbCities, dbPOIs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[BusinessForm] handleSubmit called");

    // Auto-clear orphan default_service before saving
    const cleanDefaultService = formData.default_service && !formData.services.includes(formData.default_service)
      ? "" : formData.default_service;

    // Hard limit: max 30 images
    if (formData.images && formData.images.length > 30) {
      toast({
        variant: "destructive",
        title: "Trop d'images",
        description: `Maximum 30 images autorisées. Vous en avez ${formData.images.length}. Veuillez en supprimer avant de sauvegarder.`,
      });
      return;
    }

    // Region is required if a city is selected
    if (formData.city && !formData.region) {
      toast({
        variant: "destructive",
        title: "Région obligatoire",
        description: "Veuillez sélectionner une région lorsqu'une ville est choisie.",
      });
      return;
    }

    // External links: title is required when a row is filled
    const hasInvalidExternalLink = externalLinkDocs.some((d) => {
      const hasAnyValue = !!(d.name.trim() || d.url.trim() || d.image_url.trim() || d.language.trim());
      return hasAnyValue && !d.name.trim();
    });

    if (hasInvalidExternalLink) {
      toast({
        variant: "destructive",
        title: "Liens Externes incomplets",
        description: "Le Titre est obligatoire pour chaque lien externe.",
      });
      return;
    }

    setLoading(true);

    // Force token refresh to avoid RLS failures on expired JWT
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError || !sessionData.session) {
      toast({
        variant: "destructive",
        title: "Session expirée",
        description: "Votre session a expiré. Veuillez vous reconnecter.",
      });
      setLoading(false);
      return;
    }

    const businessData = {
      name: formData.name,
      description: formData.description || null,
      address: formData.address || null,
      city: formData.city || null,
      region: formData.region || null,
      country: formData.country,
      phone: formData.phone || null,
      email: formData.email || null,
      website: formData.website || null,
      main_category: formData.main_category || null,
      categories: formData.categories.length > 0 ? formData.categories : [],
      services: formData.services.length > 0 ? formData.services : [],
      default_service: cleanDefaultService || null,
      business_type: formData.business_type || null,
      engagements: (formData as any).engagements?.length > 0 ? (formData as any).engagements : [],
      keywords: formData.keywords ? formData.keywords.split(",").map((k) => k.trim()) : [],
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      wtuce_status: formData.wtuce_status as "verified" | "pending",
      is_featured: formData.is_featured,
      is_active: formData.is_active,
      priority_score: parseInt(formData.priority_score) || 0,
      logo_url: formData.logo_url || null,
      
      ice: formData.ice || null,
      kp_regroupement: formData.kp_regroupement || null,
      kp_regroupement_2: formData.kp_regroupement_2 || null,
      kp_active: formData.kp_active,
      facebook_url: formData.facebook_url || null,
      instagram_url: formData.instagram_url || null,
      twitter_url: formData.twitter_url || null,
      linkedin_url: formData.linkedin_url || null,
      youtube_url: formData.youtube_url || null,
      tiktok_url: formData.tiktok_url || null,
      whatsapp: formData.whatsapp || null,
      telegram: (formData as any).telegram || null,
      tripadvisor_url: formData.tripadvisor_url || null,
      booking_url: formData.booking_url || null,
      account_type: formData.account_type || null,
      zone_chalandise: (formData as any).zone_chalandise || null,
      is_visible_locale: (formData as any).is_visible_locale ?? false,
      presentation_mode: (formData as any).presentation_mode || "reserver_en_ligne",
      zone_city_ids: (formData as any).zone_chalandise === "nationale" && (formData as any).zone_city_ids?.length > 0 ? (formData as any).zone_city_ids : [],
      languages: (formData as any).languages?.length > 0 ? (formData as any).languages : [],
      affiliate_id: (formData as any).affiliate_id || null,
      internal_notes: formData.internal_notes ? formData.internal_notes.slice(0, 5000) : null,
      video_1_url: formData.video_1_url || null,
      matterport_url: formData.matterport_url || null,
      flipbook_url: (formData as any).flipbook_url || null,
      flipbook_name: (formData as any).flipbook_name || null,
      flipbook_language: (formData as any).flipbook_language || null,
      google_maps_url: formData.google_maps_url || null,
      airbnb_url: formData.airbnb_url || null,
      pinterest_url: formData.pinterest_url || null,
      skype: formData.skype || null,
      vimeo_url: formData.vimeo_url || null,
      images: formData.images.length > 0 ? formData.images : [],
      pdf_url: formData.pdf_url || null,
      pdf_name: (formData as any).pdf_name?.slice(0, 100) || null,
      pdf_2_url: (formData as any).pdf_2_url || null,
      pdf_2_name: (formData as any).pdf_2_name?.slice(0, 100) || null,
      pdf_3_url: (formData as any).pdf_3_url || null,
      pdf_3_name: (formData as any).pdf_3_name?.slice(0, 100) || null,
      online_shop_url: formData.online_shop_url || null,
      opening_hours: formData.opening_hours ? JSON.parse(JSON.stringify(formData.opening_hours)) : null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      reserve_now_url: formData.reserve_now_url || null,
      show_opening_hours: formData.show_opening_hours,
      show_videos: formData.show_videos,
      default_sound_on: formData.default_sound_on,
      prioritize_images: formData.prioritize_images,
      is_open_24h: formData.is_open_24h,
      vacation_dates: formData.vacation_dates.length > 0 ? JSON.parse(JSON.stringify(formData.vacation_dates)) : [],
      hotels_com_url: formData.hotels_com_url || null,
      trivago_url: formData.trivago_url || null,
      getyourguide_url: (formData as any).getyourguide_url || null,
      getyourguide_rating: (formData as any).getyourguide_rating !== "" ? parseFloat((formData as any).getyourguide_rating) : null,
      getyourguide_review_count: (formData as any).getyourguide_review_count !== "" ? parseInt((formData as any).getyourguide_review_count) : null,
      viator_url: (formData as any).viator_url || null,
      viator_rating: (formData as any).viator_rating !== "" ? parseFloat((formData as any).viator_rating) : null,
      viator_review_count: (formData as any).viator_review_count !== "" ? parseInt((formData as any).viator_review_count) : null,
      tourradar_url: (formData as any).tourradar_url || null,
      tourradar_rating: (formData as any).tourradar_rating !== "" ? parseFloat((formData as any).tourradar_rating) : null,
      tourradar_review_count: (formData as any).tourradar_review_count !== "" ? parseInt((formData as any).tourradar_review_count) : null,
      tripadvisor_review_url: (formData as any).tripadvisor_review_url || null,
      tripadvisor_rating: (formData as any).tripadvisor_rating !== "" ? parseFloat((formData as any).tripadvisor_rating) : null,
      tripadvisor_review_count: (formData as any).tripadvisor_review_count !== "" ? parseInt((formData as any).tripadvisor_review_count) : null,
      restaurant_guru_url: (formData as any).restaurant_guru_url || null,
      restaurant_guru_rating: (formData as any).restaurant_guru_rating !== "" ? parseFloat((formData as any).restaurant_guru_rating) : null,
      restaurant_guru_review_count: (formData as any).restaurant_guru_review_count !== "" ? parseInt((formData as any).restaurant_guru_review_count) : null,
      google_reviews_url: (formData as any).google_reviews_url || null,
      google_rating: (formData as any).google_rating !== "" ? parseFloat((formData as any).google_rating) : null,
      google_review_count: (formData as any).google_review_count !== "" ? parseInt((formData as any).google_review_count) : null,
      avis_verifies_url: (formData as any).avis_verifies_url || null,
      avis_verifies_rating: (formData as any).avis_verifies_rating !== "" ? parseFloat((formData as any).avis_verifies_rating) : null,
      avis_verifies_review_count: (formData as any).avis_verifies_review_count !== "" ? parseInt((formData as any).avis_verifies_review_count) : null,
      trustpilot_url: (formData as any).trustpilot_url || null,
      trustpilot_rating: (formData as any).trustpilot_rating !== "" ? parseFloat((formData as any).trustpilot_rating) : null,
      trustpilot_review_count: (formData as any).trustpilot_review_count !== "" ? parseInt((formData as any).trustpilot_review_count) : null,
      kayak_url: (formData as any).kayak_url || null,
      kayak_rating: (formData as any).kayak_rating !== "" ? parseFloat((formData as any).kayak_rating) : null,
      kayak_review_count: (formData as any).kayak_review_count !== "" ? parseInt((formData as any).kayak_review_count) : null,
      other_booking_url: formData.other_booking_url || null,
      other_booking_name: formData.other_booking_name || null,
      glovo_url: (formData as any).glovo_url || null,
      gamme_id: formData.gamme_id || null,
      badge_id: defaultBadgeId || null,
      neighborhood: formData.neighborhood || null,
      hook_fr: formData.hook_fr || null,
      hook_en: formData.hook_en || null,
      hook_ar: formData.hook_ar || null,
      menu_url: formData.menu_url || null,
      menu_name: (formData as any).menu_name || null,
      menu_language: (formData as any).menu_language || null,
      
      logo_bg: (formData as any).logo_bg || "transparent",
      
      destination_hook: (formData as any).destination_hook?.trim().slice(0, 120) || null,
      destination_description: (formData as any).destination_description?.trim() || null,
      poi_hook: (formData as any).poi_hook?.trim().slice(0, 120) || null,
      poi_description: (formData as any).poi_description?.trim() || null,
      is_poi: (formData as any).is_poi ?? false,
      website_force_external: (formData as any).website_force_external ?? false,
      reserve_now_force_external: (formData as any).reserve_now_force_external ?? false,
      online_shop_force_external: (formData as any).online_shop_force_external ?? false,
      youtube_force_external: (formData as any).youtube_force_external ?? false,
      website_presentation_mode: (formData as any).website_presentation_mode || "plus_informations",
      online_shop_presentation_mode: (formData as any).online_shop_presentation_mode || "acheter_en_ligne",
      computed_rating: (formData as any).computed_rating !== "" && (formData as any).computed_rating != null ? parseFloat((formData as any).computed_rating) : null,
      total_review_count: (formData as any).total_review_count !== "" && (formData as any).total_review_count != null ? parseInt((formData as any).total_review_count) : null,
      carousel_badge: (formData as any).carousel_badge || null,
    };

    try {
      let businessId = business?.id;
      
      if (business) {
        // If this is a duplicated record (temp slug), force slug regeneration
        const updatePayload = business.slug?.startsWith("temp-")
          ? { ...businessData, slug: null }
          : businessData;
        
        // Update
        const { error } = await supabase
          .from("businesses")
          .update(updatePayload)
          .eq("id", business.id);

        if (error) throw error;
      } else {
        // Create
        const { data: newBusiness, error } = await supabase
          .from("businesses")
          .insert(businessData as any)
          .select("id")
          .single();

        if (error) throw error;
        businessId = newBusiness?.id;
      }

      // Save business labels
      if (businessId) {
        // Delete existing labels
        await supabase
          .from("business_labels" as any)
          .delete()
          .eq("business_id", businessId);
        
        // Insert new labels
        if (businessLabels.length > 0) {
          const labelsToInsert = businessLabels.map((bl, index) => ({
            business_id: businessId,
            label_id: bl.label_id,
            custom_url: bl.custom_url || null,
            sort_order: index,
          }));
          
          const { error: labelsError } = await supabase
            .from("business_labels" as any)
            .insert(labelsToInsert);
          
          if (labelsError) {
            console.error("Error saving labels:", labelsError);
          }
        }
      }

      // Save business documents (menus, flipbooks & external links)
      if (businessId) {
        // Generate thumbnails for videos that don't have one yet
        const isNonEmbedVideo = (url: string) => !url.match(/youtube\.com|youtu\.be|vimeo\.com/i);
        const getYouTubeId = (url: string): string | null => {
          const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
          return m ? m[1] : null;
        };
        const normalizedVideoDocs = videoDocs
          .map((d) => ({
            ...d,
            url: d.url.trim(),
            thumbnail_url: d.thumbnail_url?.trim() || null,
          }))
          .filter((d) => d.url);

        const videoDocsWithThumbs = await Promise.all(
          normalizedVideoDocs.map(async (d) => {
            let resolvedUrl = d.url;
            if (d.thumbnail_url) return { ...d, url: resolvedUrl };

            // YouTube thumbnail
            const ytId = getYouTubeId(resolvedUrl);
            if (ytId) {
              return { ...d, url: resolvedUrl, thumbnail_url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` };
            }

            // Hosted video thumbnail (any non-YouTube/Vimeo)
            if (!isNonEmbedVideo(resolvedUrl)) return { ...d, url: resolvedUrl };

            try {
              console.log("[thumb] Generating thumbnail for:", resolvedUrl);
              let blob = await generateVideoThumbnail(resolvedUrl);

              // Fallback for CORS-blocked external hosts: internalize video first, then capture again
              if (!blob && !isInternalBusinessVideoUrl(resolvedUrl)) {
                const internalizedUrl = await internalizeExternalVideoUrl(resolvedUrl, businessId);
                if (internalizedUrl) {
                  resolvedUrl = internalizedUrl;
                  blob = await generateVideoThumbnail(resolvedUrl);
                }
              }

              if (!blob) {
                console.warn("[thumb] No blob generated for:", resolvedUrl);
                return { ...d, url: resolvedUrl };
              }

              const thumbName = `thumbs/${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
              const { error: upErr } = await supabase.storage.from("business-images").upload(thumbName, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
              if (upErr) {
                console.warn("[thumb] Upload error:", upErr);
                return { ...d, url: resolvedUrl };
              }

              const { data: thumbUrl } = supabase.storage.from("business-images").getPublicUrl(thumbName);
              console.log("[thumb] Generated:", thumbUrl?.publicUrl);
              return { ...d, url: resolvedUrl, thumbnail_url: thumbUrl?.publicUrl || null };
            } catch (e) {
              console.warn("[thumb] Generation error:", e);
              return { ...d, url: resolvedUrl };
            }
          })
        );

        await supabase.from("business_documents" as any).delete().eq("business_id", businessId);
        const allDocs = [
          ...menuDocs.filter(d => d.url.trim()).map((d, i) => ({ business_id: businessId, type: "menu" as const, url: d.url.trim(), name: d.name || null, language: d.language || null, icon: d.icon || null, sort_order: i })),
          ...flipbookDocs.filter(d => d.url.trim()).map((d, i) => ({ business_id: businessId, type: "flipbook" as const, url: d.url.trim(), name: d.name || null, language: d.language || null, icon: d.icon || null, sort_order: i })),
          ...externalLinkDocs
            .filter((d) => d.name.trim())
            .map((d, i) => ({ business_id: businessId, type: "external_link" as const, url: d.url.trim() || "", name: d.name.trim(), language: d.language || null, icon: d.image_url || null, sort_order: i, description: d.description || "presse" })),
          ...videoDocsWithThumbs.map((d, i) => ({ business_id: businessId, type: "video" as const, url: d.url, name: d.name || null, language: null, icon: null, sort_order: i, poi_id: d.poi_id || null, destination_id: d.destination_id || null, linked_business_id: d.linked_business_id || null, subcategory_id: d.subcategory_id || null, city: d.city || null, neighborhood: d.neighborhood || null, description: d.description || null, price: d.price || null, price_type: d.price_type || null, thumbnail_url: d.thumbnail_url || null })),
        ];
        if (allDocs.length > 0) {
          const { error: docsError } = await supabase.from("business_documents" as any).insert(allDocs);
          if (docsError) throw docsError;
        }

        // Keep UI in sync immediately after save (no manual refresh needed)
        setVideoDocs(videoDocsWithThumbs);
      }

      // Save menu summaries
      if (businessId) {
        await supabase.from("business_menu_summaries" as any).delete().eq("business_id", businessId);
        const summariesToInsert = menuSummaries
          .filter(s => s.title?.trim() || s.content?.trim() || s.avg_price_range)
          .map((s, i) => ({
            business_id: businessId,
            title: s.title?.trim() || null,
            content: s.content?.trim() || null,
            avg_price_range: s.avg_price_range || null,
            price_details: s.price_details?.trim() || null,
            sort_order: i,
          }));
        if (summariesToInsert.length > 0) {
          await supabase.from("business_menu_summaries" as any).insert(summariesToInsert);
        }
      }

      // Save business destinations
      if (businessId) {
        await supabase.from("business_destinations" as any).delete().eq("business_id", businessId);
        if (selectedDestinationIds.length > 0) {
          const destsToInsert = selectedDestinationIds.map(destId => ({
            business_id: businessId,
            destination_id: destId,
          }));
          await supabase.from("business_destinations" as any).insert(destsToInsert);
        }
      }

      // Save business points of interest
      if (businessId) {
        await supabase.from("business_points_of_interest" as any).delete().eq("business_id", businessId);
        if (selectedPOIIds.length > 0) {
          const poisToInsert = selectedPOIIds.map(poiId => ({
            business_id: businessId,
            point_of_interest_id: poiId,
          }));
          await supabase.from("business_points_of_interest" as any).insert(poisToInsert);
        }
      }

      // Save business POI businesses
      if (businessId) {
        await supabase.from("business_poi_businesses" as any).delete().eq("business_id", businessId);
        if (selectedPoiBusinessIds.length > 0) {
          const poiBizToInsert = selectedPoiBusinessIds.map(poiBizId => ({
            business_id: businessId,
            poi_business_id: poiBizId,
          }));
          await supabase.from("business_poi_businesses" as any).insert(poiBizToInsert);
        }
      }

      // Save business badges
      if (businessId) {
        await supabase.from("business_badges" as any).delete().eq("business_id", businessId);
        if (selectedBadgeIds.length > 0) {
          const badgesToInsert = selectedBadgeIds.map(bId => ({
            business_id: businessId,
            badge_id: bId,
            is_default: bId === defaultBadgeId,
          }));
          await supabase.from("business_badges" as any).insert(badgesToInsert);
        }
      }

      // SAFETY: Only delete files not referenced by any other business
      const removedImages = (formData._initialImages as string[]).filter(
        (url: string) => !formData.images.includes(url) && url.includes("/business-images/")
      );
      if (removedImages.length > 0) {
        // Check each removed image individually to avoid loading all businesses
        const safeToDelete: string[] = [];
        for (const url of removedImages) {
          // Check if any other business references this URL in images, logo_url, or logo_2_url
          const { data: refs } = await supabase
            .from("businesses")
            .select("id")
            .neq("id", businessId!)
            .or(`logo_url.eq.${url},logo_2_url.eq.${url},images.cs.{"${url}"}`)
            .limit(1);
          if (!refs || refs.length === 0) {
            safeToDelete.push(url);
          }
        }
        if (safeToDelete.length > 0) {
          const filePaths = safeToDelete
            .map((url: string) => {
              const parts = url.split("/business-images/");
              return parts.length > 1 ? parts[1] : null;
            })
            .filter(Boolean) as string[];
          if (filePaths.length > 0) {
            await supabase.storage.from("business-images").remove(filePaths);
          }
        }
      }

      // Clean up removed logo from storage (compare initial vs final)
      // SAFETY: Only delete if not referenced by any other business
      const initialLogo = formData._initialLogoUrl as string;
      if (initialLogo && initialLogo !== formData.logo_url && initialLogo.includes("/business-images/")) {
        const { data: otherWithLogo } = await supabase
          .from("businesses")
          .select("id")
          .neq("id", businessId!)
          .or(`logo_url.eq.${initialLogo},logo_2_url.eq.${initialLogo},images.cs.{${initialLogo}}`)
          .limit(1);

        if (!otherWithLogo || otherWithLogo.length === 0) {
          const logoParts = initialLogo.split("/business-images/");
          if (logoParts.length > 1) {
            await supabase.storage.from("business-images").remove([logoParts[1]]);
          }
        }
      }

      toast({
        title: "Succès",
        description: business ? "Entreprise mise à jour avec succès." : "Entreprise créée avec succès.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg border">
      {/* Sticky header */}
      <div className="sticky top-[73px] z-20 bg-background border-b px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => isDirty ? setShowLeaveDialog(true) : onCancel()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          {business ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nom cliquable pour copier */}
              <button
                type="button"
                title="Copier le nom"
                className="font-semibold hover:text-violet-700 transition-colors cursor-pointer"
                onClick={() => {
                  const text = formData.city ? `${formData.name} ${formData.city}` : formData.name;
                  navigator.clipboard.writeText(text);
                  toast({ title: `"${text}" copié !` });
                }}
              >
                {formData.name}
              </button>
              <button
                type="button"
                title="Copier le nom"
                onClick={() => {
                  const text = formData.city ? `${formData.name} ${formData.city}` : formData.name;
                  navigator.clipboard.writeText(text);
                  toast({ title: `"${text}" copié !` });
                }}
                className="text-muted-foreground hover:text-violet-700 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="logo"
                  className="h-8 w-8 object-contain rounded border bg-white flex-shrink-0"
                />
              )}
              {/* Note /20 */}
              {(() => {
                const fd = formData as any;
                let display: string | null = null;
                if (fd.rating) {
                  display = `${fd.rating}/20`;
                } else {
                  const { avg } = computeReviewsFromForm(fd);
                  if (avg !== null) {
                    display = `${avg}/20`;
                  }
                }
                return display ? (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    {display}
                  </span>
                ) : null;
              })()}
              <span className="text-muted-foreground/40">|</span>
              <a
                href={businessUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                title="Voir la fiche publique"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Fiche</span>
              </a>
              {formData.website && (
                <a href={formData.website} target="_blank" rel="noopener noreferrer" title="Site web" className="text-muted-foreground hover:text-blue-600 transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).instagram_url && (
                <a href={(formData as any).instagram_url} target="_blank" rel="noopener noreferrer" title="Instagram" className="text-muted-foreground hover:text-pink-600 transition-colors">
                  <InstagramIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).facebook_url && (
                <a href={(formData as any).facebook_url} target="_blank" rel="noopener noreferrer" title="Facebook" className="text-muted-foreground hover:text-blue-700 transition-colors">
                  <FacebookIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).tiktok_url && (
                <a href={(formData as any).tiktok_url} target="_blank" rel="noopener noreferrer" title="TikTok" className="text-muted-foreground hover:text-foreground transition-colors">
                  <TikTokIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).youtube_url && (
                <a href={(formData as any).youtube_url} target="_blank" rel="noopener noreferrer" title="YouTube" className="text-muted-foreground hover:text-red-600 transition-colors">
                  <YouTubeIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).twitter_url && (
                <a href={(formData as any).twitter_url} target="_blank" rel="noopener noreferrer" title="Twitter/X" className="text-muted-foreground hover:text-foreground transition-colors">
                  <TwitterIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).linkedin_url && (
                <a href={(formData as any).linkedin_url} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="text-muted-foreground hover:text-blue-700 transition-colors">
                  <LinkedInIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).whatsapp && (
                <a href={whatsappUrl((formData as any).whatsapp)} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-muted-foreground hover:text-green-600 transition-colors">
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {(formData as any).tripadvisor_url && (
                <a href={(formData as any).tripadvisor_url} target="_blank" rel="noopener noreferrer" title="TripAdvisor" className="text-muted-foreground hover:text-green-700 transition-colors">
                  <TripAdvisorIcon className="h-3.5 w-3.5" />
                </a>
              )}
              <span className="text-muted-foreground/40">|</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "__top__", label: "Top" },
                  { id: "section-contact", label: "Contact" },
                  { id: "section-description", label: "Description" },
                  { id: "section-poi", label: "POI" },
                  { id: "section-menu", label: "Menu" },
                  { id: "section-images", label: "Images" },
                  { id: "section-social", label: "Réseaux" },
                  { id: "section-avis", label: "Avis" },
                  { id: "section-services", label: "Engagements" },
                  { id: "section-badges", label: "Badges" },
                  { id: "section-taxonomie", label: "Taxonomie" },
                  { id: "section-keywords", label: "Mots clés" },
                  { id: "section-horaires", label: "Horaires" },
                  { id: "section-notes", label: "Notes" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      if (id === "__top__") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-bold">Nouvelle entreprise</h2>
          )}
        </div>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            console.log("[BusinessForm] Save button clicked");
            const form = document.querySelector('form');
            console.log("[BusinessForm] Form found:", !!form);
            if (form) {
              try {
                form.requestSubmit();
                console.log("[BusinessForm] requestSubmit() called");
              } catch (err) {
                console.error("[BusinessForm] requestSubmit error:", err);
              }
            }
          }}
          disabled={loading}
          className="bg-gold hover:bg-gold/90 text-gold-foreground flex-shrink-0"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>


      <div className="p-6">

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nom + Logo */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-xl font-semibold">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              className="!text-4xl font-bold h-20 px-4"
              style={{ fontSize: '2.25rem', lineHeight: '2.5rem' }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Logo</Label>
            <LogoUploader
              logoUrl={formData.logo_url}
              onChange={(url) => handleChange("logo_url", url)}
              businessId={business?.id}
            />
            {/* Logo background color selector */}
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Fond du logo (affichage front)</Label>
              <div className="flex gap-2">
                {[
                  { value: "transparent", label: "Transparent", preview: "bg-transparent border-2 border-dashed border-gray-300", textClass: "text-gray-500" },
                  { value: "white", label: "Blanc", preview: "bg-white border border-gray-300", textClass: "text-gray-800" },
                  { value: "black", label: "Noir", preview: "bg-black border border-gray-600", textClass: "text-white" },
                ].map(({ value, label, preview, textClass }) => {
                  const isSelected = ((formData as any).logo_bg || "transparent") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleChange("logo_bg", value)}
                      className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${isSelected ? "ring-2 ring-primary ring-offset-1 scale-105" : "opacity-60 hover:opacity-90"}`}
                      title={label}
                    >
                      <div className={`w-10 h-10 rounded flex items-center justify-center ${preview}`}>
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="logo" className="w-8 h-8 object-contain" />
                        ) : (
                          <span className={`text-[9px] font-bold ${textClass}`}>LOGO</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-green-50">

          <div className="space-y-2">
            <Label htmlFor="affiliate_id">Affilié</Label>
            <Select
              value={(formData as any).affiliate_id || "__none__"}
              onValueChange={(value) => handleChange("affiliate_id", value === "__none__" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="— Aucun —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Aucun —</SelectItem>
                {dbAffiliates.map((aff) => (
                  <SelectItem key={aff.id} value={aff.id}>
                    {aff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ice">ICE (max 20 caractères)</Label>
            <Input
              id="ice"
              value={formData.ice}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                handleChange("ice", value);
              }}
              placeholder="ABC123..."
              maxLength={20}
              pattern="[a-zA-Z0-9]*"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="kp_regroupement">KP regroupement (max 20)</Label>
              <Switch
                checked={!!formData.kp_active}
                onCheckedChange={(checked) => handleChange("kp_active", checked)}
              />
            </div>
            <Input
              id="kp_regroupement"
              value={formData.kp_regroupement}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                handleChange("kp_regroupement", value);
              }}
              placeholder="ABC123..."
              maxLength={20}
              pattern="[a-zA-Z0-9]*"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kp_regroupement_2">KP regroupement 2 (max 20)</Label>
            <Input
              id="kp_regroupement_2"
              value={formData.kp_regroupement_2}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                handleChange("kp_regroupement_2", value);
              }}
              placeholder="ABC123..."
              maxLength={20}
              pattern="[a-zA-Z0-9]*"
            />
          </div>
        </div>

        {/* Note /20, Statut, Mise en avant, Priority Score */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="space-y-2">
            <Label htmlFor="rating" className="font-semibold text-blue-800 dark:text-blue-200">Note /20</Label>
            <Input
              id="rating"
              type="number"
              step="0.01"
              min="0"
              max="20"
              value={formData.rating}
              onChange={(e) => handleChange("rating", e.target.value)}
              placeholder="0 - 20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wtuce_status" className="font-semibold text-blue-800 dark:text-blue-200">Statut WTUCE</Label>
            <Select
              value={formData.wtuce_status}
              onValueChange={(value) => handleChange("wtuce_status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Statut..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="verified">Vérifié ✓</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority_score" className="font-semibold text-blue-800 dark:text-blue-200">Priority Score</Label>
            <Input
              id="priority_score"
              type="number"
              min="0"
              value={formData.priority_score}
              onChange={(e) => handleChange("priority_score", e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Départage les résultats à pertinence égale : plus le score est élevé, plus l'établissement apparaît haut dans les résultats de recherche et les pages de villes.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => handleChange("is_featured", e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is_featured" className="font-semibold text-blue-800 dark:text-blue-200">Mise en avant</Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Filet de sécurité national : l'établissement s'affiche en dernier recours lorsqu'aucun résultat local ne correspond à la recherche.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active" className="font-semibold text-blue-800 dark:text-blue-200">Actif</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-red-50">
          <div className="space-y-2">
            <Label htmlFor="main_category">Catégorie principale</Label>
            <Select
              value={formData.main_category}
              onValueChange={(value) => {
                handleChange("main_category", value);
                // Reset gamme_id when category changes
                handleChange("gamme_id", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {dbCategories
                  .slice()
                  .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'))
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.name_fr}>
                      {cat.name_fr}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gamme_id">Gamme</Label>
            <Select
              value={formData.gamme_id || "__none__"}
              onValueChange={(value) => handleChange("gamme_id", value === "__none__" ? "" : value)}
              disabled={availableGammes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.main_category 
                    ? "Choisir une catégorie d'abord" 
                    : availableGammes.length === 0 
                      ? "Aucune gamme disponible" 
                      : "Sélectionner..."
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Aucune —</SelectItem>
                {availableGammes.map((gamme) => (
                  <SelectItem key={gamme.id} value={gamme.id}>
                    {gamme.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Type de compte</Label>
            <Select
              value={formData.account_type || "__none__"}
              onValueChange={(value) => handleChange("account_type", value === "__none__" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Aucun —</SelectItem>
                <SelectItem value="association">Association</SelectItem>
                <SelectItem value="corporate_branding">Corporate & Branding</SelectItem>
                <SelectItem value="grande_structure">Grande Structure</SelectItem>
                <SelectItem value="institution">Institution</SelectItem>
                <SelectItem value="petite_structure">Petite Structure</SelectItem>
                <SelectItem value="structure_moyenne">Structure Moyenne</SelectItem>
              </SelectContent>
           </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_chalandise">Zone de chalandise</Label>
            <Select
              value={(formData as any).zone_chalandise || "__none__"}
              onValueChange={(value) => handleChange("zone_chalandise", value === "__none__" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="__none__">— Aucune —</SelectItem>
                <SelectItem value="locale">Locale</SelectItem>
                <SelectItem value="regionale">Régionale</SelectItem>
                <SelectItem value="nationale">Nationale</SelectItem>
                <SelectItem value="internationale">Internationale</SelectItem>
                <SelectItem value="web_only">Web only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rendre visible</Label>
            <Select
              value={(formData as any).is_visible_locale ? "oui" : "non"}
              onValueChange={(value) => handleChange("is_visible_locale", value === "oui")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="non">Non</SelectItem>
                <SelectItem value="oui">Oui</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Villes de la zone nationale */}
          {(formData as any).zone_chalandise === "nationale" && (
            <div className="space-y-2 col-span-1 md:col-span-6">
              <Label>Villes couvertes (zone nationale)</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {dbCities.map((city) => {
                  const isChecked = ((formData as any).zone_city_ids || []).includes(city.id);
                  return (
                    <label key={city.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const current: string[] = (formData as any).zone_city_ids || [];
                          const next = isChecked
                            ? current.filter((id: string) => id !== city.id)
                            : [...current, city.id];
                          handleChange("zone_city_ids", next);
                        }}
                        className="rounded border-input"
                      />
                      {city.name_fr}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" className="text-xs h-6 px-2"
                  onClick={() => handleChange("zone_city_ids", dbCities.map(c => c.id))}>
                  Tout sélectionner
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-6 px-2"
                  onClick={() => handleChange("zone_city_ids", [])}>
                  Tout désélectionner
                </Button>
              </div>
            </div>
          )}

          {/* Langues parlées */}
          <div className="mt-4 space-y-2 col-span-1 md:col-span-6">
            <div className="flex items-center justify-between">
              <Label>Langues parlées</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={async () => {
                    const { data } = await supabase
                      .from("staff_notes")
                      .select("content")
                      .eq("key", "default_languages")
                      .maybeSingle();
                    if (data?.content) {
                      try {
                        const defaults = JSON.parse(data.content);
                        if (Array.isArray(defaults)) {
                          handleChange("languages", defaults);
                          toast({ title: "Langues par défaut appliquées" });
                        }
                      } catch { toast({ title: "Erreur de format", variant: "destructive" }); }
                    } else {
                      toast({ title: "Aucune langue par défaut définie", variant: "destructive" });
                    }
                  }}
                >
                  ↓ Appliquer défaut
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={async () => {
                    const languages = ((formData as any).languages as string[]) || [];
                    if (languages.length === 0) {
                      toast({ title: "Sélectionnez d'abord des langues", variant: "destructive" });
                      return;
                    }
                    const content = JSON.stringify(languages);
                    const { data: existing } = await supabase
                      .from("staff_notes")
                      .select("id")
                      .eq("key", "default_languages")
                      .maybeSingle();
                    if (existing) {
                      await supabase.from("staff_notes").update({ content, updated_at: new Date().toISOString() }).eq("key", "default_languages");
                    } else {
                      await supabase.from("staff_notes").insert({ key: "default_languages", content });
                    }
                    toast({ title: "Langues par défaut sauvegardées ✓" });
                  }}
                >
                  💾 Définir comme défaut
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1 w-full">
              {[
                { code: "ar", flag: "🇲🇦", label: "AR" },
                { code: "ar-std", flag: "ض", label: "AR", isText: true },
                { code: "fr", flag: "🇫🇷", label: "FR" },
                { code: "en", flag: "🇬🇧", label: "EN" },
                { code: "es", flag: "🇪🇸", label: "ES" },
                { code: "de", flag: "🇩🇪", label: "DE" },
                { code: "it", flag: "🇮🇹", label: "IT" },
                { code: "pt", flag: "🇵🇹", label: "PT" },
                { code: "nl", flag: "🇳🇱", label: "NL" },
                { code: "zh", flag: "🇨🇳", label: "ZH" },
                { code: "ja", flag: "🇯🇵", label: "JA" },
                { code: "ru", flag: "🇷🇺", label: "RU" },
              ].map(({ code, flag, label, isText }) => {
                const languages = ((formData as any).languages as string[]) || [];
                const isSelected = languages.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    title={code === "ar-std" ? "Arabe (standard)" : undefined}
                    onClick={() => {
                      const updated = isSelected
                        ? languages.filter((l: string) => l !== code)
                        : [...languages, code];
                      handleChange("languages", updated);
                    }}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[10px] transition-colors ${
                      isSelected
                        ? "bg-red-200 border-red-400 text-red-900 font-medium"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <span className={`leading-none ${isText ? "text-base font-bold" : "text-lg"}`}>{flag}</span>
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
              <strong>↓ Appliquer défaut</strong> : applique les langues par défaut sauvegardées<br />
              <strong>💾 Définir comme défaut</strong> : sauvegarde la sélection actuelle comme langues par défaut (pour les prochaines fiches)
            </p>
          </div>
        </div>


        {/* ── Présentation (SlidePanel options) ── */}
        <div id="section-presentation" className="p-4 border rounded-lg bg-green-50 space-y-4" style={{ scrollMarginTop: '160px' }}>
          <h3 className="text-sm font-semibold text-green-800">🎨 Présentation</h3>

          {/* Site web */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {formData.website ? (
                <Label htmlFor="website_pres"><a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Site web ↗</a></Label>
              ) : (
                <Label htmlFor="website_pres">Site web</Label>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(formData as any).website_force_external}
                onCheckedChange={(checked) => handleChange("website_force_external", checked)}
                title="Ouvrir en lien externe"
                className="shrink-0"
              />
              <Input
                id="website_pres"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://"
                className="flex-1"
              />
              {formData.website && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" title="Supprimer" onClick={() => handleChange("website", "")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Select
                value={(formData as any).website_presentation_mode || "plus_informations"}
                onValueChange={(value) => handleChange("website_presentation_mode", value)}
              >
                <SelectTrigger className="w-48 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="acheter_en_ligne">Acheter en ligne</SelectItem>
                  <SelectItem value="reserver_en_ligne">Réserver en ligne</SelectItem>
                  <SelectItem value="consulter_offre">Consulter notre offre</SelectItem>
                  <SelectItem value="plus_informations">Plus d'informations</SelectItem>
                  <SelectItem value="contactez_nous">Contactez nous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData as any).website_force_external && <span className="text-xs text-orange-600">⚡ Lien externe activé</span>}
            <BrokenUrlBadge url={formData.website} />
            {formData.website && (
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1 transition-colors mt-1"
                title="Copier l'URL du site web vers Réserver maintenant"
                onClick={() => {
                  handleChange("reserve_now_url", formData.website);
                  toast({ title: "URL copiée vers \"Réserver maintenant\"" });
                }}
              >
                <ArrowDown className="h-4 w-4" />
                <span>↓ Copier vers Réserver maintenant</span>
              </button>
            )}
          </div>

          {/* Réserver maintenant */}
          <div className="space-y-1">
            {formData.reserve_now_url ? (
              <Label htmlFor="reserve_now_pres"><a href={formData.reserve_now_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Lien "Réserver maintenant" ↗</a></Label>
            ) : (
              <Label htmlFor="reserve_now_pres">Lien "Réserver maintenant"</Label>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={(formData as any).reserve_now_force_external}
                onCheckedChange={(checked) => handleChange("reserve_now_force_external", checked)}
                title="Ouvrir en lien externe"
                className="shrink-0"
              />
              <Input
                id="reserve_now_pres"
                value={formData.reserve_now_url}
                onChange={(e) => handleChange("reserve_now_url", e.target.value)}
                placeholder="https://"
                className="flex-1"
              />
              {formData.reserve_now_url && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" title="Supprimer" onClick={() => handleChange("reserve_now_url", "")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Select
                value={(formData as any).presentation_mode || "reserver_en_ligne"}
                onValueChange={(value) => handleChange("presentation_mode", value)}
              >
                <SelectTrigger className="w-48 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="acheter_en_ligne">Acheter en ligne</SelectItem>
                  <SelectItem value="reserver_en_ligne">Réserver en ligne</SelectItem>
                  <SelectItem value="consulter_offre">Consulter notre offre</SelectItem>
                  <SelectItem value="plus_informations">Plus d'informations</SelectItem>
                  <SelectItem value="contactez_nous">Contactez nous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData as any).reserve_now_force_external && <span className="text-xs text-orange-600">⚡ Lien externe activé</span>}
            <BrokenUrlBadge url={formData.reserve_now_url} />
          </div>

          {/* Boutique en ligne */}
          <div className="space-y-1">
            {formData.online_shop_url ? (
              <Label htmlFor="online_shop_pres"><a href={formData.online_shop_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Boutique en ligne ↗</a></Label>
            ) : (
              <Label htmlFor="online_shop_pres">Boutique en ligne</Label>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={(formData as any).online_shop_force_external}
                onCheckedChange={(checked) => handleChange("online_shop_force_external", checked)}
                title="Ouvrir en lien externe"
                className="shrink-0"
              />
              <Input
                id="online_shop_pres"
                value={formData.online_shop_url}
                onChange={(e) => handleChange("online_shop_url", e.target.value)}
                placeholder="https://"
                className="flex-1"
              />
              {formData.online_shop_url && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" title="Supprimer" onClick={() => handleChange("online_shop_url", "")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Select
                value={(formData as any).online_shop_presentation_mode || "acheter_en_ligne"}
                onValueChange={(value) => handleChange("online_shop_presentation_mode", value)}
              >
                <SelectTrigger className="w-48 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="acheter_en_ligne">Acheter en ligne</SelectItem>
                  <SelectItem value="reserver_en_ligne">Réserver en ligne</SelectItem>
                  <SelectItem value="consulter_offre">Consulter notre offre</SelectItem>
                  <SelectItem value="plus_informations">Plus d'informations</SelectItem>
                  <SelectItem value="contactez_nous">Contactez nous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData as any).online_shop_force_external && <span className="text-xs text-orange-600">⚡ Lien externe activé</span>}
            <BrokenUrlBadge url={formData.online_shop_url} />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">📺 Média prioritaire</Label>
              <select
                value={formData.show_videos ? "videos" : formData.prioritize_images ? "images" : (formData.matterport_url ? "matterport" : "images")}
                onChange={(e) => {
                  const v = e.target.value;
                  handleChange("show_videos", v === "videos");
                  handleChange("prioritize_images", v === "images");
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48"
              >
                <option value="videos">🎬 Carrousel vidéo</option>
                <option value="images">🖼️ Prioriser images</option>
                <option value="matterport">🏠 Visite virtuelle 3D</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={formData.default_sound_on} onCheckedChange={(checked) => handleChange("default_sound_on", checked)} />
              <span>🔊 Son par défaut</span>
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">🏷️ Badge Carrousel</Label>
              <Select
                value={(formData as any).carousel_badge || "__none__"}
                onValueChange={(value) => handleChange("carousel_badge", value === "__none__" ? null : value)}
              >
                <SelectTrigger className="w-64 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="__none__">Aucun</SelectItem>
                  <SelectItem value="nos_offres">Nos offres</SelectItem>
                  <SelectItem value="immergez_vous">Immergez-vous</SelectItem>
                  <SelectItem value="bienvenue_a">Bienvenue à "{formData.name}"</SelectItem>
                  <SelectItem value="bienvenue_au">Bienvenue au "{formData.name}"</SelectItem>
                  <SelectItem value="bienvenue_chez">Bienvenue chez "{formData.name}"</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div id="section-contact" className="p-4 border rounded-lg bg-orange-50 space-y-4" style={{ scrollMarginTop: '160px' }}>
          <h3 className="text-sm font-semibold text-orange-800">📍 Contact & Localisation</h3>
          
          {/* Adresse, Ville, Région, Quartier */}
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="address_top">Adresse</Label>
              <Input
                id="address_top"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="city_top">Ville</Label>
              <Select
                value={formData.city || "__none__"}
                onValueChange={(value) => {
                  if (value === "__none__") {
                    handleChange("city", "");
                    handleChange("region", "");
                    handleChange("neighborhood", "");
                  } else {
                    handleChange("city", value);
                    const selectedCity = dbCities.find(c => c.name_fr === value);
                    if (selectedCity?.region) {
                      handleChange("region", selectedCity.region);
                    }
                    handleChange("neighborhood", "");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ville..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucune —</SelectItem>
                  {dbCities.map((city) => (
                    <SelectItem key={city.id} value={city.name_fr}>
                      {city.name_fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="region_top">Région{formData.city ? " *" : ""}</Label>
              <Select
                value={formData.region || "__none__"}
                onValueChange={(value) => handleChange("region", value === "__none__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Région..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucune —</SelectItem>
                  {REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="neighborhood_top">Quartier</Label>
              <Select
                value={formData.neighborhood || "__none__"}
                onValueChange={(value) => handleChange("neighborhood", value === "__none__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.city
                      ? "Ville d'abord"
                      : neighborhoodsForCity.length === 0
                        ? "Aucun"
                        : "Quartier..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun —</SelectItem>
                  {neighborhoodsForCity.map((n) => (
                    <SelectItem key={n.id} value={n.name}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="is_poi"
                  checked={(formData as any).is_poi || false}
                  onCheckedChange={(checked) => handleChange("is_poi", !!checked)}
                />
                <Label htmlFor="is_poi" className="text-xs cursor-pointer">Points d'intérêt</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            {/* Google Maps URL - takes remaining space */}
            <div className="space-y-2 flex-1 min-w-0">
              <Label htmlFor="google_maps_url_top" className="flex items-center gap-2">
                <GoogleMapsIcon className="text-[#4285F4]" />
                {formData.google_maps_url ? (
                  <a href={formData.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                    Google Maps ↗
                  </a>
                ) : (
                  "Google Maps"
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="google_maps_url_top"
                  value={formData.google_maps_url}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange("google_maps_url", val);
                    if (val) {
                      handleChange("google_reviews_url", val);
                    }
                  }}
                  onBlur={async (e) => {
                    const val = e.target.value?.trim();
                    if (!val || !val.includes("google") || (formData.latitude && formData.longitude)) return;
                    // Auto-extract GPS via edge function on blur when lat/lng are empty
                    try {
                      const { data, error } = await supabase.functions.invoke("resolve-maps-url", {
                        body: { url: val },
                      });
                      if (error) throw error;
                      if (data?.lat && data?.lng) {
                        handleChange("latitude", data.lat);
                        handleChange("longitude", data.lng);
                        if (data.resolvedUrl && data.resolvedUrl !== val) {
                          handleChange("google_maps_url", data.resolvedUrl);
                          handleChange("google_reviews_url", data.resolvedUrl);
                        }
                        toast({ title: "GPS auto-détecté", description: `Lat: ${data.lat}, Lng: ${data.lng}${data.method ? ` (${data.method})` : ""}` });
                      }
                    } catch {
                      // Silent fail on auto-extract — user can still use the GPS button
                    }
                  }}
                  placeholder="https://maps.google.com/..."
                  className="flex-1"
                />
                {formData.google_maps_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      handleChange("google_maps_url", "");
                      handleChange("google_reviews_url", "");
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <BrokenUrlBadge url={formData.google_maps_url} />
            </div>

            {/* Lat, Lng & GPS button - fixed width, pushed right */}
            <div className="flex gap-2 items-end shrink-0">
              <div className="space-y-2" style={{ width: '130px', minWidth: '130px' }}>
                <Label htmlFor="latitude_top" className="text-xs">Lat</Label>
                <Input
                  id="latitude_top"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleChange("latitude", e.target.value)}
                  placeholder="31.6295"
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-2" style={{ width: '130px', minWidth: '130px' }}>
                <Label htmlFor="longitude_top" className="text-xs">Lng</Label>
                <Input
                  id="longitude_top"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleChange("longitude", e.target.value)}
                  placeholder="-7.9811"
                  className="text-xs h-8"
                />
              </div>
              {formData.google_maps_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs h-8 shrink-0"
                  onClick={async () => {
                    const url = formData.google_maps_url;
                    try {
                      toast({ title: "Résolution de l'URL...", description: "Extraction via Google Places API." });
                      const { data, error } = await supabase.functions.invoke("resolve-maps-url", {
                        body: { url },
                      });
                      if (error) throw error;
                      if (data?.lat && data?.lng) {
                        handleChange("latitude", data.lat);
                        handleChange("longitude", data.lng);
                        if (data.resolvedUrl && data.resolvedUrl !== url) {
                          handleChange("google_maps_url", data.resolvedUrl);
                          handleChange("google_reviews_url", data.resolvedUrl);
                        }
                        toast({ title: "GPS récupéré", description: `Lat: ${data.lat}, Lng: ${data.lng}${data.method ? ` (${data.method})` : ""}` });
                      } else {
                        toast({ variant: "destructive", title: "Impossible d'extraire les coordonnées", description: "Le format de l'URL Google Maps n'est pas reconnu." });
                      }
                    } catch (err: any) {
                      toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible de résoudre l'URL." });
                    }
                  }}
                >
                  <MapPinned className="h-3.5 w-3.5" />
                  GPS
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_top" className="flex items-center gap-2">
                <WhatsAppIcon className="text-[#25D366]" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp_top"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram_top" className="flex items-center gap-2">
                <span className="text-[#26A5E4] font-bold text-sm">✈</span>
                Telegram
              </Label>
              <Input
                id="telegram_top"
                value={(formData as any).telegram || ""}
                onChange={(e) => handleChange("telegram", e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skype_top" className="flex items-center gap-2">
                <SkypeIcon className="text-[#00AFF0]" />
                Skype
              </Label>
              <Input
                id="skype_top"
                value={formData.skype}
                onChange={(e) => handleChange("skype", e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_top">Téléphone</Label>
              <Input
                id="phone_top"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_top">Email</Label>
              <Input
                id="email_top"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder=""
              />
            </div>
          </div>
        </div>

        {/* Hook multilingue - affiché en gros comme Nom */}
        <div id="section-description" className="space-y-3" style={{ scrollMarginTop: '160px' }}>
          <Input
            id="hook_fr"
            value={formData.hook_fr}
            onChange={(e) => handleChange("hook_fr", e.target.value.slice(0, 120))}
            placeholder="Accroche en français"
            maxLength={120}
            className="!text-2xl font-semibold h-14 px-4"
            style={{ fontSize: '1.5rem', lineHeight: '2rem' }}
          />
          <span className="text-xs text-muted-foreground">{formData.hook_fr.length}/120</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            content={formData.description}
            onChange={(html) => handleChange("description", html)}
            maxHeight="600px"
             />
            <BrokenUrlBadge url={formData.menu_url} />
           </div>

        {/* POI / Destinations */}
        <div id="section-poi" style={{ scrollMarginTop: "140px" }} />
        {allDestinations.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="destinations" className="border-none">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                    <MapPinned className="h-5 w-5" />
                    Destinations
                    {selectedDestinationIds.length > 0 && (
                      <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 py-0 text-[10px] font-semibold">{selectedDestinationIds.length}</span>
                    )}
                  </Label>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {allDestinations.map((dest) => {
                        const isSelected = selectedDestinationIds.includes(dest.id);
                        return (
                          <button
                            key={dest.id}
                            type="button"
                            onClick={() => {
                              setSelectedDestinationIds(prev =>
                                isSelected ? prev.filter(id => id !== dest.id) : [...prev, dest.id]
                              );
                              setIsDirty(true);
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-background border-border hover:bg-muted"
                            }`}
                          >
                            {dest.name_fr}
                            {dest.region && dest.region.length > 0 && <span className="ml-1 opacity-60 text-xs">({dest.region.join(", ")})</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Global destination hook & description */}
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Hook Destination (H2) — {((formData as any).destination_hook || "").length}/120</Label>
                        <Input
                          value={(formData as any).destination_hook || ""}
                          onChange={(e) => handleChange("destination_hook" as any, e.target.value.slice(0, 120))}
                          placeholder="Accroche courte pour la section destination..."
                          maxLength={120}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Description Destination — {(() => { const el = document.createElement('div'); el.innerHTML = (formData as any).destination_description || ''; return (el.textContent || '').replace(/\s+/g, ' ').trim().length; })()} caractères</Label>
                        <RichTextEditor
                          content={(formData as any).destination_description || ""}
                          onChange={(val) => {
                            const el = document.createElement('div');
                            el.innerHTML = val;
                            const plainLen = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
                            if (plainLen <= 500) {
                              handleChange("destination_description" as any, val);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </div>
            </AccordionItem>
          </Accordion>
        )}

        {/* Points d'intérêt */}
        {poisForCity.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="pois" className="border-none">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                    <MapPinned className="h-5 w-5" />
                    Points d'intérêt
                    <span className="text-sm font-normal text-muted-foreground">
                      ({formData.city || formData.region || "aucune ville/région"})
                    </span>
                    {selectedPOIIds.length > 0 && (
                      <span className="ml-1.5 bg-emerald-600 text-white rounded-full px-1.5 py-0 text-[10px] font-semibold">{selectedPOIIds.length}</span>
                    )}
                  </Label>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {poisForCity.map((poi) => {
                        const isSelected = selectedPOIIds.includes(poi.id);
                        return (
                          <button
                            key={poi.id}
                            type="button"
                            onClick={() => {
                              setSelectedPOIIds(prev =>
                                isSelected ? prev.filter(id => id !== poi.id) : [...prev, poi.id]
                              );
                              setIsDirty(true);
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-background border-border hover:bg-muted"
                            }`}
                          >
                            {poi.name_fr}
                          </button>
                        );
                      })}
                    </div>

                    {/* Global POI hook & description */}
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Hook Points d'intérêt (H2) — {((formData as any).poi_hook || "").length}/120</Label>
                        <Input
                          value={(formData as any).poi_hook || ""}
                          onChange={(e) => handleChange("poi_hook" as any, e.target.value.slice(0, 120))}
                          placeholder="Accroche courte pour la section points d'intérêt..."
                          maxLength={120}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Description Points d'intérêt — {(() => { const el = document.createElement('div'); el.innerHTML = (formData as any).poi_description || ''; return (el.textContent || '').replace(/\s+/g, ' ').trim().length; })()} caractères</Label>
                        <RichTextEditor
                          content={(formData as any).poi_description || ""}
                          onChange={(val) => {
                            const el = document.createElement('div');
                            el.innerHTML = val;
                            const plainLen = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
                            if (plainLen <= 500) {
                              handleChange("poi_description" as any, val);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </div>
            </AccordionItem>
          </Accordion>
        )}

        {/* Points d'intérêt (établissements POI de la même ville) */}
        {poiBusinessesForCity.length > 0 && (
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <MapPinned className="h-5 w-5" />
              Points d'intérêt (établissements)
              <span className="text-sm font-normal text-muted-foreground">
                ({formData.city})
              </span>
            </Label>
            <div className="space-y-3">
              {(() => {
                const grouped: Record<string, typeof poiBusinessesForCity> = {};
                poiBusinessesForCity.forEach((biz) => {
                  const key = biz.neighborhood || "Autre";
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(biz);
                });
                const sortedKeys = Object.keys(grouped).sort((a, b) => a === "Autre" ? 1 : b === "Autre" ? -1 : a.localeCompare(b));
                return sortedKeys.map((neighborhood) => {
                  const neighborhoodIds = grouped[neighborhood].map((b) => b.id);
                  const allSelected = neighborhoodIds.every((id) => selectedPoiBusinessIds.includes(id));
                  const someSelected = !allSelected && neighborhoodIds.some((id) => selectedPoiBusinessIds.includes(id));
                  const toggleNeighborhoodSelection = () => {
                    setSelectedPoiBusinessIds((prev) => {
                      if (allSelected) {
                        return prev.filter((id) => !neighborhoodIds.includes(id));
                      }
                      return [...new Set([...prev, ...neighborhoodIds])];
                    });
                    setIsDirty(true);
                  };

                  return (
                  <div key={neighborhood}>
                    <div className="mb-1 flex items-center gap-2">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleNeighborhoodSelection}
                        aria-label={allSelected ? `Désélectionner tout le quartier ${neighborhood}` : `Sélectionner tout le quartier ${neighborhood}`}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
                        onClick={toggleNeighborhoodSelection}
                        title={allSelected ? "Désélectionner tout le quartier" : "Sélectionner tout le quartier"}
                      >
                        {neighborhood}
                        <span className="text-[10px] opacity-60">({neighborhoodIds.length})</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {grouped[neighborhood].map((biz) => {
                        const isSelected = selectedPoiBusinessIds.includes(biz.id);
                        return (
                          <Badge
                            key={biz.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedPoiBusinessIds(prev =>
                                isSelected ? prev.filter(id => id !== biz.id) : [...prev, biz.id]
                              );
                              setIsDirty(true);
                            }}
                          >
                            {biz.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        <div id="section-menu" className="space-y-2" style={{ scrollMarginTop: '160px' }}>
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Menu (URL)</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setMenuDocs(prev => [...prev, { _uid: crypto.randomUUID(), url: "", name: "", language: "", icon: "" }])}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </div>
          <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const oldIdx = menuDocs.findIndex((d) => d._uid === active.id);
              const newIdx = menuDocs.findIndex((d) => d._uid === over.id);
              if (oldIdx !== -1 && newIdx !== -1) setMenuDocs(prev => arrayMove(prev, oldIdx, newIdx));
            }
          }}>
            <SortableContext items={menuDocs.map((d) => d._uid)} strategy={verticalListSortingStrategy}>
              {menuDocs.map((doc, idx) => (
                <SortableDocRow key={doc._uid} id={doc._uid}>
              <div className="relative shrink-0 group">
                {doc.icon ? (
                  <img src={getDocIconSrc(doc.icon)} alt="" className="h-9 w-9 object-contain rounded border border-input p-0.5 cursor-pointer" />
                ) : (
                  <div className="h-9 w-9 rounded border border-dashed border-input flex items-center justify-center text-muted-foreground text-xs cursor-pointer">⊘</div>
                )}
                <select
                  value={doc.icon || ""}
                  onChange={(e) => setMenuDocs(prev => prev.map((d, i) => i === idx ? { ...d, icon: e.target.value } : d))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {DOC_ICON_OPTIONS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex items-center gap-1">
                {doc.url && doc.url.includes('/business-images/') ? (
                  <div className="flex-1 flex items-center gap-1 h-10 px-3 rounded-md border border-input bg-muted text-sm truncate">
                    {/\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(doc.url) ? (
                      <img src={doc.url} alt="" className="h-7 w-7 object-cover rounded shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="truncate">{doc.url.split('/').pop()}</span>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" title="Ouvrir">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Button type="button" variant="ghost" size="sm" className="shrink-0 px-1 h-6 text-destructive hover:text-destructive" title="Supprimer le fichier" onClick={async () => {
                      try {
                        const parts = doc.url.split('/business-images/');
                        if (parts.length > 1) await supabase.storage.from('business-images').remove([parts[1]]);
                      } catch {}
                      setMenuDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: '' } : d));
                    }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={doc.url}
                      onChange={(e) => setMenuDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: e.target.value } : d))}
                      placeholder="https://... ou uploadez un PDF/image"
                      className="flex-1"
                    />
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" title="Ouvrir le lien">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </>
                )}
                <label className="shrink-0 cursor-pointer" title="Uploader un PDF ou une image">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const isPdf = file.type === 'application/pdf';
                      const isImage = file.type.startsWith('image/');
                      if (!isPdf && !isImage) { toast({ variant: 'destructive', title: 'Seuls les PDF et images sont acceptés' }); return; }
                      if (file.size > 10 * 1024 * 1024) { toast({ variant: 'destructive', title: 'Max 10MB' }); return; }
                      const ext = file.name.split('.').pop() || (isPdf ? 'pdf' : 'jpg');
                      const folder = isPdf ? 'pdfs' : 'menus';
                      const fileName = `${business?.id || 'new'}-menu-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                      const filePath = `businesses/${folder}/${fileName}`;
                      const { error } = await supabase.storage.from('business-images').upload(filePath, file);
                      if (error) { toast({ variant: 'destructive', title: "Erreur d'upload" }); return; }
                      const { data } = supabase.storage.from('business-images').getPublicUrl(filePath);
                      if (data?.publicUrl) {
                        setMenuDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: data.publicUrl } : d));
                        toast({ title: isPdf ? 'PDF uploadé' : 'Image uploadée' });
                      }
                      e.target.value = '';
                    }}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                </label>
              </div>
              <Input
                value={doc.name}
                onChange={(e) => setMenuDocs(prev => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
                placeholder="Nom"
                className="w-48"
              />
              <select
                value={doc.language}
                onChange={(e) => setMenuDocs(prev => prev.map((d, i) => i === idx ? { ...d, language: e.target.value } : d))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-28"
              >
                <option value="">Langue</option>
                {LANGUAGE_OPTIONS.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" title="Supprimer" onClick={() => setMenuDocs(prev => prev.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4" />
              </Button>
                </SortableDocRow>
              ))}
            </SortableContext>
          </DndContext>
          {menuDocs.length === 0 && <p className="text-xs text-muted-foreground">Aucun menu ajouté.</p>}

          {/* Menu Summaries - Multiple */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">📝 Résumés du menu <span className="text-muted-foreground font-normal text-sm">(pour l'IA)</span></Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setMenuSummaries(prev => [...prev, { title: "", content: "", avg_price_range: null, price_details: "" }])}>
                <Plus className="h-3 w-3" /> Ajouter un résumé
              </Button>
            </div>

            {menuSummaries.map((summary, idx) => (
              <div key={idx} className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-800">Résumé #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 px-2" onClick={() => setMenuSummaries(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Titre</Label>
                  <Input
                    value={summary.title}
                    onChange={(e) => setMenuSummaries(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                    placeholder="Ex: La carte de La Grande Brasserie"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Contenu</Label>
                  <RichTextEditor
                    content={summary.content}
                    onChange={(html) => setMenuSummaries(prev => prev.map((s, i) => i === idx ? { ...s, content: html } : s))}
                    placeholder="Cuisine fusion méditerranéenne, entrées à partager, plats signatures, desserts..."
                    maxHeight="300px"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">💰 Budget moyen par personne</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={summary.avg_price_range?.min ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined;
                          setMenuSummaries(prev => prev.map((s, i) => i === idx ? { ...s, avg_price_range: { ...(s.avg_price_range || {}), min: val } } : s));
                        }}
                        placeholder="Min"
                        className="w-24"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="number"
                        value={summary.avg_price_range?.max ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined;
                          setMenuSummaries(prev => prev.map((s, i) => i === idx ? { ...s, avg_price_range: { ...(s.avg_price_range || {}), max: val } } : s));
                        }}
                        placeholder="Max"
                        className="w-24"
                      />
                      <select
                        value={summary.avg_price_range?.currency || "MAD"}
                        onChange={(e) => setMenuSummaries(prev => prev.map((s, i) => i === idx ? { ...s, avg_price_range: { ...(s.avg_price_range || {}), currency: e.target.value } } : s))}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm w-24"
                      >
                        <option value="MAD">MAD</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    {summary.avg_price_range?.min != null && summary.avg_price_range?.max != null && (
                      <p className="text-xs text-muted-foreground">
                        Affiché : {summary.avg_price_range.min}–{summary.avg_price_range.max} {summary.avg_price_range.currency || "MAD"} / personne
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">📊 Détail des prix</Label>
                    <RichTextEditor
                      content={summary.price_details || ""}
                      onChange={(html) => setMenuSummaries(prev => prev.map((s, i) => i === idx ? { ...s, price_details: html } : s))}
                      placeholder="Entrées 220–450 MAD · Plats 290–970 MAD · Desserts 200–250 MAD..."
                      maxHeight="180px"
                    />
                  </div>
                </div>
              </div>
            ))}
            {menuSummaries.length === 0 && <p className="text-xs text-muted-foreground">Aucun résumé ajouté.</p>}
          </div>
        </div>

        {/* Flipbook / Issuu */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">📖 Flipbook (Issuu, Calaméo…)</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setFlipbookDocs(prev => [...prev, { _uid: crypto.randomUUID(), url: "", name: "", language: "", icon: "" }])}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </div>
          <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const oldIdx = flipbookDocs.findIndex((d) => d._uid === active.id);
              const newIdx = flipbookDocs.findIndex((d) => d._uid === over.id);
              if (oldIdx !== -1 && newIdx !== -1) setFlipbookDocs(prev => arrayMove(prev, oldIdx, newIdx));
            }
          }}>
            <SortableContext items={flipbookDocs.map((d) => d._uid)} strategy={verticalListSortingStrategy}>
              {flipbookDocs.map((doc, idx) => (
                <SortableDocRow key={doc._uid} id={doc._uid}>
              <div className="relative shrink-0 group">
                {doc.icon ? (
                  <img src={getDocIconSrc(doc.icon)} alt="" className="h-9 w-9 object-contain rounded border border-input p-0.5 cursor-pointer" />
                ) : (
                  <div className="h-9 w-9 rounded border border-dashed border-input flex items-center justify-center text-muted-foreground text-xs cursor-pointer">⊘</div>
                )}
                <select
                  value={doc.icon || ""}
                  onChange={(e) => setFlipbookDocs(prev => prev.map((d, i) => i === idx ? { ...d, icon: e.target.value } : d))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {DOC_ICON_OPTIONS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <Input
                  value={doc.url}
                  onChange={(e) => setFlipbookDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: e.target.value } : d))}
                  placeholder="https://issuu.com/username/docs/document-name"
                  className="flex-1"
                />
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" title="Ouvrir le lien">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <Input
                value={doc.name}
                onChange={(e) => setFlipbookDocs(prev => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
                placeholder="Nom"
                className="w-48"
              />
              <select
                value={doc.language}
                onChange={(e) => setFlipbookDocs(prev => prev.map((d, i) => i === idx ? { ...d, language: e.target.value } : d))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-28"
              >
                <option value="">Langue</option>
                {LANGUAGE_OPTIONS.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" title="Supprimer" onClick={() => setFlipbookDocs(prev => prev.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4" />
              </Button>
                </SortableDocRow>
              ))}
            </SortableContext>
          </DndContext>
          {flipbookDocs.length === 0 && <p className="text-xs text-muted-foreground">Aucun flipbook ajouté.</p>}
          <p className="text-xs text-muted-foreground">Collez l'URL de la publication Issuu ou Calaméo. Elle sera intégrée dans le panneau de l'établissement.</p>
        </div>

        {/* External Links */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">🔗 Liens Externes</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setExternalLinkDocs(prev => [...prev, { _uid: crypto.randomUUID(), url: "", name: "", language: "", image_url: "", description: "presse" }])}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </div>
          <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const oldIdx = externalLinkDocs.findIndex((d) => d._uid === active.id);
              const newIdx = externalLinkDocs.findIndex((d) => d._uid === over.id);
              if (oldIdx !== -1 && newIdx !== -1) setExternalLinkDocs(prev => arrayMove(prev, oldIdx, newIdx));
            }
          }}>
            <SortableContext items={externalLinkDocs.map((d) => d._uid)} strategy={verticalListSortingStrategy}>
              {externalLinkDocs.map((doc, idx) => (
                <SortableDocRow key={doc._uid} id={doc._uid}>
              {/* Image upload thumbnail */}
              <label className="shrink-0 cursor-pointer relative group">
                {doc.image_url ? (
                  <img src={doc.image_url} alt="" className="h-9 w-9 object-cover rounded border border-input" />
                ) : (
                  <div className="h-9 w-9 rounded border border-dashed border-input flex items-center justify-center bg-muted/50 hover:bg-muted">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                    const path = `external-links/${crypto.randomUUID()}.${ext}`;
                    const { error } = await supabase.storage.from("external-link-images").upload(path, file);
                    if (error) {
                      toast({ title: "Erreur upload image", variant: "destructive" });
                      return;
                    }
                    const { data: urlData } = supabase.storage.from("external-link-images").getPublicUrl(path);
                    setExternalLinkDocs(prev => prev.map((d, i) => i === idx ? { ...d, image_url: urlData.publicUrl } : d));
                  }}
                />
              </label>
              <Input
                value={doc.name}
                onChange={(e) => setExternalLinkDocs(prev => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
                placeholder="Titre *"
                className="w-56 lg:w-72 shrink-0"
                required
              />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <Input
                  value={doc.url}
                  onChange={(e) => setExternalLinkDocs(prev => prev.map((d, i) => i === idx ? { ...d, url: e.target.value } : d))}
                  placeholder="URL du lien"
                  className="flex-1"
                />
                {doc.url && (
                  <>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" title="Ouvrir le lien">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      title="Tester iframe"
                      onClick={async () => {
                        const testUrl = doc.url;
                        if (!testUrl) return;
                        const loadingToastId = sonnerToast.loading("⏳ Test en cours…", {
                          description: testUrl,
                          duration: 30000,
                        });
                        let timeoutId: number | undefined;

                        try {
                          const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
                            timeoutId = window.setTimeout(() => {
                              resolve({ data: null, error: new Error("Le test a expiré. Réessayez.") });
                            }, 10000);
                          });

                          const { data: fnData, error: fnError } = await Promise.race([
                            supabase.functions.invoke("check-iframe-blocked", {
                              body: { url: testUrl },
                            }),
                            timeoutPromise,
                          ]);

                          if (timeoutId) window.clearTimeout(timeoutId);
                          sonnerToast.dismiss(loadingToastId);

                          if (fnError) throw fnError;

                          if (fnData?.blocked) {
                            sonnerToast.error("🚫 iframe bloquée", {
                              description: `${fnData.reason}${fnData.httpStatus ? ` (HTTP ${fnData.httpStatus})` : ""}`,
                              duration: 8000,
                            });
                          } else {
                            sonnerToast.success("✅ iframe OK", {
                              description: `Ce site autorise l'affichage en iframe.${fnData?.httpStatus ? ` (HTTP ${fnData.httpStatus})` : ""}`,
                              duration: 8000,
                            });
                          }
                        } catch (err: any) {
                          if (timeoutId) window.clearTimeout(timeoutId);
                          sonnerToast.dismiss(loadingToastId);
                          sonnerToast.error("Erreur", {
                            description: err?.message || "Erreur inconnue",
                            duration: 8000,
                          });
                        }
                      }}
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <select
                value={doc.language}
                onChange={(e) => setExternalLinkDocs(prev => prev.map((d, i) => i === idx ? { ...d, language: e.target.value } : d))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-28 shrink-0"
              >
                <option value="">Langue</option>
                {LANGUAGE_OPTIONS.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" title="Supprimer" onClick={() => setExternalLinkDocs(prev => prev.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <select
                value={doc.description}
                onChange={(e) => setExternalLinkDocs(prev => prev.map((d, i) => i === idx ? { ...d, description: e.target.value } : d))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-32 shrink-0"
                title="Titre section"
              >
                <option value="presse">Presse</option>
                <option value="media">Media</option>
                <option value="partenaires">Partenaires</option>
                <option value="recompenses">Récompenses</option>
                <option value="certifications">Certifications</option>
              </select>
                </SortableDocRow>
              ))}
            </SortableContext>
          </DndContext>
          {externalLinkDocs.length === 0 && <p className="text-xs text-muted-foreground">Aucun lien externe ajouté.</p>}
        </div>

        {/* Videos (multiple) */}
        <div id="section-images" className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg" style={{ scrollMarginTop: '160px' }}>
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-base font-semibold">🎬 Vidéos</Label>
              <div className="flex items-center gap-2">
                <Switch checked={formData.show_videos} onCheckedChange={(checked) => { handleChange("show_videos", checked); handleChange("prioritize_images", !checked); }} />
                <span className="text-xs text-muted-foreground">{formData.show_videos ? "Activé" : "Désactivé"} — Active le Carrousel vidéo</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Switch checked={formData.default_sound_on} onCheckedChange={(checked) => handleChange("default_sound_on", checked)} />
                <span className="text-xs text-muted-foreground">🔊 Son {formData.default_sound_on ? "activé" : "désactivé"} par défaut</span>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setVideoDocs(prev => [...prev, { url: "", name: "", poi_id: null, destination_id: null, linked_business_id: null, subcategory_id: null, city: null, neighborhood: null, description: null, price: null, price_type: null, thumbnail_url: null }])}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </div>
          {/* Drop zone for multiple video files */}
          <div
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-primary", "bg-primary/5");
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("video/"));
              if (files.length === 0) return;
              for (const file of files) {
                if (file.size > 100 * 1024 * 1024) { toast({ variant: "destructive", title: "Fichier trop volumineux", description: `${file.name} dépasse 100MB` }); continue; }
                const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
                const fileName = `${business?.id || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const path = `businesses/${fileName}`;
                const { error } = await supabase.storage.from("business-videos").upload(path, file, { cacheControl: "3600", upsert: false });
                if (error) { toast({ variant: "destructive", title: "Erreur", description: `${file.name}: ${error.message}` }); continue; }
                const { data: urlData } = supabase.storage.from("business-videos").getPublicUrl(path);
                if (urlData?.publicUrl) {
                   setVideoDocs(prev => [...prev, { url: urlData.publicUrl, name: "", poi_id: null, destination_id: null, linked_business_id: null, subcategory_id: null, city: null, neighborhood: null, description: null, price: null, price_type: null, thumbnail_url: null }]);
                }
              }
              toast({ title: `${files.length} vidéo(s) uploadée(s) ✓` });
            }}
            className="border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer hover:border-primary/50"
          >
            <input type="file" accept="video/mp4,video/webm,video/quicktime" multiple id="video-drop-multi" className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                for (const file of files) {
                  if (file.size > 100 * 1024 * 1024) { toast({ variant: "destructive", title: "Fichier trop volumineux", description: `${file.name} dépasse 100MB` }); continue; }
                  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
                  const fileName = `${business?.id || "new"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                  const path = `businesses/${fileName}`;
                  const { error } = await supabase.storage.from("business-videos").upload(path, file, { cacheControl: "3600", upsert: false });
                  if (error) { toast({ variant: "destructive", title: "Erreur", description: `${file.name}: ${error.message}` }); continue; }
                  const { data: urlData } = supabase.storage.from("business-videos").getPublicUrl(path);
                  if (urlData?.publicUrl) {
                    setVideoDocs(prev => [...prev, { url: urlData.publicUrl, name: "", poi_id: null, destination_id: null, linked_business_id: null, subcategory_id: null, city: null, neighborhood: null, description: null, price: null, price_type: null, thumbnail_url: null }]);
                  }
                }
                toast({ title: `${files.length} vidéo(s) uploadée(s) ✓` });
                e.target.value = "";
              }}
            />
            <label htmlFor="video-drop-multi" className="cursor-pointer flex flex-col items-center gap-1">
              <div className="p-2 bg-primary/10 rounded-full"><Upload className="h-4 w-4 text-primary" /></div>
              <p className="text-xs font-medium">Glissez-déposez ou cliquez pour uploader des vidéos</p>
              <p className="text-[10px] text-muted-foreground">MP4, WebM, MOV • Max 100MB • Plusieurs fichiers acceptés</p>
            </label>
          </div>
          {/* Legacy video_1_url */}
          {formData.video_1_url && (
            <div className="space-y-1 p-3 border rounded-md bg-background">
              <p className="text-xs text-muted-foreground">Vidéo principale (ancien champ)</p>
              <VideoUploader
                videoUrl={formData.video_1_url}
                onChange={(url) => handleChange("video_1_url", url)}
                businessId={business?.id}
              />
            </div>
          )}
          {/* Grid 4 columns — drag & drop */}
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                setVideoDocs(prev => {
                  const oldIdx = prev.findIndex((_, i) => `video-${i}` === active.id);
                  const newIdx = prev.findIndex((_, i) => `video-${i}` === over.id);
                  if (oldIdx === -1 || newIdx === -1) return prev;
                  const copy = [...prev];
                  const [moved] = copy.splice(oldIdx, 1);
                  copy.splice(newIdx, 0, moved);
                  return copy;
                });
              }
            }}
          >
            <SortableContext items={videoDocs.map((_, i) => `video-${i}`)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-2">
                {videoDocs.map((doc, idx) => (
                  <SortableVideoCard
                    key={`video-${idx}`}
                    id={`video-${idx}`}
                    doc={doc}
                    idx={idx}
                    videoDocs={videoDocs}
                    setVideoDocs={setVideoDocs}
                    poiBusinessesForCity={poiBusinessesForCity}
                    dbDestinations={dbDestinations}
                    allBusinessesForVideo={allBusinessesForVideo}
                    videoBusinessSearch={videoBusinessSearch}
                    setVideoBusinessSearch={setVideoBusinessSearch}
                    dbSubcategories={dbSubcategories}
                    dbCities={dbCities}
                    dbNeighborhoods={dbNeighborhoods}
                    business={business}
                    toast={toast}
                    onOpenDesc={() => setVideoDescDialogIdx(idx)}
                    onDelete={() => setVideoDeleteConfirmIdx(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {!formData.video_1_url && videoDocs.length === 0 && <p className="text-xs text-muted-foreground">Aucune vidéo ajoutée.</p>}

          {/* Rich text description dialog */}
          <Dialog open={videoDescDialogIdx !== null} onOpenChange={(open) => { if (!open) setVideoDescDialogIdx(null); }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="shrink-0">Description vidéo {videoDescDialogIdx !== null ? `#${videoDescDialogIdx + 1}` : ""}</DialogTitle>
                  {videoDescDialogIdx !== null && (
                    <>
                      <Input
                        placeholder="Prix (ex: 150 MAD)"
                        value={videoDocs[videoDescDialogIdx]?.price || ""}
                        onChange={(e) => setVideoDocs(prev => prev.map((d, i) => i === videoDescDialogIdx ? { ...d, price: e.target.value || null } : d))}
                        className="h-8 text-sm w-[260px]"
                      />
                      <Select value={videoDocs[videoDescDialogIdx]?.price_type || "__empty__"} onValueChange={(val) => setVideoDocs(prev => prev.map((d, i) => i === videoDescDialogIdx ? { ...d, price_type: val === "__empty__" ? null : val } : d))}>
                        <SelectTrigger className="h-8 text-sm w-[140px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">—</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                          <SelectItem value="vente">Vente</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </DialogHeader>
              {videoDescDialogIdx !== null && (
                <div className="space-y-2">
                  <RichTextEditor
                    content={videoDocs[videoDescDialogIdx]?.description || ""}
                    onChange={(val) => {
                      const trimmed = val.slice(0, 2000);
                      setVideoDocs(prev => prev.map((d, i) => i === videoDescDialogIdx ? { ...d, description: trimmed } : d));
                    }}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(videoDocs[videoDescDialogIdx]?.description || "").replace(/<[^>]*>/g, "").length} / 2000 caractères
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button type="button" onClick={() => setVideoDescDialogIdx(null)}>Sauvegarder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete confirmation dialog */}
          <AlertDialog open={videoDeleteConfirmIdx !== null} onOpenChange={(open) => { if (!open) setVideoDeleteConfirmIdx(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette vidéo ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. La vidéo {videoDeleteConfirmIdx !== null ? `#${videoDeleteConfirmIdx + 1}` : ""} sera supprimée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setVideoDocs(prev => prev.filter((_, i) => i !== videoDeleteConfirmIdx)); setVideoDeleteConfirmIdx(null); }}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Matterport */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Visite virtuelle 3D (Matterport)</Label>
          <Input
            placeholder="https://my.matterport.com/show/?m=..."
            value={formData.matterport_url}
            onChange={(e) => handleChange("matterport_url", e.target.value)}
          />
        </div>



        {/* Images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Images (max 30)</Label>
            <div className="flex items-center gap-2">
              <Switch checked={formData.prioritize_images} onCheckedChange={(checked) => { handleChange("prioritize_images", checked); handleChange("show_videos", !checked); }} />
              <span className="text-xs text-muted-foreground">Prioriser les images en fond de fiche produit</span>
            </div>
          </div>
          <ImageUploader
            images={formData.images}
            onChange={(images) => handleChange("images", images)}
            maxImages={30}
            businessId={business?.id}
          />
        </div>
        {/* Labels */}
        <Accordion type="single" collapsible>
          <AccordionItem value="labels" className="border-none">
            <div className="p-4 bg-muted rounded-lg">
              <AccordionTrigger className="py-0 hover:no-underline">
                <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                  <Award className="h-4 w-4" />
                  Labels / Certifications
                  {businessLabels.length > 0 && (
                    <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0 text-[10px] font-semibold">{businessLabels.length}</span>
                  )}
                </Label>
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-0">
                <BusinessLabelsEditor
                  businessId={business?.id}
                  value={businessLabels}
                  onChange={setBusinessLabels}
                />
              </AccordionContent>
            </div>
          </AccordionItem>
        </Accordion>

        {/* ═══════ Réseaux sociaux ═══════ */}
        <div id="section-social" className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4" style={{ scrollMarginTop: '160px' }}>
          <div className="flex items-center justify-between">
            <Label className="text-xl font-semibold">Réseaux sociaux</Label>
            <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setShowClearSocial(true)}>
              <Trash2 className="h-3 w-3 mr-1" /> Tout effacer
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "facebook_url", label: "Facebook", icon: <FacebookIcon className="text-[#1877F2]" />, placeholder: "https://facebook.com/..." },
              { key: "instagram_url", label: "Instagram", icon: <InstagramIcon className="text-[#E4405F]" />, placeholder: "https://instagram.com/..." },
              { key: "twitter_url", label: "Twitter / X", icon: <TwitterIcon />, placeholder: "https://x.com/..." },
              { key: "linkedin_url", label: "LinkedIn", icon: <LinkedInIcon className="text-[#0A66C2]" />, placeholder: "https://linkedin.com/..." },
              { key: "youtube_url", label: "YouTube", icon: <YouTubeIcon className="text-[#FF0000]" />, placeholder: "https://youtube.com/..." },
              { key: "tiktok_url", label: "TikTok", icon: <TikTokIcon />, placeholder: "https://tiktok.com/@..." },
              { key: "pinterest_url", label: "Pinterest", icon: <PinterestIcon className="text-[#E60023]" />, placeholder: "https://pinterest.com/..." },
              { key: "vimeo_url", label: "Vimeo", icon: <VimeoIcon className="text-[#1AB7EA]" />, placeholder: "https://vimeo.com/..." },
            ].map(({ key, label, icon, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="flex items-center gap-2 text-sm">
                  {icon}
                  {(formData as any)[key] ? (
                    <a href={(formData as any)[key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{label} ↗</a>
                  ) : label}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={(formData as any)[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1"
                  />
                  {(formData as any)[key] && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive px-2" onClick={() => handleChange(key, "")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <SocialPostsEditor businessId={business?.id || ""} />
        </div>

        {/* ═══════ Plateformes de réservation ═══════ */}
        <div id="section-booking" className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4" style={{ scrollMarginTop: '160px' }}>
          <div className="flex items-center justify-between">
            <Label className="text-xl font-semibold">Plateformes de réservation</Label>
            <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setShowClearBooking(true)}>
              <Trash2 className="h-3 w-3 mr-1" /> Tout effacer
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "tripadvisor_url", label: "TripAdvisor", icon: <TripAdvisorIcon className="text-[#34E0A1]" />, placeholder: "https://tripadvisor.com/..." },
              { key: "booking_url", label: "Booking.com", icon: <BookingIcon className="text-[#003580]" />, placeholder: "https://booking.com/..." },
              { key: "airbnb_url", label: "Airbnb", icon: <AirbnbIcon className="text-[#FF5A5F]" />, placeholder: "https://airbnb.com/..." },
              { key: "hotels_com_url", label: "Hotels.com", placeholder: "https://hotels.com/..." },
              { key: "trivago_url", label: "Trivago", placeholder: "https://trivago.com/..." },
              { key: "getyourguide_url", label: "GetYourGuide", placeholder: "https://getyourguide.com/..." },
              { key: "viator_url", label: "Viator", placeholder: "https://viator.com/..." },
              { key: "tourradar_url", label: "TourRadar", placeholder: "https://tourradar.com/..." },
            ].map(({ key, label, icon, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="flex items-center gap-2 text-sm">
                  {icon || null}
                  {(formData as any)[key] ? (
                    <a href={(formData as any)[key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{label} ↗</a>
                  ) : label}
                </Label>
                <div className="flex gap-1">
                  <Input value={(formData as any)[key] || ""} onChange={(e) => handleChange(key, e.target.value)} placeholder={placeholder} className="flex-1" />
                  {(formData as any)[key] && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleChange(key, "")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-sm">Autre plateforme</Label>
              <div className="flex gap-2">
                <Input value={(formData as any).other_booking_name || ""} onChange={(e) => handleChange("other_booking_name", e.target.value)} placeholder="Nom" className="w-32" />
                <Input value={(formData as any).other_booking_url || ""} onChange={(e) => handleChange("other_booking_url", e.target.value)} placeholder="URL" className="flex-1" />
                {(formData as any).other_booking_url && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={() => { handleChange("other_booking_name", ""); handleChange("other_booking_url", ""); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm"><img src={glovoLogo} alt="Glovo" className="h-4 w-4 object-contain" /> Glovo</Label>
              <div className="flex gap-1">
                <Input value={(formData as any).glovo_url || ""} onChange={(e) => handleChange("glovo_url", e.target.value)} placeholder="https://glovoapp.com/..." className="flex-1" />
                {(formData as any).glovo_url && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleChange("glovo_url", "")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ Avis clients ═══════ */}
        <div id="section-avis" className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-4" style={{ scrollMarginTop: '160px' }}>
          <Label className="text-xl font-semibold">Avis clients</Label>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Note manuelle (/20)</Label>
            <div className="flex items-center gap-3">
              <Input type="number" step="0.1" min="0" max="20" value={(formData as any).rating || ""} onChange={(e) => handleChange("rating", e.target.value)} placeholder="Ex: 16.5" className="w-32" />
              {(() => {
                const fd = formData as any;
                const { avg, total } = computeReviewsFromForm(fd);
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {avg !== null && (
                      <span className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        Calculée : {avg}/20 ({total} avis)
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFetchReviewsAndSaveCalculation}
                      disabled={isReviewCalcLoading || !business?.id}
                    >
                      {isReviewCalcLoading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Récupérer les avis &amp; sauvegarder
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { urlKey: "google_reviews_url", ratingKey: "google_rating", countKey: "google_review_count", label: "Google", icon: <GoogleMapsIcon className="text-[#4285F4]" /> },
              { urlKey: "tripadvisor_review_url", ratingKey: "tripadvisor_rating", countKey: "tripadvisor_review_count", label: "TripAdvisor", icon: <TripAdvisorIcon className="text-[#34E0A1]" /> },
              { urlKey: "restaurant_guru_url", ratingKey: "restaurant_guru_rating", countKey: "restaurant_guru_review_count", label: "Restaurant Guru", icon: <img src={restaurantGuruLogo} alt="RG" className="h-4 w-4 object-contain" /> },
              { urlKey: "getyourguide_url", ratingKey: "getyourguide_rating", countKey: "getyourguide_review_count", label: "GetYourGuide" },
              { urlKey: "viator_url", ratingKey: "viator_rating", countKey: "viator_review_count", label: "Viator" },
              { urlKey: "tourradar_url", ratingKey: "tourradar_rating", countKey: "tourradar_review_count", label: "TourRadar" },
              { urlKey: "avis_verifies_url", ratingKey: "avis_verifies_rating", countKey: "avis_verifies_review_count", label: "Avis Vérifiés" },
              { urlKey: "trustpilot_url", ratingKey: "trustpilot_rating", countKey: "trustpilot_review_count", label: "Trustpilot" },
              { urlKey: "kayak_url", ratingKey: "kayak_rating", countKey: "kayak_review_count", label: "Kayak" },
            ].map(({ urlKey, ratingKey, countKey, label, icon }) => (
              <div key={ratingKey} className="p-3 border rounded-lg bg-white/50 space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">{icon || null} {label}</Label>
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <Input value={(formData as any)[urlKey] || ""} onChange={(e) => handleChange(urlKey, e.target.value)} placeholder="URL avis" className="text-xs flex-1" />
                    {(formData as any)[urlKey] && (
                      <>
                        <a href={(formData as any)[urlKey]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-primary shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => { handleChange(urlKey, ""); handleChange(ratingKey as any, ""); handleChange(countKey as any, ""); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" step="0.1" min="0" max="5" value={(formData as any)[ratingKey] ?? ""} onChange={(e) => handleChange(ratingKey as any, e.target.value)} placeholder="Note /5" className="w-20 text-xs" />
                    <Input type="number" min="0" value={(formData as any)[countKey] ?? ""} onChange={(e) => handleChange(countKey as any, e.target.value)} placeholder="Nb avis" className="w-20 text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════ Engagements ═══════ */}
        <div id="section-services" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-4" style={{ scrollMarginTop: '160px' }}>
          <Label className="text-xl font-semibold">Engagements, Certifications & Commodités</Label>
          <div className="space-y-2">
            <Label className="text-base font-semibold">🏅 Certifications</Label>
            <div className="flex flex-wrap gap-2">
              {allCustomCerts.map((cert) => {
                const isChecked = ((formData as any).engagements || []).includes(`Certification:${cert}`);
                return (
                  <label key={cert} className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors">
                    <input type="checkbox" checked={isChecked} onChange={() => {
                      const engs = [...((formData as any).engagements || [])];
                      const val = `Certification:${cert}`;
                      handleChange("engagements", isChecked ? engs.filter((e: string) => e !== val) : [...engs, val]);
                    }} className="h-4 w-4 rounded border-input" />
                    <span className="text-sm">{cert}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Input id="input-add-cert" placeholder="Ajouter une certification..." className="h-8 text-sm flex-1 max-w-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val) { setQuickAddDialog({ type: "certification", value: val }); (e.target as HTMLInputElement).value = ""; } } }} />
              <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={() => { const el = document.getElementById("input-add-cert") as HTMLInputElement; const val = el?.value.trim(); if (val) { setQuickAddDialog({ type: "certification", value: val }); el.value = ""; } }}><Plus className="h-3.5 w-3.5 mr-1" /> Créer</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">🌱 Engagements RSE</Label>
            <div className="flex flex-wrap gap-2">
              {allCustomEngs.map((eng) => {
                const isChecked = ((formData as any).engagements || []).includes(eng);
                return (
                  <label key={eng} className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors">
                    <input type="checkbox" checked={isChecked} onChange={() => {
                      const engs = [...((formData as any).engagements || [])];
                      handleChange("engagements", isChecked ? engs.filter((e: string) => e !== eng) : [...engs, eng]);
                    }} className="h-4 w-4 rounded border-input" />
                    <span className="text-sm">{eng}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Input id="input-add-eng" placeholder="Ajouter un engagement..." className="h-8 text-sm flex-1 max-w-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val) { setQuickAddDialog({ type: "engagement", value: val }); (e.target as HTMLInputElement).value = ""; } } }} />
              <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={() => { const el = document.getElementById("input-add-eng") as HTMLInputElement; const val = el?.value.trim(); if (val) { setQuickAddDialog({ type: "engagement", value: val }); el.value = ""; } }}><Plus className="h-3.5 w-3.5 mr-1" /> Créer</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">📦 Commodités / Logistique</Label>
            <div className="flex flex-wrap gap-2">
              {allCustomCommodites.map((com) => {
                const isChecked = ((formData as any).engagements || []).includes(`Logistique:${com}`);
                return (
                  <label key={com} className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors">
                    <input type="checkbox" checked={isChecked} onChange={() => {
                      const engs = [...((formData as any).engagements || [])];
                      const val = `Logistique:${com}`;
                      handleChange("engagements", isChecked ? engs.filter((e: string) => e !== val) : [...engs, val]);
                    }} className="h-4 w-4 rounded border-input" />
                    <span className="text-sm">{com}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Input id="input-add-comm" placeholder="Ajouter une commodité..." className="h-8 text-sm flex-1 max-w-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val) { setQuickAddDialog({ type: "commodite", value: val }); (e.target as HTMLInputElement).value = ""; } } }} />
              <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={() => { const el = document.getElementById("input-add-comm") as HTMLInputElement; const val = el?.value.trim(); if (val) { setQuickAddDialog({ type: "commodite", value: val }); el.value = ""; } }}><Plus className="h-3.5 w-3.5 mr-1" /> Créer</Button>
            </div>
          </div>
          {((formData as any).engagements || []).length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Engagements sélectionnés ({((formData as any).engagements || []).length})</Label>
              <div className="flex flex-wrap gap-1">
                {((formData as any).engagements || []).map((eng: string) => (
                  <Badge key={eng} variant="secondary" className="text-xs">
                    {eng}
                    <button type="button" onClick={() => handleChange("engagements", ((formData as any).engagements || []).filter((e: string) => e !== eng))} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Badges ═══════ */}
        <div id="section-badges" className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4" style={{ scrollMarginTop: '160px' }}>
          <Label className="text-xl font-semibold">Badges</Label>
          <div className="space-y-2">
            <Label className="text-base font-semibold">🏷️ Badges assignés ({selectedBadgeIds.length})</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {availableBadges.map(badge => {
                const isChecked = selectedBadgeIds.includes(badge.id);
                const isDefault = defaultBadgeId === badge.id;
                return (
                  <div key={badge.id} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`badge-${badge.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const next = [...selectedBadgeIds, badge.id];
                          setSelectedBadgeIds(next);
                          if (next.length === 1) setDefaultBadgeId(badge.id);
                        } else {
                          const next = selectedBadgeIds.filter(id => id !== badge.id);
                          setSelectedBadgeIds(next);
                          if (defaultBadgeId === badge.id) setDefaultBadgeId(next[0] || null);
                        }
                      }}
                    />
                    <label htmlFor={`badge-${badge.id}`} className="text-sm cursor-pointer select-none flex items-center gap-1">
                      {badge.name_fr}
                      {isChecked && (
                        <button
                          type="button"
                          className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${isDefault ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}
                          onClick={(e) => { e.preventDefault(); setDefaultBadgeId(badge.id); }}
                          title="Définir comme badge par défaut"
                        >
                          {isDefault ? '★ défaut' : '☆'}
                        </button>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div id="section-taxonomie" className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-6" style={{ scrollMarginTop: '160px' }}>
          <Label className="text-xl font-semibold">Taxonomie</Label>
          
          {/* Sous-catégories */}
          <div className="space-y-3">
            <Label>Sous-catégories</Label>
            {formData.main_category ? (
            availableSubcategories.length > 0 ? (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 p-4 border rounded-lg bg-muted/30">
                {availableSubcategories.map((subcat) => (
                  <label
                    key={subcat}
                    className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors break-inside-avoid"
                  >
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(subcat)}
                      onChange={() => handleCategoryToggle(subcat)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{subcat}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Aucune sous-catégorie disponible pour cette catégorie.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Sélectionnez d'abord une catégorie principale.
            </p>
          )}
          {formData.categories.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gold/10 text-gold rounded-md text-sm"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {formData.categories.length > 1 && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sous-catégorie par défaut</Label>
                    <Select
                      value={formData.categories[0] || ""}
                      onValueChange={(value) => {
                        const newCategories = [
                          value,
                          ...formData.categories.filter((c) => c !== value),
                        ];
                        handleChange("categories", newCategories);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir la sous-catégorie par défaut..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {formData.categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      La sous-catégorie par défaut sera affichée en premier sur la fiche.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.business_type || ""}
                      onValueChange={(value) => handleChange("business_type", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir le type..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Location">Location</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Vente">Vente</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.business_type && (
                      <button
                        type="button"
                        onClick={() => handleChange("business_type", "")}
                        className="text-xs text-destructive hover:underline"
                      >
                        Aucun
                      </button>
                    )}
                  </div>
                </div>
              )}
              {formData.categories.length <= 1 && (
                <div className="space-y-2 mt-3">
                  <Label>Type</Label>
                  <Select
                    value={formData.business_type || ""}
                    onValueChange={(value) => handleChange("business_type", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir le type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="Location">Location</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Vente">Vente</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.business_type && (
                    <button
                      type="button"
                      onClick={() => handleChange("business_type", "")}
                      className="text-xs text-destructive hover:underline"
                    >
                      Aucun
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Intentions accordion */}
        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="intentions" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                Intentions
                <Badge variant="outline" className="text-[10px]">
                  {intentWords.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              {intentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Add new intent */}
                  {!formData.main_category ? (
                    <p className="text-sm text-muted-foreground italic">Sélectionnez une catégorie principale pour voir les intentions.</p>
                  ) : (
                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Mot</label>
                        <Input
                          placeholder="Ex: manger, acheter…"
                          value={newIntentWord}
                          onChange={(e) => setNewIntentWord(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addIntentWord()}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="min-w-[120px]">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Catégorie</label>
                        <Badge variant="secondary" className="h-8 px-3 flex items-center text-sm">{formData.main_category}</Badge>
                      </div>
                      <Button type="button" onClick={addIntentWord} disabled={!newIntentWord.trim()} size="sm" className="h-8">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                      </Button>
                    </div>
                  )}

                  {/* Grouped by category */}
                  {(() => {
                    const grouped = intentWords.reduce<Record<string, typeof intentWords>>((acc, i) => {
                      (acc[i.category_name] = acc[i.category_name] || []).push(i);
                      return acc;
                    }, {});
                    return Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b, "fr"))
                      .map(([catName, words]) => (
                        <div key={catName} className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            {catName}
                            <Badge variant="outline" className="text-[10px]">{words.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {words.map((intent) => (
                              <div key={intent.id} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 border text-sm ${intent.is_active ? 'bg-muted/50' : 'bg-muted/20 opacity-60'}`}>
                                <span className="font-medium">{intent.word}</span>
                                <div className="flex items-center gap-1 ml-1">
                                  <Switch
                                    checked={intent.is_active}
                                    onCheckedChange={(checked) => updateIntentWord(intent.id, { is_active: checked })}
                                    className="scale-75"
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    {intent.is_active ? "Online" : "Offline"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteIntentWord(intent.id, intent.word)}
                                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                  })()}

                  {intentWords.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">Aucun mot d'intention.</p>
                  )}
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Services</Label>
            {formData.services.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChange("services", [])}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer tous les services
              </Button>
            )}
          </div>
          {formData.main_category ? (
            servicesGroupedBySubcategory.length > 0 ? (
              servicesGroupedBySubcategory.length === 1 ? (
                // Single subcategory: no tabs needed
                <div>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const toAdd = servicesGroupedBySubcategory[0].services.filter(s => !formData.services.includes(s));
                        if (toAdd.length > 0) setFormData(prev => ({ ...prev, services: [...prev.services, ...toAdd] }));
                      }}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                    >
                      ✅ Tout sélectionner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const groupSet = new Set(servicesGroupedBySubcategory[0].services);
                        setFormData(prev => ({ ...prev, services: prev.services.filter(s => !groupSet.has(s)) }));
                      }}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                    >
                      ❌ Tout désélectionner
                    </button>
                  </div>
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-3 p-4 border rounded-lg bg-muted/30">
                    {servicesGroupedBySubcategory[0].services.map((service) => (
                      <label
                        key={service}
                        className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors break-inside-avoid"
                      >
                        <input
                          type="checkbox"
                          checked={formData.services.includes(service)}
                          onChange={() => handleServiceToggle(service)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="Nouveau service..."
                      className="flex-1 h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateService(servicesGroupedBySubcategory[0].subcategoryId); } }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!newServiceName.trim() || creatingService}
                      onClick={() => handleCreateService(servicesGroupedBySubcategory[0].subcategoryId)}
                    >
                      {creatingService ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ) : (
                // Multiple subcategories: tabbed display
                <Tabs defaultValue={servicesGroupedBySubcategory[0]?.subcategoryName} className="w-full">
                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50">
                    {servicesGroupedBySubcategory.map((group) => {
                      const count = group.services.filter(s => formData.services.includes(s)).length;
                      return (
                        <TabsTrigger key={group.subcategoryName} value={group.subcategoryName} className="text-sm font-medium">
                          {group.subcategoryName}
                          {count > 0 && (
                            <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0 text-[10px] font-semibold">
                              {count}
                            </span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {servicesGroupedBySubcategory.map((group) => (
                    <TabsContent key={group.subcategoryName} value={group.subcategoryName}>
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const toAdd = group.services.filter(s => !formData.services.includes(s));
                            if (toAdd.length > 0) setFormData(prev => ({ ...prev, services: [...prev.services, ...toAdd] }));
                          }}
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                        >
                          ✅ Tout sélectionner
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const groupSet = new Set(group.services);
                            setFormData(prev => ({ ...prev, services: prev.services.filter(s => !groupSet.has(s)) }));
                          }}
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                        >
                          ❌ Tout désélectionner
                        </button>
                      </div>
                      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 p-4 border rounded-lg bg-muted/30">
                        {group.services.map((service) => (
                          <label
                            key={service}
                            className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors break-inside-avoid"
                          >
                            <input
                              type="checkbox"
                              checked={formData.services.includes(service)}
                              onChange={() => handleServiceToggle(service)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm">{service}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="Nouveau service..."
                          className="flex-1 h-8 text-sm"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateService(group.subcategoryId); } }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!newServiceName.trim() || creatingService}
                          onClick={() => handleCreateService(group.subcategoryId)}
                        >
                          {creatingService ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Aucun service disponible pour cette catégorie.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Sélectionnez d'abord une catégorie principale.
            </p>
          )}
          {/* Orphan default_service warning */}
          {formData.default_service && !formData.services.includes(formData.default_service) && (
            <div className="flex items-center gap-2 mt-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <span className="text-sm text-destructive">
                ⚠️ Service par défaut orphelin : <strong>"{formData.default_service}"</strong> (absent de la liste des services)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChange("default_service", "")}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Supprimer
              </Button>
            </div>
          )}
          {formData.services.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mt-2">
                {[...formData.services].sort((a, b) => a.localeCompare(b, 'fr')).map((service) => (
                  <span
                    key={service}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm cursor-pointer ${
                      formData.default_service === service
                        ? "bg-primary text-primary-foreground ring-2 ring-primary"
                        : "bg-primary/10 text-primary"
                    }`}
                    onClick={() => handleChange("default_service", formData.default_service === service ? "" : service)}
                    title={formData.default_service === service ? "Service par défaut (cliquer pour retirer)" : "Cliquer pour définir comme service par défaut"}
                  >
                    {formData.default_service === service && "★ "}
                    {service}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleServiceToggle(service); }}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">Cliquez sur un service pour le définir comme service par défaut (★).</p>
                {formData.default_service && (
                  <button
                    type="button"
                    onClick={() => handleChange("default_service", "")}
                    className="text-xs text-destructive hover:underline"
                  >
                    Aucun
                  </button>
                )}
              </div>
              {formData.services && formData.services.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer les ${formData.services.length} services ?`)) {
                      handleChange("services", []);
                      handleChange("default_service", "");
                    }
                  }}
                  className="mt-3 flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer tous les services
                </button>
              )}

            </>
          )}
          </div>
        </div>

        <div id="section-keywords" style={{ scrollMarginTop: "140px" }} />
        <div className="space-y-2">
          <Label htmlFor="keywords">Mots-clés (séparés par virgule)</Label>
          <textarea
            id="keywords"
            value={formData.keywords}
            onChange={(e) => handleChange("keywords", e.target.value)}
            placeholder="luxe, traditionnel, médina"
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          />
        </div>

        {/* Opening Hours */}
        <div id="section-horaires" className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg" style={{ scrollMarginTop: '160px' }}>
          <Label className="text-xl font-semibold">Horaires d'ouverture</Label>
          <OpeningHoursEditor
            value={formData.opening_hours}
            onChange={(hours) => handleChange("opening_hours", hours as any)}
          />
          <div className="flex flex-col gap-2 p-3 border rounded-lg bg-white/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_open_24h}
                onChange={(e) => handleChange("is_open_24h", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Ouvert 24h/24</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_opening_hours}
                onChange={(e) => handleChange("show_opening_hours", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Afficher les horaires sur la fiche publique</span>
            </label>
          </div>
          
          {/* Vacation Dates */}
          <VacationDatesEditor
            value={formData.vacation_dates}
            onChange={(dates) => setFormData(prev => ({ ...prev, vacation_dates: dates }))}
          />
        </div>

        {/* Internal Notes - Staff Only */}
        <div id="section-notes" className="space-y-2 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" style={{ scrollMarginTop: '160px' }}>
          <div className="flex items-center justify-between">
            <Label htmlFor="internal_notes" className="text-xl font-semibold text-amber-800 dark:text-amber-200">
              Note interne (staff uniquement)
            </Label>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {formData.internal_notes.replace(/<[^>]*>/g, '').length} / 5000 caractères
            </span>
          </div>
          <RichTextEditor
            content={formData.internal_notes}
            onChange={(html) => {
              const textContent = html.replace(/<[^>]*>/g, '');
              if (textContent.length <= 5000) {
                handleChange("internal_notes", html);
              }
            }}
          />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Ces notes sont visibles uniquement par le staff et ne seront pas affichées publiquement.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gold hover:bg-gold/90 text-gold-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter sans enregistrer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-between sm:justify-between">
            <AlertDialogCancel className="bg-green-600 text-white hover:bg-green-700 hover:text-white border-none">Rester</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter sans sauvegarder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearSocial} onOpenChange={setShowClearSocial}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer les réseaux sociaux ?</AlertDialogTitle>
            <AlertDialogDescription>Tous les liens de réseaux sociaux seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleChange("facebook_url", ""); handleChange("instagram_url", ""); handleChange("twitter_url", ""); handleChange("linkedin_url", ""); handleChange("youtube_url", ""); handleChange("tiktok_url", ""); handleChange("pinterest_url", ""); handleChange("vimeo_url", ""); toast({ title: "Réseaux sociaux effacés" }); }}>Oui, effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearBooking} onOpenChange={setShowClearBooking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer les plateformes de réservation ?</AlertDialogTitle>
            <AlertDialogDescription>Tous les liens de réservation seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleChange("reserve_now_url", ""); handleChange("booking_url", ""); handleChange("tripadvisor_url", ""); handleChange("airbnb_url", ""); handleChange("hotels_com_url", ""); handleChange("trivago_url", ""); handleChange("getyourguide_url", ""); toast({ title: "Plateformes de réservation effacées" }); }}>Oui, effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearReviews} onOpenChange={setShowClearReviews}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer tous les avis ?</AlertDialogTitle>
            <AlertDialogDescription>Toutes les URLs, notes et nombres d'avis seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleChange("tripadvisor_review_url", ""); handleChange("tripadvisor_rating" as any, ""); handleChange("tripadvisor_review_count" as any, ""); handleChange("restaurant_guru_url", ""); handleChange("restaurant_guru_rating" as any, ""); handleChange("restaurant_guru_review_count" as any, ""); handleChange("google_reviews_url", ""); handleChange("google_rating" as any, ""); handleChange("google_review_count" as any, ""); toast({ title: "Avis clients effacés" }); }}>Oui, effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
};

export default BusinessForm;
