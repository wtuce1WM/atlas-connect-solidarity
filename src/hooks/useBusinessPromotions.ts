import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BusinessPromotion = {
  id: string;
  title: string;
  promotion_message: string | null;
  savings_amount: number | null;
  promotion_currency: string | null;
  promotion_type: string | null;
  promotion_value: number | null;
};

export function useBusinessPromotions(businessId: string | null | undefined) {
  const [promotions, setPromotions] = useState<BusinessPromotion[]>([]);

  useEffect(() => {
    if (!businessId) {
      setPromotions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("affiliate_business_promotions")
        .select("id, title, promotion_message, savings_amount, promotion_currency, promotion_type, promotion_value")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      if (!cancelled) {
        setPromotions((data as BusinessPromotion[]) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return promotions;
}
