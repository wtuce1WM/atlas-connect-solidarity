 import { useState } from "react";
 import { Search, ExternalLink, Loader2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useLanguage } from "@/contexts/LanguageContext";
 import { useToast } from "@/hooks/use-toast";
 
 interface HotelSearchResult {
   success: boolean;
   hotel_name: string;
   location: string | null;
   links: {
     booking_com?: string | null;
     expedia?: string | null;
     hotels_com?: string | null;
     agoda?: string | null;
     tripadvisor?: string | null;
     kayak?: string | null;
     priceline?: string | null;
     marriott?: string | null;
     hilton?: string | null;
     ihg?: string | null;
     hyatt?: string | null;
     official_website?: string | null;
   } | null;
   metadata: {
     total_results_found: number;
     platforms_searched: number;
   };
   message: string;
 }
 
 const platformNames: Record<string, string> = {
   booking_com: "Booking.com",
   expedia: "Expedia",
   hotels_com: "Hotels.com",
   agoda: "Agoda",
   tripadvisor: "TripAdvisor",
   kayak: "Kayak",
   priceline: "Priceline",
   marriott: "Marriott",
   hilton: "Hilton",
   ihg: "IHG",
   hyatt: "Hyatt",
   official_website: "Official Website",
 };
 
 const HotelSearch = () => {
   const [hotelName, setHotelName] = useState("");
   const [location, setLocation] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [result, setResult] = useState<HotelSearchResult | null>(null);
   const { t } = useLanguage();
   const { toast } = useToast();
 
   const handleSearch = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!hotelName.trim()) {
       toast({
         title: t("hotel.error"),
         description: t("hotel.nameRequired"),
         variant: "destructive",
       });
       return;
     }
 
     setIsLoading(true);
     setResult(null);
 
     try {
       const { data, error } = await supabase.functions.invoke("hotel-meta-search", {
         body: { hotel_name: hotelName, location: location || undefined },
       });
 
       if (error) {
         throw error;
       }
 
       setResult(data);
     } catch (error: any) {
       console.error("Hotel search error:", error);
       toast({
         title: t("hotel.error"),
         description: error.message || t("hotel.searchFailed"),
         variant: "destructive",
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const availableLinks = result?.links
     ? Object.entries(result.links).filter(([_, url]) => url)
     : [];
 
   return (
     <section className="bg-muted/50 py-20">
       <div className="container mx-auto px-4">
         <div className="mb-12 text-center">
           <h2 className="mb-4 text-4xl font-bold text-foreground">
             {t("hotel.title")} <span className="text-primary">{t("hotel.titleHighlight")}</span>
           </h2>
           <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
             {t("hotel.description")}
           </p>
         </div>
 
         <form onSubmit={handleSearch} className="mx-auto mb-8 max-w-2xl">
           <div className="flex flex-col gap-4 md:flex-row">
             <div className="flex-1">
               <input
                 type="text"
                 placeholder={t("hotel.namePlaceholder")}
                 value={hotelName}
                 onChange={(e) => setHotelName(e.target.value)}
                 className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
               />
             </div>
             <div className="flex-1">
               <input
                 type="text"
                 placeholder={t("hotel.locationPlaceholder")}
                 value={location}
                 onChange={(e) => setLocation(e.target.value)}
                 className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
               />
             </div>
             <button
               type="submit"
               disabled={isLoading}
               className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
             >
               {isLoading ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
               ) : (
                 <Search className="h-5 w-5" />
               )}
               {t("hotel.searchButton")}
             </button>
           </div>
         </form>
 
         {result && (
           <div className="mx-auto max-w-4xl">
             {availableLinks.length > 0 ? (
               <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                 <div className="mb-6 text-center">
                   <h3 className="text-2xl font-bold text-foreground">{result.hotel_name}</h3>
                   {result.location && (
                     <p className="text-muted-foreground">{result.location}</p>
                   )}
                   <p className="mt-2 text-sm text-muted-foreground">
                     {t("hotel.foundOn")} {result.metadata.total_results_found} {t("hotel.platforms")}
                   </p>
                 </div>
 
                 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                   {availableLinks.map(([platform, url]) => (
                     <a
                       key={platform}
                       href={url as string}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-between rounded-lg border border-border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
                     >
                       <span className="font-medium text-foreground">
                         {platformNames[platform] || platform}
                       </span>
                       <ExternalLink className="h-4 w-4 text-muted-foreground" />
                     </a>
                   ))}
                 </div>
               </div>
             ) : (
               <div className="rounded-2xl border border-border bg-card p-8 text-center">
                 <p className="text-lg text-muted-foreground">{t("hotel.noResults")}</p>
               </div>
             )}
           </div>
         )}
       </div>
     </section>
   );
 };
 
 export default HotelSearch;