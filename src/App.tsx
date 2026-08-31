import { useState, useEffect, lazy, Suspense } from "react";
import "@/hooks/useRecentlyViewedBusinesses"; // register global track-business-view listener
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { stripLangPrefix } from "@/lib/localizedPath";
const FloatingSearchBar = lazy(() => import("@/components/FloatingSearchBar"));
const StaffRouteGuard = lazy(() => import("@/components/StaffRouteGuard"));

const FloatingWhatsAppButton = lazy(() => import("@/components/FloatingWhatsAppButton"));
import ScrollToTop from "./components/ScrollToTop";
import RouteTransition from "./components/RouteTransition";
import AnalyticsTracker from "./components/AnalyticsTracker";
import AuthSessionSentinel from "./components/AuthSessionSentinel";
const CookieBanner = lazy(() => import("./components/CookieBanner"));

import RouteSeo from "./seo/RouteSeo";
import { PageMetaOverridesLoader } from "./seo/usePageMetaOverrides";
import HomeMindtripEager from "./pages/HomeMindtrip";
import HomeV1Eager from "./pages/HomeV1";
import CorporateEager from "./pages/Corporate";
import ClubEager from "./pages/Club";
import JoinEager from "./pages/Join";
const Index = lazy(() => import("./pages/Index"));
const BusinessDetail = lazy(() => import("./pages/BusinessDetail"));
const CityMap = lazy(() => import("./pages/CityMap"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const HashtagResolver = lazy(() => import("./pages/HashtagResolver"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const StaffBackoffice = lazy(() => import("./pages/StaffBackoffice"));
const StaffHub = lazy(() => import("./pages/StaffHub"));
const StaffCRM = lazy(() => import("./pages/StaffCRM"));
const StaffFront = lazy(() => import("./pages/StaffFront"));
const AffiliatesLogin = lazy(() => import("./pages/AffiliatesLogin"));
const AffiliatesResetPassword = lazy(() => import("./pages/AffiliatesResetPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AffiliatesDashboard = lazy(() => import("./pages/AffiliatesDashboard"));
const AffiliatePresence = lazy(() => import("./pages/AffiliatePresence"));
const BecomeAffiliate = lazy(() => import("./pages/BecomeAffiliate"));
const Mission = lazy(() => import("./pages/Mission"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const CGU = lazy(() => import("./pages/CGU"));
const CookiesPage = lazy(() => import("./pages/Cookies"));
const Contact = lazy(() => import("./pages/Contact"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const VideoFeed = lazy(() => import("./pages/VideoFeed"));

const MarrakechArtisanat5Jours = lazy(() => import("./pages/MarrakechArtisanat5Jours"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const MarrakechGaleriesArt = lazy(() => import("./pages/MarrakechGaleriesArt"));
// Template-based blog articles are served dynamically via /blog/:slug from public.blog_posts.
// Only custom-layout articles (MarrakechArtisanat5Jours, MarrakechGaleriesArt) keep their own lazy imports above.
const BlogAnimations = lazy(() => import("./pages/BlogAnimations"));
const BlogTypography = lazy(() => import("./pages/BlogTypography"));
const BlogBrummellTypography = lazy(() => import("./pages/BlogBrummellTypography"));
const RatedBusinesses = lazy(() => import("./pages/RatedBusinesses"));
const NeighborhoodPage = lazy(() => import("./pages/NeighborhoodPage"));
const AllBusinessesMap = lazy(() => import("./pages/AllBusinessesMap"));
const YouTubePage = lazy(() => import("./pages/YouTubePage"));
const SubcategoryPage = lazy(() => import("./pages/SubcategoryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AncienAccueil = lazy(() => import("./pages/AncienAccueil"));
const HotelSearch = lazy(() => import("./pages/HotelSearch"));
const Club = ClubEager;
const LogoEffectsDemo = lazy(() => import("./pages/LogoEffectsDemo"));
const AIEffectsDemo = lazy(() => import("./pages/AIEffectsDemo"));
const CGF = lazy(() => import("./pages/CGF"));
const Corporate = CorporateEager;
const Join = JoinEager;
const SearchAnalytics = lazy(() => import("./pages/SearchAnalytics"));
const StaffMaster = lazy(() => import("./pages/StaffMaster"));
const StaffIA = lazy(() => import("./pages/StaffIA"));
const StaffVideos = lazy(() => import("./pages/StaffVideos"));
const StaffWidgets = lazy(() => import("./pages/StaffWidgets"));
const StaffBlog = lazy(() => import("./pages/StaffBlog"));
const StaffB2B = lazy(() => import("./pages/StaffB2B"));
const StaffTranslations = lazy(() => import("./pages/StaffTranslations"));

const SearchLayoutDemo = lazy(() => import("./pages/SearchLayoutDemo"));

const StrictModePage = lazy(() => import("./pages/StrictModePage"));
const StudioVideo = lazy(() => import("./pages/StudioVideo"));
const Front = lazy(() => import("./pages/Front"));
const IconPreview = lazy(() => import("./pages/IconPreview"));
const BlogPresentation = lazy(() => import("./pages/BlogPresentation"));
const BlogPresentationFR = lazy(() => import("./pages/BlogPresentationFR"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const CarouselNavDemo = lazy(() => import("./pages/CarouselNavDemo"));
const FicheImmersive = lazy(() => import("./pages/FicheImmersive"));
const Test = lazy(() => import("./pages/Home"));
const HomeMindtrip = HomeMindtripEager;
const HomeV1 = HomeV1Eager;
const Install = lazy(() => import("./pages/Install"));
const EmbedAsk = lazy(() => import("./pages/EmbedAsk"));
const EmbedWeather = lazy(() => import("./pages/EmbedWeather"));
const EmbedTides = lazy(() => import("./pages/EmbedTides"));
const EmbedSpotify = lazy(() => import("./pages/EmbedSpotify"));
const EmbedSoundcloud = lazy(() => import("./pages/EmbedSoundcloud"));
const EmbedSubstack = lazy(() => import("./pages/EmbedSubstack"));
const EmbedNearby = lazy(() => import("./pages/EmbedNearby"));
const EmbedArticleMap = lazy(() => import("./pages/EmbedArticleMap"));
const EmbedFiche = lazy(() => import("./pages/EmbedFiche"));

const EmbedReviews = lazy(() => import("./pages/EmbedReviews"));
const EmbedRateUs = lazy(() => import("./pages/EmbedRateUs"));
const VanityResolver = lazy(() => import("./pages/VanityResolver"));
const DestinationResolver = lazy(() => import("./pages/DestinationResolver"));
const YouTubeChannelResolver = lazy(() => import("./pages/YouTubeChannelResolver"));
const PublicClubProfile = lazy(() => import("./pages/PublicClubProfile"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const PublicBusinessProfile = lazy(() => import("./pages/PublicBusinessProfile"));
const Card = lazy(() => import("./pages/Card"));
const ShowcaseSite = lazy(() => import("./pages/ShowcaseSite"));
const Widgets = lazy(() => import("./pages/Widgets"));
const PreviewDiagnostic = lazy(() => import("./pages/PreviewDiagnostic"));

const queryClient = new QueryClient();

const renderLazyRoute = (page: JSX.Element) => <Suspense fallback={null}>{page}</Suspense>;


const BusinessRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
};

const GlobalFloatingSearchBar = () => {
  const location = useLocation();
  // Hide on home page and staff/affiliate backoffice pages
  const hiddenPaths = ["/", "/front", "/corporate", "/club", "/install", "/search", "/test", "/videos", "/staff/login", "/staff/backoffice", "/staff/catalogue", "/staff/crm", "/staff/master", "/staff/ia", "/staff/blog", "/staff/b2b", "/staff/front", "/affiliates", "/affiliates/dashboard", "/affiliates/presence", "/search-analytics"];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith("/blog")) return null;
  return <Suspense fallback={null}><FloatingSearchBar /></Suspense>;
};
const FloatingButtonsGuard = ({ activePanel, setActivePanel }: { activePanel: "club" | "whatsapp" | null; setActivePanel: (v: "club" | "whatsapp" | null) => void }) => {
  const location = useLocation();
  if (location.pathname.startsWith("/staff/")) return null;
  const isHome = location.pathname === "/";
  const noFloating = ["/corporate", "/club", "/install"].includes(location.pathname);
  const hideWhatsapp = isHome || noFloating;
  if (hideWhatsapp) return null;
  return (
    <Suspense fallback={null}>
      <FloatingWhatsAppButton isOpen={activePanel === "whatsapp"} onToggle={() => setActivePanel(activePanel === "whatsapp" ? null : "whatsapp")} />
    </Suspense>
  );
};

const BackofficeBodyFlag = () => {
  const location = useLocation();
  useEffect(() => {
    const isBackoffice =
      location.pathname.startsWith("/staff") ||
      location.pathname.startsWith("/affiliates");
    if (isBackoffice) document.body.setAttribute("data-backoffice", "true");
    else document.body.removeAttribute("data-backoffice");
  }, [location.pathname]);
  return null;
};

const LocalizedRoutes = () => {
  const location = useLocation();
  // Strip /en or /ar prefix so all existing routes match unchanged.
  // Browser URL stays prefixed; only the matcher sees the clean pathname.
  const cleanPathname = stripLangPrefix(location.pathname);
  const routingLocation = cleanPathname === location.pathname
    ? location
    : { ...location, pathname: cleanPathname };

  return (
    <Routes location={routingLocation}>
              <Route path="/" element={renderLazyRoute(<HomeMindtrip />)} />
              <Route path="/home_v1" element={renderLazyRoute(<HomeV1 />)} />
              <Route path="/videos" element={renderLazyRoute(<Test />)} />
              <Route path="/ancien-index" element={renderLazyRoute(<Index />)} />
              <Route path="/business/:slug" element={<BusinessRedirect />} />
              <Route path="/city/:city" element={renderLazyRoute(<CityMap />)} />
              <Route path="/category/:categoryName" element={renderLazyRoute(<CategoryPage />)} />
              <Route path="/service/*" element={renderLazyRoute(<ServicePage />)} />
              <Route path="/search" element={renderLazyRoute(<SearchPage />)} />
              <Route path="/hashtag/:label" element={renderLazyRoute(<HashtagResolver />)} />

              <Route path="/staff/login" element={renderLazyRoute(<StaffLogin />)} />
              <Route path="/staff/backoffice" element={renderLazyRoute(<StaffHub />)} />
              <Route path="/staff/catalogue" element={renderLazyRoute(<StaffBackoffice />)} />
              <Route path="/staff/crm" element={renderLazyRoute(<StaffCRM />)} />
              <Route path="/staff/master" element={<StaffRouteGuard>{renderLazyRoute(<StaffMaster />)}</StaffRouteGuard>} />
              <Route path="/staff/ia" element={<StaffRouteGuard>{renderLazyRoute(<StaffIA />)}</StaffRouteGuard>} />
              <Route path="/staff/blog" element={<Suspense fallback={null}><StaffRouteGuard>{renderLazyRoute(<StaffBlog />)}</StaffRouteGuard></Suspense>} />
              <Route path="/staff/b2b" element={renderLazyRoute(<StaffB2B />)} />
              <Route path="/staff/translations" element={<StaffRouteGuard>{renderLazyRoute(<StaffTranslations />)}</StaffRouteGuard>} />
              <Route path="/staff/front" element={<StaffRouteGuard>{renderLazyRoute(<StaffFront />)}</StaffRouteGuard>} />
              <Route path="/affiliates" element={renderLazyRoute(<AffiliatesLogin />)} />
              <Route path="/affiliates/login" element={renderLazyRoute(<AffiliatesLogin />)} />
              <Route path="/affiliates/reset-password" element={renderLazyRoute(<AffiliatesResetPassword />)} />
              <Route path="/reset-password" element={renderLazyRoute(<ResetPassword />)} />
              <Route path="/affiliates/dashboard" element={renderLazyRoute(<AffiliatesDashboard />)} />
              <Route path="/affiliates/presence" element={renderLazyRoute(<AffiliatePresence />)} />
              <Route path="/devenir-affilie" element={renderLazyRoute(<BecomeAffiliate />)} />
              <Route path="/mission" element={renderLazyRoute(<Mission />)} />
              <Route path="/confidentialite" element={renderLazyRoute(<Confidentialite />)} />
              <Route path="/cgu" element={renderLazyRoute(<CGU />)} />
              <Route path="/cookies" element={renderLazyRoute(<CookiesPage />)} />
              <Route path="/contact" element={renderLazyRoute(<Contact />)} />
              <Route path="/blog" element={renderLazyRoute(<Blog />)} />
              <Route path="/widgets" element={renderLazyRoute(<Widgets />)} />
              <Route path="/staff/backoffice/diagnostic" element={<Suspense fallback={null}><StaffRouteGuard>{renderLazyRoute(<PreviewDiagnostic />)}</StaffRouteGuard></Suspense>} />
              <Route path="/en/widgets" element={renderLazyRoute(<Widgets />)} />
              <Route path="/ar/widgets" element={renderLazyRoute(<Widgets />)} />
              <Route path="/staff/backoffice/videos" element={<Suspense fallback={null}><StaffRouteGuard>{renderLazyRoute(<StaffVideos />)}</StaffRouteGuard></Suspense>} />
              <Route path="/staff/backoffice/widgets" element={<Suspense fallback={null}><StaffRouteGuard>{renderLazyRoute(<StaffWidgets />)}</StaffRouteGuard></Suspense>} />

              {/* Custom-layout blog articles (kept as React components — fetch dynamic data) */}
              <Route path="/blog/5-jours-marrakech-artisanat" element={renderLazyRoute(<MarrakechArtisanat5Jours />)} />
              <Route path="/blog/galeries-art-marrakech" element={renderLazyRoute(<MarrakechGaleriesArt />)} />
              <Route path="/staff/animations" element={<StaffRouteGuard>{renderLazyRoute(<BlogAnimations />)}</StaffRouteGuard>} />
              <Route path="/staff/carousel-nav-demo" element={<StaffRouteGuard>{renderLazyRoute(<CarouselNavDemo />)}</StaffRouteGuard>} />
              <Route path="/blog/ancien-accueil" element={renderLazyRoute(<AncienAccueil />)} />
              <Route path="/blog/typographie" element={renderLazyRoute(<BlogTypography />)} />
              <Route path="/staff/brummell" element={<StaffRouteGuard>{renderLazyRoute(<BlogBrummellTypography />)}</StaffRouteGuard>} />
              <Route path="/blog/:slug" element={renderLazyRoute(<BlogPost />)} />
              <Route path="/blog/etablissements-notes" element={renderLazyRoute(<RatedBusinesses />)} />
              <Route path="/videos/:slug" element={renderLazyRoute(<VideoFeed />)} />
              <Route path="/en/videos/:slug" element={renderLazyRoute(<VideoFeed />)} />
              <Route path="/ar/videos/:slug" element={renderLazyRoute(<VideoFeed />)} />
              <Route path="/neighborhood/:neighborhood" element={renderLazyRoute(<NeighborhoodPage />)} />
              <Route path="/carte" element={renderLazyRoute(<AllBusinessesMap />)} />
              <Route path="/youtube" element={renderLazyRoute(<YouTubePage />)} />
              <Route path="/subcategory/:subcategoryName" element={renderLazyRoute(<SubcategoryPage />)} />
              <Route path="/hotels" element={renderLazyRoute(<HotelSearch />)} />
              <Route path="/club" element={renderLazyRoute(<Club />)} />
              <Route path="/.lovable/oauth/consent" element={renderLazyRoute(<OAuthConsent />)} />
              <Route path="/en/club" element={renderLazyRoute(<Club />)} />
              <Route path="/ar/club" element={renderLazyRoute(<Club />)} />
              <Route path="/staff/demo-effects" element={<StaffRouteGuard>{renderLazyRoute(<LogoEffectsDemo />)}</StaffRouteGuard>} />
              <Route path="/search-analytics" element={renderLazyRoute(<SearchAnalytics />)} />
              <Route path="/destination/:destinationName" element={renderLazyRoute(<DestinationResolver />)} />
              <Route path="/conditions-generales" element={renderLazyRoute(<CGF />)} />
              <Route path="/staff/search-layouts" element={<StaffRouteGuard>{renderLazyRoute(<SearchLayoutDemo />)}</StaffRouteGuard>} />

              <Route path="/staff/mode-strict" element={<StaffRouteGuard>{renderLazyRoute(<StrictModePage />)}</StaffRouteGuard>} />
              <Route path="/staff/ai-effects" element={<StaffRouteGuard>{renderLazyRoute(<AIEffectsDemo />)}</StaffRouteGuard>} />
              <Route path="/blog/icon-preview" element={renderLazyRoute(<IconPreview />)} />
              <Route path="/staff/presentation" element={<StaffRouteGuard>{renderLazyRoute(<BlogPresentation />)}</StaffRouteGuard>} />
              <Route path="/staff/presentation-fr" element={<StaffRouteGuard>{renderLazyRoute(<BlogPresentationFR />)}</StaffRouteGuard>} />
              <Route path="/unsubscribe" element={renderLazyRoute(<Unsubscribe />)} />
              <Route path="/fiche/:slug" element={renderLazyRoute(<FicheImmersive />)} />
              <Route path="/test" element={renderLazyRoute(<Test />)} />
              <Route path="/install" element={renderLazyRoute(<Install />)} />
              <Route path="/en/install" element={renderLazyRoute(<Install />)} />
              <Route path="/ar/install" element={renderLazyRoute(<Install />)} />
              <Route path="/studio-video" element={renderLazyRoute(<StudioVideo />)} />
              <Route path="/front" element={renderLazyRoute(<Front />)} />
              <Route path="/en/studio-video" element={renderLazyRoute(<StudioVideo />)} />
              <Route path="/ar/studio-video" element={renderLazyRoute(<StudioVideo />)} />
              <Route path="/corporate" element={renderLazyRoute(<Corporate />)} />
              <Route path="/en/corporate" element={renderLazyRoute(<Corporate />)} />
              <Route path="/ar/corporate" element={renderLazyRoute(<Corporate />)} />
              <Route path="/join" element={renderLazyRoute(<Join />)} />
              <Route path="/en/join" element={renderLazyRoute(<Join />)} />
              <Route path="/ar/join" element={renderLazyRoute(<Join />)} />
              <Route path="/card" element={renderLazyRoute(<Card />)} />
              <Route path="/en/card" element={renderLazyRoute(<Card />)} />
              <Route path="/ar/card" element={renderLazyRoute(<Card />)} />
              <Route path="/y/:slug" element={renderLazyRoute(<YouTubeChannelResolver />)} />
              <Route path="/u/:pseudo" element={renderLazyRoute(<PublicClubProfile />)} />
              <Route path="/en/u/:pseudo" element={renderLazyRoute(<PublicClubProfile />)} />
              <Route path="/ar/u/:pseudo" element={renderLazyRoute(<PublicClubProfile />)} />
              <Route path="/b/:slug" element={renderLazyRoute(<PublicBusinessProfile />)} />
              <Route path="/site/:slug" element={renderLazyRoute(<ShowcaseSite />)} />
              <Route path="/embed/weather" element={renderLazyRoute(<EmbedWeather />)} />
              <Route path="/embed/tides" element={renderLazyRoute(<EmbedTides />)} />
              <Route path="/embed/spotify/:slug" element={renderLazyRoute(<EmbedSpotify />)} />
              <Route path="/embed/soundcloud/:slug" element={renderLazyRoute(<EmbedSoundcloud />)} />
              <Route path="/embed/substack/:slug" element={renderLazyRoute(<EmbedSubstack />)} />
              <Route path="/embed/nearby/:slug" element={renderLazyRoute(<EmbedNearby />)} />
              <Route path="/embed/article-map/:slug" element={renderLazyRoute(<EmbedArticleMap />)} />

              <Route path="/embed/fiche/:slug" element={renderLazyRoute(<EmbedFiche />)} />

              <Route path="/embed/reviews/:slug" element={renderLazyRoute(<EmbedReviews />)} />
              <Route path="/embed/avis/:slug" element={renderLazyRoute(<EmbedRateUs />)} />
              <Route path="/embed/ask" element={renderLazyRoute(<EmbedAsk />)} />
              <Route path="/embed/ask/:slug" element={renderLazyRoute(<EmbedAsk />)} />
              <Route path="/embed/ask/:embedSlug/article/:slug" element={renderLazyRoute(<BlogPost />)} />
              <Route path="/embed/ask/article/:slug" element={renderLazyRoute(<BlogPost />)} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/events" element={renderLazyRoute(<EventsPage />)} />

              <Route path="/:vanitySlug" element={renderLazyRoute(<VanityResolver />)} />
              <Route path="*" element={renderLazyRoute(<NotFound />)} />
    </Routes>
  );
};

const AppContent = () => {
  const [activePanel, setActivePanel] = useState<"club" | "whatsapp" | null>(null);
  const { isRTL } = useLanguage();

  // Listen for "open-club-panel" custom event (e.g. from BookmarkButton)
  useEffect(() => {
    const handler = () => setActivePanel("club");
    window.addEventListener("open-club-panel", handler);
    return () => window.removeEventListener("open-club-panel", handler);
  }, []);
  
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-arabic" : ""}>
        <TooltipProvider>
          <Suspense fallback={null}><Toaster /></Suspense>
          <Suspense fallback={null}><Sonner /></Suspense>
          <BackofficeBodyFlag />
          <ScrollToTop />
          <AnalyticsTracker />
          <AuthSessionSentinel />
          <RouteSeo />
          <PageMetaOverridesLoader />
          <Suspense fallback={null}><CookieBanner /></Suspense>

          <RouteTransition>
            <LocalizedRoutes />
          </RouteTransition>
          
          <FloatingButtonsGuard activePanel={activePanel} setActivePanel={setActivePanel} />
        </TooltipProvider>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
