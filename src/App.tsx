import { useState, useEffect, lazy, Suspense } from "react";
import "@/hooks/useRecentlyViewedBusinesses"; // register global track-business-view listener
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import FloatingSearchBar from "@/components/FloatingSearchBar";
import StaffRouteGuard from "@/components/StaffRouteGuard";
import FloatingClubButton from "@/components/FloatingClubButton";
import FloatingWhatsAppButton from "@/components/FloatingWhatsAppButton";
import Index from "./pages/Index";
import BusinessDetail from "./pages/BusinessDetail";
import CityMap from "./pages/CityMap";
import CategoryPage from "./pages/CategoryPage";
import ServicePage from "./pages/ServicePage";
import SearchPage from "./pages/SearchPage";
import StaffLogin from "./pages/StaffLogin";
import StaffBackoffice from "./pages/StaffBackoffice";
import StaffHub from "./pages/StaffHub";
import StaffCRM from "./pages/StaffCRM";
import AffiliatesLogin from "./pages/AffiliatesLogin";
import AffiliatesResetPassword from "./pages/AffiliatesResetPassword";
import AffiliatesDashboard from "./pages/AffiliatesDashboard";
import AffiliatePresence from "./pages/AffiliatePresence";
import BecomeAffiliate from "./pages/BecomeAffiliate";
import Mission from "./pages/Mission";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import EssaouiraSeaView from "./pages/EssaouiraSeaView";
import BlogAnimations from "./pages/BlogAnimations";
import BlogTypography from "./pages/BlogTypography";
import BlogBrummellTypography from "./pages/BlogBrummellTypography";
import RatedBusinesses from "./pages/RatedBusinesses";
import NeighborhoodPage from "./pages/NeighborhoodPage";
import AllBusinessesMap from "./pages/AllBusinessesMap";
import SubcategoryPage from "./pages/SubcategoryPage";
import NotFound from "./pages/NotFound";
import AncienAccueil from "./pages/AncienAccueil";
import HotelSearch from "./pages/HotelSearch";
import Club from "./pages/Club";
import ScrollToTop from "./components/ScrollToTop";
import RouteTransition from "./components/RouteTransition";
const LogoEffectsDemo = lazy(() => import("./pages/LogoEffectsDemo"));
const AIEffectsDemo = lazy(() => import("./pages/AIEffectsDemo"));
import CGF from "./pages/CGF";
import SearchAnalytics from "./pages/SearchAnalytics";
const StaffMaster = lazy(() => import("./pages/StaffMaster"));
import StaffB2B from "./pages/StaffB2B";
import DestinationPage from "./pages/DestinationPage";
import SearchLayoutDemo from "./pages/SearchLayoutDemo";
import SearchPageCopy from "./pages/SearchPageCopy";
import StrictModePage from "./pages/StrictModePage";
import IconPreview from "./pages/IconPreview";
import BlogPresentation from "./pages/BlogPresentation";
import BlogPresentationFR from "./pages/BlogPresentationFR";
import Unsubscribe from "./pages/Unsubscribe";
import CarouselNavDemo from "./pages/CarouselNavDemo";

const queryClient = new QueryClient();

const GlobalFloatingSearchBar = () => {
  const location = useLocation();
  // Hide on home page and staff/affiliate backoffice pages
  const hiddenPaths = ["/", "/search", "/staff/login", "/staff/backoffice", "/staff/catalogue", "/staff/crm", "/staff/master", "/staff/b2b", "/affiliates", "/affiliates/dashboard", "/affiliates/presence", "/search-analytics"];
  if (hiddenPaths.includes(location.pathname)) return null;
  return <FloatingSearchBar />;
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <RouteTransition>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/business/:slug" element={<BusinessDetail />} />
              <Route path="/city/:city" element={<CityMap />} />
              <Route path="/category/:categoryName" element={<CategoryPage />} />
              <Route path="/service/*" element={<ServicePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff/backoffice" element={<StaffHub />} />
              <Route path="/staff/catalogue" element={<StaffBackoffice />} />
              <Route path="/staff/crm" element={<StaffCRM />} />
              <Route path="/staff/master" element={<StaffRouteGuard><StaffMaster /></StaffRouteGuard>} />
              <Route path="/staff/b2b" element={<StaffB2B />} />
              <Route path="/affiliates" element={<AffiliatesLogin />} />
              <Route path="/affiliates/reset-password" element={<AffiliatesResetPassword />} />
              <Route path="/affiliates/dashboard" element={<AffiliatesDashboard />} />
              <Route path="/affiliates/presence" element={<AffiliatePresence />} />
              <Route path="/devenir-affilie" element={<BecomeAffiliate />} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/essaouira-vue-mer" element={<EssaouiraSeaView />} />
              <Route path="/staff/animations" element={<StaffRouteGuard><BlogAnimations /></StaffRouteGuard>} />
              <Route path="/staff/carousel-nav-demo" element={<StaffRouteGuard><CarouselNavDemo /></StaffRouteGuard>} />
              <Route path="/blog/ancien-accueil" element={<AncienAccueil />} />
              <Route path="/blog/typographie" element={<BlogTypography />} />
              <Route path="/staff/brummell" element={<StaffRouteGuard><BlogBrummellTypography /></StaffRouteGuard>} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/staff/etablissements-notes" element={<StaffRouteGuard><RatedBusinesses /></StaffRouteGuard>} />
              <Route path="/neighborhood/:neighborhood" element={<NeighborhoodPage />} />
              <Route path="/carte" element={<AllBusinessesMap />} />
              <Route path="/subcategory/:subcategoryName" element={<SubcategoryPage />} />
              <Route path="/hotels" element={<HotelSearch />} />
              <Route path="/club" element={<Club />} />
              <Route path="/staff/demo-effects" element={<StaffRouteGuard><Suspense fallback={null}><LogoEffectsDemo /></Suspense></StaffRouteGuard>} />
              <Route path="/search-analytics" element={<SearchAnalytics />} />
              <Route path="/destination/:destinationName" element={<DestinationPage />} />
              <Route path="/conditions-generales" element={<CGF />} />
              <Route path="/staff/search-layouts" element={<StaffRouteGuard><SearchLayoutDemo /></StaffRouteGuard>} />
              <Route path="/blog/search-copy" element={<SearchPageCopy />} />
              <Route path="/staff/mode-strict" element={<StaffRouteGuard><StrictModePage /></StaffRouteGuard>} />
              <Route path="/staff/ai-effects" element={<StaffRouteGuard><Suspense fallback={null}><AIEffectsDemo /></Suspense></StaffRouteGuard>} />
              <Route path="/blog/icon-preview" element={<IconPreview />} />
              <Route path="/staff/presentation" element={<StaffRouteGuard><BlogPresentation /></StaffRouteGuard>} />
              <Route path="/staff/presentation-fr" element={<StaffRouteGuard><BlogPresentationFR /></StaffRouteGuard>} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RouteTransition>
          <GlobalFloatingSearchBar />
          <FloatingClubButton isOpen={activePanel === "club"} onToggle={() => setActivePanel(activePanel === "club" ? null : "club")} />
          <FloatingWhatsAppButton isOpen={activePanel === "whatsapp"} onToggle={() => setActivePanel(activePanel === "whatsapp" ? null : "whatsapp")} />
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
