import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export type BusinessPromotion = {
  id: string;
  title: string;
  promotion_message: string | null;
  savings_amount: number | null;
  promotion_currency: string | null;
  promotion_type: string | null;
  promotion_value: number | null;
};

type Raw = BusinessPromotion & {
  title_fr: string | null;
  title_en: string | null;
  title_ar: string | null;
  promotion_message_fr: string | null;
  promotion_message_en: string | null;
  promotion_message_ar: string | null;
};

export function useBusinessPromotions(businessId: string | null | undefined) {
  const [rows, setRows] = useState<Raw[]>([]);
  const { language } = useLanguage();
  const lang = (language || "fr").toLowerCase();

  useEffect(() => {
    if (!businessId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("affiliate_business_promotions")
        .select("id, title, title_fr, title_en, title_ar, promotion_message, promotion_message_fr, promotion_message_en, promotion_message_ar, savings_amount, promotion_currency, promotion_type, promotion_value")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      if (!cancelled) {
        setRows((data as Raw[]) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const promotions = useMemo<BusinessPromotion[]>(() => {
    const pick = (r: Raw, field: "title" | "promotion_message") => {
      const val = (r as any)[`${field}_${lang}`] as string | null | undefined;
      return val || (r as any)[`${field}_fr`] || (r as any)[field] || "";
    };
    return rows.map((r) => ({
      ...r,
      title: pick(r, "title"),
      promotion_message: pick(r, "promotion_message") || null,
    }));
  }, [rows, lang]);

  return promotions;
}
