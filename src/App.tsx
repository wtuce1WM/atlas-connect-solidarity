import { useState, useEffect, lazy, Suspense } from "react";
import "@/hooks/useRecentlyViewedBusinesses"; // register global track-business-view listener
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const TooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
const FloatingSearchBar = lazy(() => import("@/components/FloatingSearchBar"));
const StaffRouteGuard = lazy(() => import("@/components/StaffRouteGuard"));
const FloatingClubButton = lazy(() => import("@/components/FloatingClubButton"));
const FloatingWhatsAppButton = lazy(() => import("@/components/FloatingWhatsAppButton"));
import ScrollToTop from "./components/ScrollToTop";
import RouteTransition from "./components/RouteTransition";
const Index = lazy(() => import("./pages/Index"));
const BusinessDetail = lazy(() => import("./pages/BusinessDetail"));
const CityMap = lazy(() => import("./pages/CityMap"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const StaffBackoffice = lazy(() => import("./pages/StaffBackoffice"));
const StaffHub = lazy(() => import("./pages/StaffHub"));
const StaffCRM = lazy(() => import("./pages/StaffCRM"));
const StaffFront = lazy(() => import("./pages/StaffFront"));
const AffiliatesLogin = lazy(() => import("./pages/AffiliatesLogin"));
const AffiliatesResetPassword = lazy(() => import("./pages/AffiliatesResetPassword"));
const AffiliatesDashboard = lazy(() => import("./pages/AffiliatesDashboard"));
const AffiliatePresence = lazy(() => import("./pages/AffiliatePresence"));
const BecomeAffiliate = lazy(() => import("./pages/BecomeAffiliate"));
const Mission = lazy(() => import("./pages/Mission"));
const Contact = lazy(() => import("./pages/Contact"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const EssaouiraSeaView = lazy(() => import("./pages/EssaouiraSeaView"));
const MarrakechArtisanat5Jours = lazy(() => import("./pages/MarrakechArtisanat5Jours"));
const MarrakechActivitesEnfants = lazy(() => import("./pages/MarrakechActivitesEnfants"));
const BlogAnimations = lazy(() => import("./pages/BlogAnimations"));
const BlogTypography = lazy(() => import("./pages/BlogTypography"));
const BlogBrummellTypography = lazy(() => import("./pages/BlogBrummellTypography"));
const RatedBusinesses = lazy(() => import("./pages/RatedBusinesses"));
const NeighborhoodPage = lazy(() => import("./pages/NeighborhoodPage"));
const AllBusinessesMap = lazy(() => import("./pages/AllBusinessesMap"));
const SubcategoryPage = lazy(() => import("./pages/SubcategoryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AncienAccueil = lazy(() => import("./pages/AncienAccueil"));
const HotelSearch = lazy(() => import("./pages/HotelSearch"));
const Club = lazy(() => import("./pages/Club"));
const LogoEffectsDemo = lazy(() => import("./pages/LogoEffectsDemo"));
const AIEffectsDemo = lazy(() => import("./pages/AIEffectsDemo"));
const CGF = lazy(() => import("./pages/CGF"));
const Corporate = lazy(() => import("./pages/Corporate"));
const SearchAnalytics = lazy(() => import("./pages/SearchAnalytics"));
const StaffMaster = lazy(() => import("./pages/StaffMaster"));
const StaffB2B = lazy(() => import("./pages/StaffB2B"));
const DestinationPage = lazy(() => import("./pages/DestinationPage"));
const SearchLayoutDemo = lazy(() => import("./pages/SearchLayoutDemo"));

const StrictModePage = lazy(() => import("./pages/StrictModePage"));
const IconPreview = lazy(() => import("./pages/IconPreview"));
const BlogPresentation = lazy(() => import("./pages/BlogPresentation"));
const BlogPresentationFR = lazy(() => import("./pages/BlogPresentationFR"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const CarouselNavDemo = lazy(() => import("./pages/CarouselNavDemo"));
const FicheImmersive = lazy(() => import("./pages/FicheImmersive"));
const Test = lazy(() => import("./pages/Home"));
const HomeMindtrip = lazy(() => import("./pages/HomeMindtrip"));
const Install = lazy(() => import("./pages/Install"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div
    aria-hidden="true"
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#faf8f5",
      fontFamily: "'Josefin Sans', system-ui, sans-serif",
      fontSize: "14px",
      letterSpacing: "0.15em",
      color: "#8a7c6f",
    }}
  >
    ONE WORLD MOROCCO
  </div>
);

const renderLazyRoute = (page: JSX.Element) => <Suspense fallback={<RouteFallback />}>{page}</Suspense>;

const BusinessRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/fiche/${slug}`} replace />;
};

const GlobalFloatingSearchBar = () => {
  const location = useLocation();
  // Hide on home page and staff/affiliate backoffice pages
  const hiddenPaths = ["/", "/corporate", "/club", "/install", "/search", "/test", "/videos", "/staff/login", "/staff/backoffice", "/staff/catalogue", "/staff/crm", "/staff/master", "/staff/b2b", "/staff/front", "/affiliates", "/affiliates/dashboard", "/affiliates/presence", "/search-analytics"];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith("/blog")) return null;
  return <Suspense fallback={null}><FloatingSearchBar /></Suspense>;
};
const FloatingButtonsGuard = ({ activePanel, setActivePanel }: { activePanel: "club" | "whatsapp" | null; setActivePanel: (v: "club" | "whatsapp" | null) => void }) => {
  const location = useLocation();
  if (location.pathname.startsWith("/staff/")) return null;
  const isHome = location.pathname === "/";
  const noFloating = ["/corporate", "/club", "/install"].includes(location.pathname);
  const isBlog = location.pathname.startsWith("/blog");
  const hideClub = location.pathname === "/test" || location.pathname === "/videos" || isHome || noFloating || isBlog;
  const hideWhatsapp = isHome || noFloating;
  if (hideClub && hideWhatsapp) return null;
  return (
    <Suspense fallback={null}>
      {!hideClub && <FloatingClubButton isOpen={activePanel === "club"} onToggle={() => setActivePanel(activePanel === "club" ? null : "club")} />}
      {!hideWhatsapp && <FloatingWhatsAppButton isOpen={activePanel === "whatsapp"} onToggle={() => setActivePanel(activePanel === "whatsapp" ? null : "whatsapp")} />}
    </Suspense>
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
      <Suspense fallback={null}>
        <TooltipProvider>
          <Suspense fallback={null}><Toaster /></Suspense>
          <Suspense fallback={null}><Sonner /></Suspense>
          <BrowserRouter>
          <ScrollToTop />
          <RouteTransition>
            <Routes>
              <Route path="/" element={renderLazyRoute(<HomeMindtrip />)} />
              <Route path="/videos" element={renderLazyRoute(<Test />)} />
              <Route path="/ancien-index" element={renderLazyRoute(<Index />)} />
              <Route path="/business/:slug" element={<BusinessRedirect />} />
              <Route path="/city/:city" element={renderLazyRoute(<CityMap />)} />
              <Route path="/category/:categoryName" element={renderLazyRoute(<CategoryPage />)} />
              <Route path="/service/*" element={renderLazyRoute(<ServicePage />)} />
              <Route path="/search" element={renderLazyRoute(<SearchPage />)} />
              <Route path="/staff/login" element={renderLazyRoute(<StaffLogin />)} />
              <Route path="/staff/backoffice" element={renderLazyRoute(<StaffHub />)} />
              <Route path="/staff/catalogue" element={renderLazyRoute(<StaffBackoffice />)} />
              <Route path="/staff/crm" element={renderLazyRoute(<StaffCRM />)} />
              <Route path="/staff/master" element={<StaffRouteGuard>{renderLazyRoute(<StaffMaster />)}</StaffRouteGuard>} />
              <Route path="/staff/b2b" element={renderLazyRoute(<StaffB2B />)} />
              <Route path="/staff/front" element={<StaffRouteGuard>{renderLazyRoute(<StaffFront />)}</StaffRouteGuard>} />
              <Route path="/affiliates" element={renderLazyRoute(<AffiliatesLogin />)} />
              <Route path="/affiliates/reset-password" element={renderLazyRoute(<AffiliatesResetPassword />)} />
              <Route path="/affiliates/dashboard" element={renderLazyRoute(<AffiliatesDashboard />)} />
              <Route path="/affiliates/presence" element={renderLazyRoute(<AffiliatePresence />)} />
              <Route path="/devenir-affilie" element={renderLazyRoute(<BecomeAffiliate />)} />
              <Route path="/mission" element={renderLazyRoute(<Mission />)} />
              <Route path="/contact" element={renderLazyRoute(<Contact />)} />
              <Route path="/blog" element={renderLazyRoute(<Blog />)} />
              <Route path="/blog/essaouira-vue-mer" element={renderLazyRoute(<EssaouiraSeaView />)} />
              <Route path="/blog/5-jours-marrakech-artisanat" element={renderLazyRoute(<MarrakechArtisanat5Jours />)} />
              <Route path="/blog/activites-enfants-marrakech" element={renderLazyRoute(<MarrakechActivitesEnfants />)} />
              <Route path="/staff/animations" element={<StaffRouteGuard>{renderLazyRoute(<BlogAnimations />)}</StaffRouteGuard>} />
              <Route path="/staff/carousel-nav-demo" element={<StaffRouteGuard>{renderLazyRoute(<CarouselNavDemo />)}</StaffRouteGuard>} />
              <Route path="/blog/ancien-accueil" element={renderLazyRoute(<AncienAccueil />)} />
              <Route path="/blog/typographie" element={renderLazyRoute(<BlogTypography />)} />
              <Route path="/staff/brummell" element={<StaffRouteGuard>{renderLazyRoute(<BlogBrummellTypography />)}</StaffRouteGuard>} />
              <Route path="/blog/:slug" element={renderLazyRoute(<BlogPost />)} />
              <Route path="/staff/etablissements-notes" element={<StaffRouteGuard>{renderLazyRoute(<RatedBusinesses />)}</StaffRouteGuard>} />
              <Route path="/neighborhood/:neighborhood" element={renderLazyRoute(<NeighborhoodPage />)} />
              <Route path="/carte" element={renderLazyRoute(<AllBusinessesMap />)} />
              <Route path="/subcategory/:subcategoryName" element={renderLazyRoute(<SubcategoryPage />)} />
              <Route path="/hotels" element={renderLazyRoute(<HotelSearch />)} />
              <Route path="/club" element={renderLazyRoute(<Club />)} />
              <Route path="/staff/demo-effects" element={<StaffRouteGuard>{renderLazyRoute(<LogoEffectsDemo />)}</StaffRouteGuard>} />
              <Route path="/search-analytics" element={renderLazyRoute(<SearchAnalytics />)} />
              <Route path="/destination/:destinationName" element={renderLazyRoute(<DestinationPage />)} />
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
              <Route path="/corporate" element={renderLazyRoute(<Corporate />)} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={renderLazyRoute(<NotFound />)} />
            </Routes>
          </RouteTransition>
          <GlobalFloatingSearchBar />
          <FloatingButtonsGuard activePanel={activePanel} setActivePanel={setActivePanel} />
        </BrowserRouter>
      </TooltipProvider>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
