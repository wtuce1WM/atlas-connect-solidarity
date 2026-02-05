 import { useState } from "react";
 import { Search, Star, MapPin, Calendar, Users, Loader2, MessageSquare, ThumbsUp } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useLanguage } from "@/contexts/LanguageContext";
 import { useToast } from "@/hooks/use-toast";
 import { format, addDays } from "date-fns";
 
 interface Review {
   review_id?: string;
   reviewer: {
     name: string;
     profile_picture?: string;
     local_guide?: boolean;
     reviews_count?: number;
   };
   rating: number;
   date: string;
   text: string;
   likes?: number;
   owner_response?: string | null;
 }
 
 interface SearchResult {
   success: boolean;
   place_name: string;
   place_address?: string;
   average_rating?: number;
   reviews: Review[];
   total_reviews: number;
   has_more?: boolean;
 }
 
 const GoogleHotelReviews = () => {
   const [location, setLocation] = useState("");
   const [checkIn, setCheckIn] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
   const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 9), "yyyy-MM-dd"));
   const [adults, setAdults] = useState(2);
   const [isLoading, setIsLoading] = useState(false);
   const [result, setResult] = useState<SearchResult | null>(null);
   const { t } = useLanguage();
   const { toast } = useToast();
 
   const handleSearch = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!location.trim()) {
       toast({
         title: t("googleReviews.error"),
         description: t("googleReviews.locationRequired"),
         variant: "destructive",
       });
       return;
     }
 
     setIsLoading(true);
     setResult(null);
 
     try {
       const { data, error } = await supabase.functions.invoke("google-hotel-reviews", {
         body: { 
           location: `Hotels in ${location}`, 
           check_in: checkIn, 
           check_out: checkOut,
           adults,
           reviews_sort_by: "most_relevant"
         },
       });
 
       if (error) {
         throw error;
       }
 
       setResult(data);
     } catch (error: any) {
       console.error("Google hotel search error:", error);
       toast({
         title: t("googleReviews.error"),
         description: error.message || t("googleReviews.searchFailed"),
         variant: "destructive",
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const renderStars = (rating: number) => {
     return Array.from({ length: 5 }, (_, i) => (
       <Star
         key={i}
         className={`h-4 w-4 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
       />
     ));
   };
 
   const hasResults = result && result.success && result.reviews && result.reviews.length > 0;
 
   return (
     <section className="bg-background py-20">
       <div className="container mx-auto px-4">
         <div className="mb-12 text-center">
           <h2 className="mb-4 text-4xl font-bold text-foreground">
             {t("googleReviews.title")} <span className="text-primary">{t("googleReviews.titleHighlight")}</span>
           </h2>
           <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
             {t("googleReviews.description")}
           </p>
         </div>
 
         <form onSubmit={handleSearch} className="mx-auto mb-8 max-w-4xl">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
             <div className="lg:col-span-2">
               <label className="mb-1 block text-sm font-medium text-foreground">
                 <MapPin className="mr-1 inline h-4 w-4" />
                 {t("googleReviews.locationLabel")}
               </label>
               <input
                 type="text"
                 placeholder={t("googleReviews.locationPlaceholder")}
                 value={location}
                 onChange={(e) => setLocation(e.target.value)}
                 className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
               />
             </div>
             <div>
               <label className="mb-1 block text-sm font-medium text-foreground">
                 <Calendar className="mr-1 inline h-4 w-4" />
                 {t("googleReviews.checkIn")}
               </label>
               <input
                 type="date"
                 value={checkIn}
                 onChange={(e) => setCheckIn(e.target.value)}
                 className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
               />
             </div>
             <div>
               <label className="mb-1 block text-sm font-medium text-foreground">
                 <Calendar className="mr-1 inline h-4 w-4" />
                 {t("googleReviews.checkOut")}
               </label>
               <input
                 type="date"
                 value={checkOut}
                 onChange={(e) => setCheckOut(e.target.value)}
                 className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
               />
             </div>
             <div>
               <label className="mb-1 block text-sm font-medium text-foreground">
                 <Users className="mr-1 inline h-4 w-4" />
                 {t("googleReviews.adults")}
               </label>
               <select
                 value={adults}
                 onChange={(e) => setAdults(Number(e.target.value))}
                 className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
               >
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                   <option key={num} value={num}>{num}</option>
                 ))}
               </select>
             </div>
           </div>
           <div className="mt-4 flex justify-center">
             <button
               type="submit"
               disabled={isLoading}
               className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
             >
               {isLoading ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
               ) : (
                 <Search className="h-5 w-5" />
               )}
               {t("googleReviews.searchButton")}
             </button>
           </div>
         </form>
 
         {hasResults && (
           <div className="mx-auto max-w-4xl">
             {/* Hotel Card */}
             <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-lg">
               <h3 className="mb-2 text-2xl font-bold text-foreground">{result.place_name}</h3>
               {result.place_address && (
                 <p className="mb-3 flex items-center gap-1 text-muted-foreground">
                   <MapPin className="h-4 w-4" />
                   {result.place_address}
                 </p>
               )}
               {result.average_rating && (
                 <div className="flex items-center gap-2">
                   <div className="flex">{renderStars(result.average_rating)}</div>
                   <span className="font-semibold text-foreground">{result.average_rating}</span>
                   <span className="text-muted-foreground">({result.reviews.length} {t("googleReviews.reviewsCount")})</span>
                 </div>
               )}
             </div>
 
             {/* Reviews Section */}
             <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
               <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground">
                 <MessageSquare className="h-5 w-5 text-primary" />
                 {t("googleReviews.guestReviews")}
               </h4>
               <div className="space-y-4">
                 {result.reviews.map((review, index) => (
                   <div key={review.review_id || index} className="rounded-xl border border-border bg-background p-4">
                     <div className="mb-2 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         {review.reviewer.profile_picture && (
                           <img
                             src={review.reviewer.profile_picture}
                             alt={review.reviewer.name}
                             className="h-10 w-10 rounded-full object-cover"
                           />
                         )}
                         <div>
                           <span className="font-medium text-foreground">{review.reviewer.name}</span>
                           {review.reviewer.local_guide && (
                             <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Local Guide</span>
                           )}
                         </div>
                         <div className="flex">{renderStars(review.rating)}</div>
                       </div>
                       <span className="text-sm text-muted-foreground">{review.date}</span>
                     </div>
                     <p className="mb-2 text-muted-foreground">{review.text}</p>
                     {review.likes !== undefined && review.likes > 0 && (
                       <div className="flex items-center gap-1 text-sm text-muted-foreground">
                         <ThumbsUp className="h-3 w-3" />
                         {review.likes}
                       </div>
                     )}
                     {review.owner_response && (
                       <div className="mt-3 rounded-lg bg-muted/50 p-3">
                         <p className="mb-1 text-xs font-medium text-foreground">{t("googleReviews.hotelResponse")}</p>
                         <p className="text-sm text-muted-foreground">{review.owner_response}</p>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           </div>
         )}
 
         {result && (!result.success || !result.reviews || result.reviews.length === 0) && (
           <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-8 text-center">
             <p className="text-lg text-muted-foreground">{t("googleReviews.noResults")}</p>
           </div>
         )}
       </div>
     </section>
   );
 };
 
 export default GoogleHotelReviews;