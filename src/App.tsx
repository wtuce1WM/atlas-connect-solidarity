import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import FloatingSearchBar from "@/components/FloatingSearchBar";
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
import AffiliatesLogin from "./pages/AffiliatesLogin";
import AffiliatesResetPassword from "./pages/AffiliatesResetPassword";
import AffiliatesDashboard from "./pages/AffiliatesDashboard";
import BecomeAffiliate from "./pages/BecomeAffiliate";
import Mission from "./pages/Mission";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import EssaouiraSeaView from "./pages/EssaouiraSeaView";
import BlogAnimations from "./pages/BlogAnimations";
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
import LogoEffectsDemo from "./pages/LogoEffectsDemo";
import CGF from "./pages/CGF";

const queryClient = new QueryClient();

const GlobalFloatingSearchBar = () => {
  const location = useLocation();
  // Hide on home page and staff/affiliate backoffice pages
  const hiddenPaths = ["/", "/search", "/staff/login", "/staff/backoffice", "/affiliates", "/affiliates/dashboard"];
  if (hiddenPaths.includes(location.pathname)) return null;
  return <FloatingSearchBar />;
};

const AppContent = () => {
  const [activePanel, setActivePanel] = useState<"club" | "whatsapp" | null>(null);
  const { isRTL } = useLanguage();
  
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
              <Route path="/business/:id" element={<BusinessDetail />} />
              <Route path="/city/:city" element={<CityMap />} />
              <Route path="/category/:categoryName" element={<CategoryPage />} />
              <Route path="/service/*" element={<ServicePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff/backoffice" element={<StaffBackoffice />} />
              <Route path="/affiliates" element={<AffiliatesLogin />} />
              <Route path="/affiliates/reset-password" element={<AffiliatesResetPassword />} />
              <Route path="/affiliates/dashboard" element={<AffiliatesDashboard />} />
              <Route path="/devenir-affilie" element={<BecomeAffiliate />} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/essaouira-vue-mer" element={<EssaouiraSeaView />} />
              <Route path="/blog/animations" element={<BlogAnimations />} />
              <Route path="/blog/ancien-accueil" element={<AncienAccueil />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/etablissements-notes" element={<RatedBusinesses />} />
              <Route path="/neighborhood/:neighborhood" element={<NeighborhoodPage />} />
              <Route path="/carte" element={<AllBusinessesMap />} />
              <Route path="/subcategory/:subcategoryName" element={<SubcategoryPage />} />
              <Route path="/hotels" element={<HotelSearch />} />
              <Route path="/club" element={<Club />} />
              <Route path="/demo-effects" element={<LogoEffectsDemo />} />
              <Route path="/conditions-generales" element={<CGF />} />
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
