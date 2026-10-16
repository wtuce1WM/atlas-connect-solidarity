import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { resolveShowcaseTemplate } from "@/components/showcase/templates";
import { ArrowDown, CalendarDays, ExternalLink, ChevronLeft, ChevronRight, Volume2, VolumeX, Loader2, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { trackBusinessEvent } from "@/lib/businessAnalytics";
import { Button } from "@/components/ui/button";
import HScroll from "@/components/HScroll";
import FullscreenLightbox from "@/components/FullscreenLightbox";
import DocumentOverlay from "@/components/overlays/DocumentOverlay";
import { whatsappUrl } from "@/lib/phoneUtils";
import { WidgetFrame } from "@/pages/Widgets";
import EmbedReviewsWidget, {
  type EmbedReviewItem,
  type EmbedReviewsBusiness,
} from "@/components/embed/EmbedReviewsWidget";

interface ShowcaseData {
  id: string;
  business_id: string;
  enabled: boolean;
  canonical_url: string | null;
  tagline_fr: string | null;
  tagline_en: string | null;
  tagline_ar: string | null;
  hero_image_url: string | null;
  hero_landscape_video_id: string | null;
  hero_portrait_video_id: string | null;
  hero_sound?: boolean;
  story_fr: string | null;
  story_en: string | null;
  story_ar: string | null;
  gallery_image_ids: unknown;
  testimonials: Array<{ author: string; quote: string; location?: string }>;
  cta_config: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    reserve_url?: string;
    primary_label?: string;
  };
  business?: Record<string, any>;
}

interface Highlight {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  metric_title: string | null;
  metric_title_en: string | null;
  metric_value: string | null;
  metric_value_en: string | null;
  sort_order: number;
}

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });


const ELLOHA_CONTAINER_ID = "ConstellationCalendarContainerf517f4b0-e6e9-4934-a7c9-696ac7c7532a";
const ELLOHA_WIDGET_URL = "https://reservation.elloha.com/Widget/BookingCalendar/f517f4b0-e6e9-4934-a7c9-696ac7c7532a?idoi=3e4775b2-b254-46b4-8a5a-ccd687d5178d";

const EllohaBookingCalendar = ({ language }: { language: "fr" | "en" }) => {
  const initialized = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const initialize = () => {
      if (cancelled || initialized.current) return;
      const widgetWindow = window as typeof window & {
        constellationWidgetUrlf517f4b0e6e94934a7c9696ac7c7532a?: string;
        constellationTypeModulef517f4b0e6e94934a7c9696ac7c7532a?: number;
        constellationBookingCalendarLoad?: (id: string) => void;
      };
      if (typeof widgetWindow.constellationBookingCalendarLoad !== "function") return;
      widgetWindow.constellationWidgetUrlf517f4b0e6e94934a7c9696ac7c7532a = ELLOHA_WIDGET_URL;
      widgetWindow.constellationTypeModulef517f4b0e6e94934a7c9696ac7c7532a = 2;
      widgetWindow.constellationBookingCalendarLoad(ELLOHA_CONTAINER_ID);
      initialized.current = true;
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src^="https://reservation.elloha.com/Scripts/widget-loader.min.js"]');
    if (existingScript) {
      if ((window as any).constellationBookingCalendarLoad) initialize();
      else existingScript.addEventListener("load", initialize, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://reservation.elloha.com/Scripts/widget-loader.min.js?v=42";
      script.async = true;
      script.addEventListener("load", initialize, { once: true });
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener("load", initialize);
    };
  }, []);

  return (
    <div
      id={ELLOHA_CONTAINER_ID}
      title="Riad Dar Najat"
      data-id-projet="f517f4b0e6e94934a7c9696ac7c7532a"
      className="min-h-24 w-full text-center text-primary-foreground"
    >
      {language === "en" ? "Loading…" : "Chargement en cours…"}
    </div>
  );
};

const ShowcaseSite = () => {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug?.toLowerCase();

  // PWA dédiée au business : manifeste généré à la volée (cf. script dans index.html),
  // icône et titre d'accueil propres à l'établissement tant que la page est affichée.
  const [data, setData] = useState<ShowcaseData | null>(null);
  // Modèle de vitrine : valeur enregistrée, ou ?template= pour la prévisualisation staff.
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("template");
    if (!requested) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (roles?.some((x: any) => x.role === "admin" || x.role === "staff")) setPreviewTemplate(requested);
    })();
  }, []);
  const template = resolveShowcaseTemplate(previewTemplate ?? (data as any)?.template);
  useEffect(() => {
    document.body.dataset.showcaseTemplate = template;
    return () => { delete document.body.dataset.showcaseTemplate; };
  }, [template]);
  useEffect(() => {
    // PWA : le hero passe sous la barre d'état iOS (annule le padding
    // safe-area du body) ; le header gère son propre retrait ci-dessous.
    document.body.classList.add("owm-showcase");
    return () => document.body.classList.remove("owm-showcase");
  }, []);
  useEffect(() => {
    if (!slug || !data) return;
    const icon = data.business.logo_url
      || (slug === "riad-dar-najat" ? "/pwa/riad-dar-najat/icon-180.png" : null)
      || data.hero_image_url
      || data.business.images?.[0];
    const appTitle = slug === "riad-dar-najat" ? "Dar Najat" : data.business.name;
    const pairs: [string, string, string][] = [['meta[name="apple-mobile-web-app-title"]', "content", appTitle]];
    if (icon) pairs.push(['link[rel="apple-touch-icon"]', "href", icon]);
    const restores = pairs.map(([sel, attr, val]) => {
      const el = document.head.querySelector(sel);
      if (!el) return () => {};
      const prev = el.getAttribute(attr);
      el.setAttribute(attr, val);
      return () => { if (prev !== null) el.setAttribute(attr, prev); };
    });
    return () => restores.forEach((r) => r());
  }, [slug, data]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [reviews, setReviews] = useState<EmbedReviewItem[]>([]);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantFrameRef = useRef<HTMLIFrameElement>(null);
  // Fermeture de Zitoun IA : couper toute vidéo/son encore actif dans le panneau.
  useEffect(() => {
    if (assistantOpen) return;
    try {
      const doc = assistantFrameRef.current?.contentDocument;
      doc?.querySelectorAll("video, audio").forEach((m) => (m as HTMLMediaElement).pause());
      doc?.querySelectorAll("iframe").forEach((f) => {
        f.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
      });
    } catch { /* iframe non accessible */ }
  }, [assistantOpen]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  // Blog vitrine : articles rattachés (propriétaires d'abord, puis génériques), lus dans un overlay.
  const [blogPosts, setBlogPosts] = useState<{ slug: string; title_fr: string; title_en: string | null; cover: string | null; kind: string | null }[]>([]);
  const [articleSlug, setArticleSlug] = useState<string | null>(null);
  const showcaseBusinessId = data?.business_id;
  useEffect(() => {
    if (!showcaseBusinessId) return;
    supabase
      .from("blog_posts")
      .select("slug, title_fr, title_en, cover_image_url, custom_hero_image_url, anchor_kind, sort_order")
      .eq("anchor_business_id", showcaseBusinessId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .then(({ data: rows }) => {
        const list = (rows ?? []).map((r: any) => ({ slug: r.slug, title_fr: r.title_fr, title_en: r.title_en, cover: r.custom_hero_image_url || r.cover_image_url, kind: r.anchor_kind }));
        list.sort((a, b) => (a.kind === "owner" ? 0 : 1) - (b.kind === "owner" ? 0 : 1));
        setBlogPosts(list);
      });
  }, [showcaseBusinessId]);
  const [reserveOverlayOpen, setReserveOverlayOpen] = useState(false);
  const [inlineLink, setInlineLink] = useState<{ url: string; label: string } | null>(null);
  // Popup d'accueil (image popup + titre/texte riche), même source que BookOnlineSlidePanel.
  const [welcomePopup, setWelcomePopup] = useState<{ url: string; d: any } | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [heroThumbs, setHeroThumbs] = useState<{ landscape: string | null; portrait: string | null }>({ landscape: null, portrait: null });
  const [heroVideoIds, setHeroVideoIds] = useState<{ landscape: string | null; portrait: string | null }>({ landscape: null, portrait: null });
  const [heroFiles, setHeroFiles] = useState<{ landscape: string | null; portrait: string | null }>({ landscape: null, portrait: null });
  const [promos, setPromos] = useState<Array<{ id: string; title: string; message: string; title_en: string; message_en: string; savings: number | null; currency: string | null; ptype: string | null; pvalue: number | null }>>([]);
  const [galleryVideos, setGalleryVideos] = useState<Array<{ src: string; thumb: string | null }>>([]);
  const [ytVideos, setYtVideos] = useState<Array<{ src: string; thumb: string | null }>>([]);
  const [ytIndex, setYtIndex] = useState<number | null>(null);
  const [menuDocs, setMenuDocs] = useState<Array<{ url: string; name: string; type: "pdf" | "flipbook" }>>([]);
  const [openDoc, setOpenDoc] = useState<{ url: string; name: string; type: "pdf" | "flipbook"; ts: number } | null>(null);
  const [kpSections, setKpSections] = useState<Array<{ key: string; title: string; members: Array<{ id: string; name: string; slug: string; images: string[] | null; logo_url: string | null }> }>>([]);
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== "undefined" && window.innerHeight > window.innerWidth);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, name_en, slug, city, country, address, description_fr, description_en, hook_fr, hook_en, logo_url, images, latitude, longitude, phone, email, whatsapp, facebook_url, instagram_url, pinterest_url, services, default_service, google_rating, google_review_count, google_reviews_url, google_maps_url, tripadvisor_rating, tripadvisor_review_count, tripadvisor_url, restaurant_guru_rating, restaurant_guru_review_count, restaurant_guru_url, total_review_count, computed_rating, min_price, manual_price_range, reserve_now_cta, reserve_now_url, reserve_now_force_external, online_shop_cta, url_4_cta, url_5_cta, popup_image_url, online_shop_url, online_shop_force_external, url_4, url_4_force_external, url_5, url_5_force_external, opening_hours, show_opening_hours, is_open_24h, show_youtube_tab, website, website_cta, menu_url, menu_name, flipbook_url, flipbook_name, pdf_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!biz) { setNotFound(true); setLoading(false); return; }

      const { data: showcase } = await (supabase as any)
        .from("business_showcase_site")
        .select("*")
        .eq("business_id", biz.id)
        .eq("enabled", true)
        .maybeSingle();

      if (!showcase) { setNotFound(true); setLoading(false); return; }

      const [highlightResult, reviewResult] = await Promise.all([
        supabase
          .from("front_highlights")
          .select("id,title,title_en,description,description_en,image_url,metric_title,metric_title_en,metric_value,metric_value_en,sort_order")
          .eq("business_id", biz.id)
          .order("sort_order"),
        supabase
          .from("reviews")
          .select("id,source,author_name,rating,text,text_fr,text_en,text_ar,highlight,highlight_en,is_default,is_hidden,created_at")
          .eq("business_id", biz.id)
          .eq("is_hidden", false)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      setData({ ...showcase, business: biz });
      const popupUrl = (biz as any).popup_image_url as string | null;
      if (popupUrl && Array.isArray(biz.images) && biz.images.includes(popupUrl)) {
        (supabase as any).from("business_image_titles")
          .select("title, description, title_fr, title_en, description_fr, description_en")
          .eq("business_id", biz.id).eq("image_url", popupUrl).maybeSingle()
          .then(({ data: d }: any) => {
            setWelcomePopup({ url: popupUrl, d: d || {} });
            setTimeout(() => setWelcomeOpen(true), 1000);
          });
      }

      // Groupes KP1/KP2 : membres actifs affichés si le staff a activé le toggle.
      const { data: kpBiz } = await (supabase as any).from("businesses").select("kp_regroupement,kp_regroupement_2").eq("id", biz.id).maybeSingle();
      const kpGroups: Array<{ key: string; code: string; col: string; type: string }> = [];
      if (showcase.show_kp1 && kpBiz?.kp_regroupement) kpGroups.push({ key: "kp1", code: kpBiz.kp_regroupement, col: "kp_regroupement", type: "kp1" });
      if (showcase.show_kp2 && kpBiz?.kp_regroupement_2) kpGroups.push({ key: "kp2", code: kpBiz.kp_regroupement_2, col: "kp_regroupement_2", type: "kp2" });
      const kpLoaded = await Promise.all(kpGroups.map(async (g) => {
        const [{ data: members }, { data: t }] = await Promise.all([
          (supabase as any).from("businesses").select("id,name,slug,images,logo_url").eq(g.col, g.code).eq("is_active", true).neq("id", biz.id).limit(40),
          (supabase as any).from("kp_group_titles").select("title").eq("kp_code", g.code).eq("kp_type", g.type).maybeSingle(),
        ]);
        return { key: g.key, title: t?.title || g.code, members: (members || []) as Array<{ id: string; name: string; slug: string; images: string[] | null; logo_url: string | null }> };
      }));
      setKpSections(kpLoaded.filter((s) => s.members.length > 0));

      // Offres (même source que la Full Description) et vidéos de la galerie (modèle Hero video).
      const [{ data: promoRows }, { data: docVids }, { data: ytVids }, { data: menuDocRows }] = await Promise.all([
        (supabase as any).from("affiliate_business_promotions").select("id,title,title_fr,title_en,promotion_message,promotion_message_fr,promotion_message_en,savings_amount,promotion_currency,promotion_type,promotion_value").eq("business_id", biz.id).order("sort_order", { ascending: true }),
        (supabase as any).from("business_documents").select("id,url,thumbnail_url,sort_order").eq("business_id", biz.id).eq("type", "video").order("sort_order", { ascending: true }),
        (supabase as any).from("business_youtube_videos").select("id,video_id,thumbnail,custom_thumbnail_url,sort_order").eq("business_id", biz.id).eq("is_visible", true).order("sort_order", { ascending: true }),
        (supabase as any).from("business_documents").select("id,url,name,type").eq("business_id", biz.id).in("type", ["pdf", "flipbook"]),
      ]);
      // Section « La carte » : flipbooks + PDF (champs fiche + documents), un même lien une seule fois.
      const menuList: Array<{ url: string; name: string; type: "pdf" | "flipbook" }> = [];
      const pushMenu = (url: any, name: any, type: "pdf" | "flipbook") => {
        if (typeof url === "string" && url && !menuList.some((m) => m.url === url)) menuList.push({ url, name: name || "", type });
      };
      const isPdf = (u: any) => typeof u === "string" && /\.pdf($|\?)/i.test(u);
      pushMenu((biz as any).flipbook_url, (biz as any).flipbook_name, "flipbook");
      pushMenu((biz as any).menu_url, (biz as any).menu_name, isPdf((biz as any).menu_url) ? "pdf" : "flipbook");
      ((menuDocRows || []) as any[]).forEach((d) => pushMenu(d.url, d.name, d.type === "pdf" ? "pdf" : "flipbook"));
      pushMenu((biz as any).pdf_url, null, "pdf");
      setMenuDocs(menuList);
      setPromos(((promoRows || []) as any[]).map((p) => {
        const fr = p.title_fr || p.title || "";
        const mfr = p.promotion_message_fr || p.promotion_message || "";
        return { id: p.id, title: fr, message: mfr, title_en: p.title_en || fr, message_en: p.promotion_message_en || mfr, savings: p.savings_amount, currency: p.promotion_currency, ptype: p.promotion_type, pvalue: p.promotion_value };
      }).filter((p) => p.title));
      setGalleryVideos(((docVids || []) as any[]).filter((d) => d.url).map((d) => {
        const yt = String(d.url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/)?.[1];
        return { src: d.url as string, thumb: (d.thumbnail_url as string) || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null) };
      }));
      // Section « Vidéos YouTube » : vidéos actives, uniquement si l'onglet YouTube est activé.
      setYtVideos(!(biz as any).show_youtube_tab ? [] : [
        ...((ytVids || []) as any[]).filter((v) => v.video_id).map((v) => ({ src: `https://www.youtube.com/watch?v=${v.video_id}`, thumb: (v.custom_thumbnail_url || v.thumbnail || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`) as string })),
      ]);

      // Hero : les IDs renseignés sont des IDs internes (business_youtube_videos.id) —
      // on résout leur miniature (custom_thumbnail_url prioritaire, sinon thumbnail).
      const heroIds = [showcase.hero_landscape_video_id, showcase.hero_portrait_video_id].filter(Boolean) as string[];
      if (heroIds.length > 0) {
        const { data: vids } = await (supabase as any)
          .from("business_youtube_videos")
          .select("id,video_id,thumbnail,custom_thumbnail_url")
          .in("id", heroIds);
        const byId = new Map<string, { thumb: string | null; yt: string | null }>(
          ((vids || []) as Array<{ id: string; video_id: string; thumbnail: string | null; custom_thumbnail_url: string | null }>)
            .map((v) => [v.id, { thumb: v.custom_thumbnail_url || v.thumbnail, yt: v.video_id || null }])
        );
        setHeroThumbs({
          landscape: showcase.hero_landscape_video_id ? byId.get(showcase.hero_landscape_video_id)?.thumb || null : null,
          portrait: showcase.hero_portrait_video_id ? byId.get(showcase.hero_portrait_video_id)?.thumb || null : null,
        });
        setHeroVideoIds({
          landscape: showcase.hero_landscape_video_id ? byId.get(showcase.hero_landscape_video_id)?.yt || null : null,
          portrait: showcase.hero_portrait_video_id ? byId.get(showcase.hero_portrait_video_id)?.yt || null : null,
        });
        // Vidéos importées (business_documents) : lecture directe du fichier.
        const { data: docs } = await (supabase as any)
          .from("business_documents")
          .select("id,url,thumbnail_url")
          .in("id", heroIds);
        const docById = new Map<string, { url: string; thumb: string | null }>(
          ((docs || []) as Array<{ id: string; url: string; thumbnail_url: string | null }>).map((d) => [d.id, { url: d.url, thumb: d.thumbnail_url }])
        );
        const lf = showcase.hero_landscape_video_id ? docById.get(showcase.hero_landscape_video_id) : undefined;
        const pf = showcase.hero_portrait_video_id ? docById.get(showcase.hero_portrait_video_id) : undefined;
        setHeroFiles({ landscape: lf?.url || null, portrait: pf?.url || null });
        if (lf?.thumb || pf?.thumb) setHeroThumbs((p) => ({ landscape: p.landscape || lf?.thumb || null, portrait: p.portrait || pf?.thumb || null }));
      }
      setHighlights((((highlightResult.data || []) as unknown) as Highlight[]).filter((item) =>
        Boolean(item.title?.trim() || item.description?.trim() || item.image_url)
      ));
      setReviews((reviewResult.data || []).map((review: any) => ({
        id: review.id,
        source: review.source,
        author_name: review.author_name,
        rating: review.rating,
        text: review.text || null,
        text_fr: review.text_fr || review.text || null,
        text_en: review.text_en,
        text_ar: review.text_ar,
        highlight: review.highlight || null,
        highlight_en: review.highlight_en || null,
        is_default: review.is_default,
      })).filter((review) => review.text_fr || review.text_en || review.text));
      setLoading(false);
      trackBusinessEvent(biz.id, "view", { subtype: "showcase" });
    };
    load();
  }, [slug]);

  useEffect(() => {
    const closeAssistant = () => setAssistantOpen(false);
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "owm-embed-close") closeAssistant();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAssistant();
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!assistantOpen) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : previousBodyPaddingRight;

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [assistantOpen]);

  const business = data?.business;
  const openAvailability = useCallback(() => {
    trackBusinessEvent(business?.id, "booking_intent", { subtype: "showcase" });
    scrollToId("availability");
  }, [business?.id]);

  const gallery = useMemo<string[]>(() => {
    // Hero : toutes les images du business dans leur ordre (sort-order), sans l'image Hero du back-office.
    const source: string[] = Array.isArray(business?.images) ? business.images.filter((value: unknown): value is string => typeof value === "string") : [];
    return [...new Set(source.filter(Boolean))];
  }, [business?.images]);
  const [heroIndex, setHeroIndex] = useState(0);
  // Hero video : vidéo interne n°1 (sort_order), hors liens YouTube.
  const heroVideoFile = useMemo(() => galleryVideos.find((v) => !/youtu\.?be/i.test(v.src))?.src || null, [galleryVideos]);
  const [heroMuted, setHeroMuted] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    // Son activé : tentative de lecture avec son ; si le navigateur refuse, on reste muet (bouton visible).
    const el = heroVideoRef.current;
    if (!el || !data?.hero_sound) return;
    el.muted = false;
    el.play().then(() => setHeroMuted(false)).catch(() => { el.muted = true; setHeroMuted(true); el.play().catch(() => {}); });
  }, [heroVideoFile, data?.hero_sound]);

  // Galerie (les deux modèles) : vidéos du business uniquement (internes + liens YouTube), les images sont dans le Hero.
  const galleryItems = useMemo<Array<{ type: "image" | "video"; src: string; thumb: string | null }>>(
    () => galleryVideos.map((v) => ({ type: "video" as const, src: v.src, thumb: v.thumb })),
    [galleryVideos]);
  const galleryOpen = galleryIndex !== null;
  useEffect(() => {
    if (!galleryOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryIndex(null);
      if (galleryItems.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setGalleryIndex((index) => index === null ? null : (index + direction + galleryItems.length) % galleryItems.length);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryOpen, galleryItems.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-showcase-night text-primary-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-showcase-night text-primary-foreground flex-col gap-4">
        <p className="text-lg">Site vitrine introuvable.</p>
        <Link to="/" className="text-primary underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const b = data.business;
  if (!b) return null;
  const isEn = language === "en";
  const isRiad = /\briy?ad\b/i.test(String(data?.business?.name ?? ""));
  const venueEn = isRiad ? "riad" : "property";
  // Libellé de la section « highlights » selon le type d'établissement (services de la fiche).
  const svc = (Array.isArray(data?.business?.services) ? data.business.services : []).join(" ").toLowerCase();
  const isLodging = isRiad || /room service|maison d.h[oô]tes|palace|petit-d[ée]jeuner|h[oô]tel|chambre/.test(svc);
  const isRestaurant = !isLodging && /d[îi]ner|d[ée]jeuner|cuisine|menu|restaurant|brunch/.test(svc);
  const roomsLabel = isLodging ? (isEn ? "Rooms" : "Chambres") : isRestaurant ? (isEn ? "Menu" : "La carte") : (isEn ? "Services" : "Prestations");
  const roomsTitle = isLodging ? (isEn ? "Our rooms" : "Nos chambres") : isRestaurant ? (isEn ? "Our menu" : "Notre carte") : (isEn ? "Our services" : "Nos prestations");
  const roomsEyebrow = isLodging ? (isEn ? `Sleep at ${data?.business?.name ?? ""}` : `Dormir à ${data?.business?.name ?? ""}`) : (isEn ? `At ${data?.business?.name ?? ""}` : `Chez ${data?.business?.name ?? ""}`);
  const menuLabel = highlights.length > 0 && isRestaurant ? (isEn ? "Menus" : "Menus") : (isEn ? "Menu" : "La carte");
  const tagline = (isEn ? data.tagline_en || b.hook_en : data.tagline_fr || b.hook_fr) || "";
  const story = (isEn ? data.story_en || b.description_en : data.story_fr || b.description_fr) || "";
  const heroLandscape = heroThumbs.landscape;
  const heroPortrait = heroThumbs.portrait;
  const heroVideo = isPortrait
    ? heroVideoIds.portrait || heroVideoIds.landscape
    : heroVideoIds.landscape || heroVideoIds.portrait;
  const heroFile = isPortrait ? heroFiles.portrait || heroFiles.landscape : heroFiles.landscape || heroFiles.portrait;
  const heroMedia = heroLandscape || data.hero_image_url || gallery[0];
  const canonicalUrl = data.canonical_url || `https://oneworldmorocco.com/site/${slug}`;
  const primaryCta = data.cta_config?.primary_label || (isEn ? "Book your stay" : "Réserver votre séjour");
  const whatsapp = data.cta_config?.whatsapp || b.whatsapp;
  const phone = data.cta_config?.phone || b.phone;
  const email = data.cta_config?.email || b.email;
  // Bouton Réserver toujours affiché dès qu'un lien existe (back-office vitrine, sinon lien de réservation de la fiche).
  const assistantName = (data.cta_config as any)?.assistant_name || "Zitoun IA";
  // Même logique que l'overlay FullDescription de BookOnlineSlidePanel : les liens URL 1 à 5
  // portent leur propre CTA ; seuls les CTA de réservation (Réservez, Réserver en ligne…) activent
  // le bouton Réserver et « Choisissez vos dates ». « Lien externe » coché → nouvel onglet, sinon iframe.
  const normCta = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const isBookingLabel = (label?: string | null) => ["reservez", "reserver en ligne", "day pass", "reserver une table", "reserver une chambre"].includes(normCta(label || ""));
  const urlCtas = ([
    [b.reserve_now_url, b.reserve_now_cta, b.reserve_now_force_external],
    [b.online_shop_url, b.online_shop_cta, b.online_shop_force_external],
    [b.url_4, b.url_4_cta, b.url_4_force_external],
    [b.url_5, b.url_5_cta, b.url_5_force_external],
  ] as Array<[string | null, string | null, boolean | null]>)
    .filter(([u, l]) => u && l)
    .map(([url, label, ext]) => ({ url: url as string, label: label as string, external: Boolean(ext) }));
  const bookingCta = urlCtas.find((c) => isBookingLabel(c.label)) || null;
  const otherCtas = urlCtas.filter((c) => !isBookingLabel(c.label) && c.url !== bookingCta?.url);
  const reserveUrl = data.cta_config?.reserve_url || bookingCta?.url || null;
  const reserveForceExternal = data.cta_config?.reserve_url ? false : Boolean(bookingCta?.external);
  const hasElloha = slug === "riad-dar-najat";
  const hasBooking = hasElloha || Boolean(reserveUrl);
  const waLink = whatsapp ? whatsappUrl(whatsapp, isEn
    ? `Hello ${b.name}, I would like to book a stay.`
    : `Bonjour ${b.name}, je souhaite réserver un séjour.`) : null;

  return (
    <>
      <Helmet>
        <title>{b.name} — {b.city || "Maroc"}</title>
        <meta name="description" content={tagline || `${b.name} — site officiel`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={b.name} />
        <meta property="og:description" content={tagline} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {data.hero_image_url && <meta property="og:image" content={data.hero_image_url} />}
      </Helmet>

      {galleryIndex !== null && (
        <FullscreenLightbox
          items={galleryItems.map((item, index) => ({ type: item.type, src: item.src, alt: `${b.name} — ${index + 1}` }))}
          currentIndex={galleryIndex}
          onIndexChange={setGalleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
      {ytIndex !== null && (
        <FullscreenLightbox
          items={ytVideos.map((v, index) => ({ type: "video" as const, src: v.src, alt: `${b.name} — YouTube ${index + 1}` }))}
          currentIndex={ytIndex}
          onIndexChange={setYtIndex}
          onClose={() => setYtIndex(null)}
        />
      )}

      <div className="min-h-screen bg-showcase-paper text-showcase-ink font-roboto pb-20 md:pb-0">
        <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-showcase-night/80 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-md text-primary-foreground shadow-md md:px-12 md:pb-5 md:pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <button onClick={() => scrollToId("top")} className="font-josefin text-sm font-semibold uppercase tracking-widest">{b.name}</button>
          <nav className="hidden items-center gap-7 text-xs font-semibold uppercase tracking-widest md:flex">
            <button onClick={() => scrollToId("story")}>{isEn ? `The ${venueEn}` : (isRiad ? "Le riad" : "L’établissement")}</button>
            {highlights.length > 0 && <button onClick={() => scrollToId("rooms")}>{roomsLabel}</button>}
            {promos.length > 0 && <button onClick={() => scrollToId("offers")}>{isEn ? "Offers" : "Offres"}</button>}
            {menuDocs.length > 0 && <button onClick={() => scrollToId("menu")}>{menuLabel}</button>}
            {galleryItems.length > 0 && <button onClick={() => scrollToId("gallery")}>{isEn ? "Gallery" : "Galerie"}</button>}
            {ytVideos.length > 0 && <button onClick={() => scrollToId("youtube")}>{isEn ? "Videos" : "Vidéos"}</button>}
            {blogPosts.length > 0 && <button onClick={() => scrollToId("blog")}>Blog</button>}
            <button onClick={() => scrollToId("location")}>{isEn ? "Location" : "Accès"}</button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(isEn ? "fr" : "en")} className="h-9 border border-primary-foreground/40 px-3 text-xs text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              {isEn ? "FR" : "EN"}
            </Button>
            {hasBooking && <Button onClick={openAvailability} size="sm" className="hidden md:inline-flex">{isEn ? "Book" : "Réserver"}</Button>}
          </div>
        </header>

        <main id="top">
          <section className="relative min-h-[92dvh] overflow-hidden bg-showcase-night">
            {gallery.length > 0 ? (
              <img key={gallery[heroIndex % gallery.length]} src={gallery[heroIndex % gallery.length]} alt={`${b.name} — ${(heroIndex % gallery.length) + 1}`} className="absolute inset-0 h-full w-full object-cover animate-fade-in" />
            ) : heroMedia && (
              <picture>
                {heroPortrait && <source media="(orientation: portrait)" srcSet={heroPortrait} />}
                <img src={heroMedia} alt={b.name} className="absolute inset-0 h-full w-full object-cover" />
              </picture>
            )}
            {template === "premium" && gallery.length > 1 && (
              <>
                <button type="button" aria-label={isEn ? "Previous image" : "Image précédente"} onClick={() => setHeroIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-showcase-night/40 p-2 text-primary-foreground backdrop-blur-md transition hover:bg-showcase-night/60 md:left-6">
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button type="button" aria-label={isEn ? "Next image" : "Image suivante"} onClick={() => setHeroIndex((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-showcase-night/40 p-2 text-primary-foreground backdrop-blur-md transition hover:bg-showcase-night/60 md:right-6">
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            {template === "hero_video" && heroVideoFile && (
              <video key={heroVideoFile} ref={heroVideoRef} src={heroVideoFile} autoPlay muted={heroMuted} loop playsInline preload="auto" aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            )}
            {template === "hero_video" && heroVideoFile && data.hero_sound && (
              <button type="button" onClick={() => setHeroMuted((m) => !m)} aria-label={heroMuted ? (isEn ? "Sound on" : "Activer le son") : (isEn ? "Sound off" : "Couper le son")}
                className="absolute bottom-6 right-20 z-20 rounded-full bg-showcase-night/40 p-3 text-primary-foreground backdrop-blur-md transition hover:bg-showcase-night/60 md:right-24">
                {heroMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-showcase-night/45 via-showcase-night/10 to-showcase-night/80" />
            <div className="relative z-10 flex min-h-[92dvh] max-w-7xl flex-col justify-end px-6 pb-16 pt-28 md:px-12 md:pb-20 lg:px-20">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{b.city} · {isEn ? "Moroccan hospitality" : "Hospitalité marocaine"}</p>
              <h1 className="max-w-4xl text-center font-josefin text-5xl font-semibold leading-[1.03] text-primary-foreground md:text-7xl md:text-left lg:text-8xl">{b.name}</h1>
              {tagline && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/85 md:text-2xl">{tagline}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                {hasBooking && <Button onClick={openAvailability} size="lg"><CalendarDays className="h-5 w-5" />{primaryCta}</Button>}
                {otherCtas.map((c) => c.external ? (
                  <Button key={c.url} asChild size="lg"><a href={c.url} target="_blank" rel="noreferrer">{c.label}<ExternalLink className="h-4 w-4" /></a></Button>
                ) : (
                  <Button key={c.url} size="lg" onClick={() => setInlineLink({ url: c.url, label: c.label })}>{c.label}</Button>
                ))}
                <Button onClick={() => scrollToId("story")} variant="outline" size="lg" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-showcase-ink">
                  {isEn ? `Discover the ${venueEn}` : (isRiad ? "Découvrir le riad" : "Découvrir l’établissement")}<ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <button onClick={() => scrollToId("story")} aria-label={isEn ? "Continue" : "Continuer"} className="absolute bottom-5 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/40 text-primary-foreground md:right-12">
                <ArrowDown className="h-5 w-5" />
              </button>
            </div>
          </section>

          {promos.length > 0 && (
            <section id="offers" className="scroll-mt-8 bg-showcase-night px-4 py-16 text-primary-foreground md:px-8 md:py-24">
              <div className="mx-auto max-w-7xl">
                <div className="px-2 md:px-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Current offers" : "En ce moment"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{isEn ? "Offers" : "Offres"}</h2></div>
                <HScroll className="scrollbar-hide mt-10 flex gap-4 overflow-x-auto pb-3 cursor-grab md:gap-6" aria-label={isEn ? "Offers" : "Offres"}>
                  {promos.map((p) => {
                    const title = isEn ? p.title_en : p.title;
                    const message = (isEn ? p.message_en : p.message).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
                    const badge = p.ptype === "percentage" && p.pvalue != null ? `-${p.pvalue}%` : p.ptype === "fixed" && p.pvalue != null ? `-${p.pvalue} ${p.currency || "MAD"}` : p.savings != null ? `-${p.savings} ${p.currency || "MAD"}` : null;
                    const link = whatsapp ? whatsappUrl(whatsapp, isEn ? `Hello ${b.name}, I am interested in the offer: ${title}` : `Bonjour ${b.name}, je suis intéressé(e) par l'offre : ${title}`) : null;
                    const inner = (
                      <>
                        {badge && <p className="inline-flex items-baseline gap-2 rounded-md bg-showcase-ink/40 px-3 py-1.5 text-xs uppercase tracking-widest">{isEn ? "Save" : "Économisez"} <span className="font-josefin text-xl font-bold text-showcase-brass">{badge}</span></p>}
                        <h3 className="mt-5 font-josefin text-2xl font-bold leading-tight md:text-3xl">{title}</h3>
                        {message && message !== title && <p className="mt-3 text-sm text-primary-foreground/70">{message}</p>}
                        {link && <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-whatsapp"><MessageCircle className="h-4 w-4" />WhatsApp</p>}
                      </>
                    );
                    const cls = "flex w-72 shrink-0 flex-col rounded-2xl border border-primary-foreground/20 bg-primary-foreground/5 p-6 text-left md:w-96";
                    return link
                      ? <a key={p.id} href={link} target="_blank" rel="noreferrer" draggable={false} onClick={() => trackBusinessEvent(data.business_id, "whatsapp_click", { subtype: "showcase_offer" })} className={cls}>{inner}</a>
                      : <div key={p.id} className={cls}>{inner}</div>;
                  })}
                </HScroll>
              </div>
            </section>
          )}

          <section id="story" className="scroll-mt-8 px-6 py-20 md:px-12 md:py-28">
            <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "A house in the Medina" : "Une maison dans la Médina"}</p>
                <h2 className="mt-4 font-josefin text-4xl font-semibold leading-tight md:text-6xl">{isEn ? "Calm behind the ochre walls" : "Le calme derrière les murs ocre"}</h2>
                <div className="mt-8 border-t border-showcase-line pt-6">
                  <EmbedReviewsWidget
                    business={b as EmbedReviewsBusiness}
                    reviews={reviews}
                    platform="all"
                    lang={language}
                    ratio="vertical"
                    size="sm"
                    fullWidth
                    surface=""
                    ink="dark"
                    frameless
                  />
                </div>
              </div>
              {story && <div className="prose prose-lg max-w-none text-showcase-copy prose-headings:font-josefin prose-headings:text-showcase-ink prose-p:leading-relaxed prose-strong:text-showcase-ink" dangerouslySetInnerHTML={{ __html: story }} />}
              {b.website && (
                <div className="lg:col-start-2">
                  <Button asChild size="lg" variant="outline">
                    <a href={b.website} target="_blank" rel="noreferrer"><ExternalLink className="h-5 w-5" />{b.website_cta || (isEn ? "Learn more" : "En savoir +")}</a>
                  </Button>
                </div>
              )}
            </div>
          </section>

          {highlights.length > 0 && (
            <section id="rooms" className="scroll-mt-8 bg-showcase-night px-6 py-20 text-primary-foreground md:px-12 md:py-28">
              <div className="mx-auto max-w-7xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{roomsEyebrow}</p>
                <h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{roomsTitle}</h2>
                <div className="mt-12 grid gap-8 md:grid-cols-2">
                  {highlights.map((room, index) => {
                    const title = (isEn ? room.title_en : room.title) || room.title || "";
                    const description = (isEn ? room.description_en : room.description) || room.description || "";
                    const metricTitle = (isEn ? room.metric_title_en : room.metric_title) || room.metric_title || "";
                    const metricValue = (isEn ? room.metric_value_en : room.metric_value) || room.metric_value || "";
                    return (
                      <article key={room.id} className={index % 2 === 1 ? "md:mt-16" : ""}>
                        {room.image_url && <img src={room.image_url} alt={title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                        <div className="border-t border-primary-foreground/20 pt-5">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-josefin text-2xl font-semibold md:text-3xl">{title}</h3>
                            {(metricTitle || metricValue) && <p className="shrink-0 text-right text-xs uppercase tracking-wider text-showcase-brass">{metricTitle}<br/><span className="text-sm font-semibold text-primary-foreground">{metricValue}</span></p>}
                          </div>
                          <div className="prose prose-sm prose-invert mt-4 max-w-none leading-relaxed text-primary-foreground/70 prose-headings:font-josefin prose-headings:text-primary-foreground prose-p:my-3 prose-strong:text-primary-foreground prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1 prose-a:text-showcase-brass" dangerouslySetInnerHTML={{ __html: description }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {menuDocs.length > 0 && (
            <section id="menu" className="scroll-mt-8 px-6 py-20 md:px-12 md:py-28">
              <div className="mx-auto max-w-6xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? `At ${b.name}` : `Chez ${b.name}`}</p>
                <h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{menuLabel}</h2>
                <div className="mt-10 flex flex-wrap gap-4">
                  {menuDocs.map((m) => (
                    <Button key={m.url} size="lg" variant={m.type === "flipbook" ? "default" : "outline"} onClick={() => setOpenDoc({ ...m, ts: Date.now() })}>
                      {m.type === "flipbook" ? (isEn ? "Browse the menu" : "Feuilleter la carte") : (isEn ? "PDF menu" : "Menu PDF")}
                    </Button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {galleryItems.length > 0 && (
            <section id="gallery" className="scroll-mt-8 px-4 py-20 md:px-8 md:py-28">
              <div className="mx-auto max-w-7xl">
                <div className="px-2 md:px-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? `Life at the ${venueEn}` : (isRiad ? "La vie au riad" : "La vie à l’établissement")}</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">Galerie</h2></div>
                <HScroll className="scrollbar-hide mt-10 flex gap-3 overflow-x-auto pb-3 cursor-grab md:gap-5" aria-label={isEn ? "Video gallery" : "Galerie vidéos"}>
                  {galleryItems.map((item, index) => (
                    <Button
                      key={item.src}
                      variant="ghost"
                      className="h-40 w-52 shrink-0 overflow-hidden rounded-lg p-0 cursor-zoom-in md:h-52 md:w-72"
                      aria-label={isEn ? `Open photo ${index + 1}` : `Ouvrir la photo ${index + 1}`}
                      onClick={() => setGalleryIndex(index)}
                    >
                      {item.thumb ? <img src={item.thumb} alt={`${b.name} — ${index + 1}`} loading="lazy" draggable={false} className="h-full w-full object-cover" /> : <video src={`${item.src}#t=0.1`} muted playsInline preload="metadata" className="pointer-events-none h-full w-full object-cover" />}
                    </Button>
                  ))}
                </HScroll>
              </div>
            </section>
          )}

          {ytVideos.length > 0 && (
            <section id="youtube" className="scroll-mt-8 px-4 py-20 md:px-8 md:py-28">
              <div className="mx-auto max-w-7xl">
                <div className="px-2 md:px-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">YouTube</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{isEn ? "YouTube videos" : "Vidéos YouTube"}</h2></div>
                <HScroll className="scrollbar-hide mt-10 flex gap-3 overflow-x-auto pb-3 cursor-grab md:gap-5" aria-label={isEn ? "YouTube videos" : "Vidéos YouTube"}>
                  {ytVideos.map((v, index) => (
                    <Button
                      key={v.src}
                      variant="ghost"
                      className="h-40 w-52 shrink-0 overflow-hidden rounded-lg p-0 cursor-zoom-in md:h-52 md:w-72"
                      aria-label={isEn ? `Play video ${index + 1}` : `Lire la vidéo ${index + 1}`}
                      onClick={() => setYtIndex(index)}
                    >
                      {v.thumb && <img src={v.thumb} alt={`${b.name} — YouTube ${index + 1}`} loading="lazy" draggable={false} className="h-full w-full object-cover" />}
                    </Button>
                  ))}
                </HScroll>
              </div>
            </section>
          )}

          {blogPosts.length > 0 && (
            <section id="blog" className="scroll-mt-8 px-4 pb-20 md:px-8 md:pb-28">
              <div className="mx-auto max-w-7xl">
                <div className="px-2 md:px-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Our recommendations" : "Nos recommandations"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">Blog</h2></div>
                <HScroll className="scrollbar-hide mt-10 flex gap-4 overflow-x-auto pb-3 cursor-grab md:gap-6" aria-label="Blog">
                  {blogPosts.map((p) => {
                    const title = (isEn && p.title_en) || p.title_fr;
                    return (
                      <button key={p.slug} onClick={() => setArticleSlug(p.slug)} className="w-64 shrink-0 text-left md:w-80">
                        <div className="h-40 overflow-hidden rounded-lg bg-showcase-night md:h-48">
                          {p.cover && <img src={p.cover} alt={title} loading="lazy" draggable={false} className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-3 font-josefin text-lg font-semibold leading-snug">{title}</p>
                      </button>
                    );
                  })}
                </HScroll>
              </div>
            </section>
          )}

          {kpSections.map((s) => (
            <section key={s.key} className="scroll-mt-8 px-4 pb-20 md:px-8 md:pb-28">
              <div className="mx-auto max-w-7xl">
                <div className="px-2 md:px-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Same group" : "Même groupe"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{s.title}</h2></div>
                <HScroll className="scrollbar-hide mt-10 flex gap-4 overflow-x-auto pb-3 cursor-grab md:gap-6" aria-label={s.title}>
                  {s.members.map((m) => {
                    const img = m.images?.[0] || m.logo_url;
                    return (
                      <a key={m.id} href={`/fiche/${m.slug}`} target="_blank" rel="noreferrer" className="w-64 shrink-0 text-left md:w-80">
                        <div className="h-40 overflow-hidden rounded-lg bg-showcase-night md:h-48">
                          {img && <img src={img} alt={m.name} loading="lazy" draggable={false} className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-3 font-josefin text-lg font-semibold leading-snug line-clamp-2">{m.name}</p>
                      </a>
                    );
                  })}
                </HScroll>
              </div>
            </section>
          ))}

          {articleSlug && (
            <div className="fixed inset-0 z-[90] bg-showcase-night">
              <iframe title="Article" src={`/embed/ask/article/${articleSlug}?showcase=1`} className="h-full w-full border-0" />
              <Button size="icon" variant="secondary" onClick={() => setArticleSlug(null)} aria-label={isEn ? "Close article" : "Fermer l'article"} className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {hasBooking && (
            <section id="availability" className="scroll-mt-8 bg-showcase-brass px-6 py-20 md:px-12 md:py-28">
              <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                 <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-ink/70">{isEn ? "Direct availability" : "Disponibilités directes"}</p><h2 className="mt-4 font-josefin text-4xl font-semibold leading-tight md:text-6xl">{isEn ? "Choose your dates" : "Choisissez vos dates"}</h2><p className="mt-5 max-w-md leading-relaxed text-showcase-ink/75">{isEn ? "Check availability for your stay." : "Vérifiez la disponibilité pour votre séjour."}</p></div>
                <div className="p-3 md:p-6">
                  {hasElloha ? (
                    <EllohaBookingCalendar language={language} />
                  ) : reserveForceExternal ? (
                    <Button asChild size="lg">
                      <a href={reserveUrl} target="_blank" rel="noreferrer" onClick={() => trackBusinessEvent(data.business_id, "booking_intent", { subtype: "showcase_reserve_url" })}>
                        <CalendarDays className="h-5 w-5" />{primaryCta}
                      </a>
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => { trackBusinessEvent(data.business_id, "booking_intent", { subtype: "showcase_reserve_url" }); setReserveOverlayOpen(true); }}>
                      <CalendarDays className="h-5 w-5" />{primaryCta}
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="px-6 py-20 md:px-12 md:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Around you" : "À proximité"}</p>
              <h2 className="mt-4 font-josefin text-4xl font-semibold md:text-6xl">{isEn ? "Nearby" : "À proximité"}</h2>
              <div className="mt-10 w-screen relative left-1/2 -translate-x-1/2">
                <style>{`@media (max-width: 640px) { #owm-frame-0rm62fk { height: 580px !important; min-height: auto !important; } }`}</style>
                <iframe
                  id="owm-frame-0rm62fk"
                  src={`https://oneworldmorocco.com/embed/nearby/${slug}?lang=${language}&bg=F7F1E8&fit=w`}
                  style={{ width: "100%", display: "block", height: 720, border: 0, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}
                  title={isEn ? `Nearby — ${b.name}` : `À proximité — ${b.name}`}
                  loading="lazy"
                  allow="geolocation"
                />
              </div>
            </div>
          </section>



          <section id="location" className="scroll-mt-8 grid bg-showcase-night text-primary-foreground lg:grid-cols-2">
            <div className="flex flex-col justify-center px-6 py-16 md:px-12 lg:px-20"><MapPin className="h-7 w-7 text-showcase-brass"/><h2 className="mt-5 font-josefin text-4xl font-semibold md:text-5xl">{isEn ? "Getting here" : "Nous trouver"}</h2><p className="mt-5 text-primary-foreground/70">{b.address}<br/>{b.city}, {b.country}</p>{(() => {
              if (b.is_open_24h) return <p className="mt-6 text-sm font-semibold text-showcase-brass">{isEn ? "Open 24/7" : "Ouvert 24h/24"}</p>;
              const hours = b.show_opening_hours !== false ? (b.opening_hours as Record<string, any> | null) : null;
              const days: Array<[string, string, string]> = [["monday","Lundi","Monday"],["tuesday","Mardi","Tuesday"],["wednesday","Mercredi","Wednesday"],["thursday","Jeudi","Thursday"],["friday","Vendredi","Friday"],["saturday","Samedi","Saturday"],["sunday","Dimanche","Sunday"]];
              if (!hours || !days.some(([k]) => hours[k])) return null;
              const todayKey = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
              const fmt = (h: any) => !h || h.closed ? (isEn ? "Closed" : "Fermé") : [h.open && h.close ? `${h.open} – ${h.close}` : "", h.open2 && h.close2 ? `${h.open2} – ${h.close2}` : ""].filter(Boolean).join(" · ") || "—";
              const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
              const toM = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + (mm || 0); };
              const inRange = (o?: string, c?: string) => { if (!o || !c) return false; const a = toM(o); let z = toM(c); if (z <= a) z += 1440; return (mins >= a && mins < z) || (mins + 1440 >= a && mins + 1440 < z); };
              const t = hours[todayKey];
              const open = t && !t.closed && (inRange(t.open, t.close) || inRange(t.open2, t.close2));
              return (
                <div className="mt-8 max-w-sm">
                  <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-showcase-brass">{isEn ? "Opening hours" : "Horaires"}<span className={open ? "text-whatsapp" : "text-primary-foreground/50"}>{open ? (isEn ? "Open" : "Ouvert") : (isEn ? "Closed" : "Fermé")}</span></p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {days.map(([k, fr, en]) => <li key={k} className={`flex justify-between gap-6 ${k === todayKey ? "font-semibold text-primary-foreground" : "text-primary-foreground/70"}`}><span>{isEn ? en : fr}</span><span>{fmt(hours[k])}</span></li>)}
                  </ul>
                </div>
              );
            })()}<div className="mt-8 flex flex-wrap gap-4">{phone && <a href={`tel:${phone}`} onClick={() => trackBusinessEvent(data.business_id, "phone_click", { subtype: "showcase" })} className="inline-flex items-center gap-2 border border-primary-foreground/30 px-5 py-3"><Phone className="h-4 w-4"/>{isEn ? "Call" : "Appeler"}</a>}{email && <a href={`mailto:${email}`} onClick={() => trackBusinessEvent(data.business_id, "email_click", { subtype: "showcase" })} className="inline-flex items-center gap-2 border border-primary-foreground/30 px-5 py-3"><Mail className="h-4 w-4"/>Email</a>}</div></div>
            {b.latitude && b.longitude && <iframe title={isEn ? "Location map" : "Carte d’accès"} src={`https://www.google.com/maps?q=${b.latitude},${b.longitude}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[420px] w-full border-0 lg:h-full lg:min-h-[560px]" />}
          </section>
        </main>

        <section aria-label={isEn ? "Weather" : "Météo"} className="bg-showcase-night pb-6 pt-2">
          <WidgetFrame
            src={`https://oneworldmorocco.com/embed/weather?city=${encodeURIComponent(b.city || "Marrakech")}&lang=${language}&layout=footer`}
            title={isEn ? "Weather" : "Météo"}
            height={80}
            heightMessage="owm-weather-height"
            className="w-full bg-transparent"
          />
        </section>

        <footer className="bg-showcase-night px-6 py-8 text-center text-xs text-primary-foreground/50"><Link to={`/fiche/${slug}`} className="hover:text-primary-foreground">Powered by <span className="font-semibold">One World Morocco</span></Link></footer>

        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-showcase-line bg-showcase-paper p-2 md:hidden">
          {hasBooking ? (
            <Button onClick={openAvailability} className="rounded-none"><CalendarDays className="h-4 w-4" />{isEn ? "Book" : "Réserver"}</Button>
          ) : (
            <Button onClick={() => scrollToId("location")} className="rounded-none"><Phone className="h-4 w-4" />{isEn ? "Contact" : "Contact"}</Button>
          )}
          {waLink && <a href={waLink} target="_blank" rel="noreferrer" onClick={() => trackBusinessEvent(data.business_id, "whatsapp_click", { subtype: "showcase_sticky" })} className="flex h-10 items-center justify-center gap-2 bg-whatsapp px-3 text-sm font-semibold text-whatsapp-foreground"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        </div>

        <Button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-label={isEn ? `Open ${assistantName}` : `Ouvrir ${assistantName}`}
          className="fixed right-4 top-1/4 z-[80] h-auto origin-right -translate-y-1/2 -rotate-90 rounded-b-none rounded-t-lg px-5 py-3 font-josefin text-xs font-semibold uppercase shadow-xl md:px-6"
        >
          {assistantName}
        </Button>

        <div
          aria-hidden={!assistantOpen}
          onClick={() => setAssistantOpen(false)}
          className={`fixed inset-0 z-[81] bg-showcase-night/55 transition-opacity duration-300 ${assistantOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={assistantName}
          aria-hidden={!assistantOpen}
          className={`fixed inset-y-0 right-0 z-[82] flex w-full flex-col bg-showcase-paper shadow-2xl transition-transform duration-300 ease-out md:w-[70vw] ${assistantOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <iframe
            ref={assistantFrameRef}
            src={`/embed/ask/${slug}?theme=light&lang=${language}&bg=transparent&card=F7F1E8&panel=1&name=${encodeURIComponent(assistantName)}`}
            title={`${assistantName} — ${b.name}`}
            allow="clipboard-write; geolocation; microphone"
            loading="lazy"
            className="h-full w-full flex-1 border-0 bg-showcase-paper"
          />
        </aside>
      </div>

      {openDoc && (
        <div className="fixed inset-0 z-[90]">
          <DocumentOverlay url={openDoc.url} name={openDoc.name || menuLabel} type={openDoc.type} ts={openDoc.ts} onClose={() => setOpenDoc(null)} />
        </div>
      )}
      {welcomeOpen && welcomePopup && (() => { const d = welcomePopup.d; const wp = { url: welcomePopup.url, title: (isEn ? d.title_en || d.title_fr || d.title : d.title_fr || d.title) || null, html: (isEn ? d.description_en || d.description_fr || d.description : d.description_fr || d.description) || null }; return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-showcase-night/75 p-3 backdrop-blur-sm sm:p-6" onClick={() => setWelcomeOpen(false)}>
          <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-cover bg-center shadow-2xl md:max-w-xl" style={{ backgroundImage: `url(${wp.url})` }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setWelcomeOpen(false)} aria-label={isEn ? "Close" : "Fermer"} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-showcase-night/60 text-showcase-paper hover:bg-showcase-night/80">
              <X className="h-5 w-5" />
            </button>
            {(wp.title || wp.html) ? (
              <>
                <div className="pointer-events-none absolute inset-0 bg-showcase-night/55" />
                <div className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-14 text-showcase-paper">
                  {wp.title && <h2 className="mb-4 pr-10 font-josefin text-3xl font-semibold leading-tight md:text-4xl">{wp.title}</h2>}
                  {wp.html && <div className="prose prose-invert max-w-none text-base leading-relaxed [&_*]:!text-showcase-paper [&_a]:underline [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold" dangerouslySetInnerHTML={{ __html: wp.html }} />}
                </div>
              </>
            ) : (
              <img src={wp.url} alt={b.name} className="block max-h-[calc(100dvh-1.5rem)] w-full object-contain" />
            )}
          </div>
        </div>
      ); })()}
      {inlineLink && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-showcase-night">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="truncate font-josefin text-lg text-showcase-paper">{inlineLink.label}</p>
            <button type="button" onClick={() => setInlineLink(null)} aria-label={isEn ? "Close" : "Fermer"} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-showcase-paper transition hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          <iframe src={inlineLink.url} title={inlineLink.label} className="h-full w-full flex-1 border-0 bg-white" />
        </div>
      )}
      {reserveOverlayOpen && reserveUrl && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-showcase-night">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="truncate font-josefin text-lg text-showcase-paper">{primaryCta}</p>
            <button
              type="button"
              onClick={() => setReserveOverlayOpen(false)}
              aria-label={isEn ? "Close" : "Fermer"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-showcase-paper transition hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <iframe src={reserveUrl} title={primaryCta} className="h-full w-full flex-1 border-0 bg-white" />
        </div>
      )}
    </>
  );
};

export default ShowcaseSite;
