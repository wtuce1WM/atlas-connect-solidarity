import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import BusinessDetail from "./pages/BusinessDetail";
import CityMap from "./pages/CityMap";
import CategoryPage from "./pages/CategoryPage";
import ServicePage from "./pages/ServicePage";
import SearchPage from "./pages/SearchPage";
import StaffLogin from "./pages/StaffLogin";
import StaffBackoffice from "./pages/StaffBackoffice";
import AffiliatesLogin from "./pages/AffiliatesLogin";
import AffiliatesDashboard from "./pages/AffiliatesDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isRTL } = useLanguage();
  
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-arabic" : ""}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/business/:id" element={<BusinessDetail />} />
            <Route path="/city/:city" element={<CityMap />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/service/:serviceName" element={<ServicePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/backoffice" element={<StaffBackoffice />} />
            <Route path="/affiliates" element={<AffiliatesLogin />} />
            <Route path="/affiliates/dashboard" element={<AffiliatesDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
