import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Promotion = {
  id: string;
  title: string;
  promotion_message: string | null;
  savings_amount: number | null;
  promotion_currency: string | null;
};

interface Props {
  businessId: string | null | undefined;
}

const BusinessPromotionsList = ({ businessId }: Props) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    if (!businessId) {
      setPromotions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("affiliate_business_promotions")
        .select("id, title, promotion_message, savings_amount, promotion_currency")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      if (!cancelled) setPromotions((data as Promotion[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (promotions.length === 0) return null;

  const multiple = promotions.length > 1;

  return (
    <div className="w-full px-3 md:px-4 mt-3 mb-2">
      <div
        className={
          multiple
            ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex flex-col gap-3"
        }
      >
        {promotions.map((p) => (
          <div
            key={p.id}
            className={`${
              multiple ? "snap-start shrink-0 w-[85%] sm:w-[60%] md:w-[320px]" : "w-full"
            } rounded-xl border border-[#C04F17]/40 bg-white/70 backdrop-blur-sm p-3 text-left shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="text-[14px] font-bold text-neutral-900 leading-snug"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {p.title}
              </div>
              {p.savings_amount != null && (
                <div
                  className="shrink-0 text-[11px] font-black text-[#C04F17] whitespace-nowrap"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  −{p.savings_amount} {p.promotion_currency || "MAD"}
                </div>
              )}
            </div>
            {p.promotion_message && (
              <div
                className="mt-1.5 text-[13px] leading-relaxed text-neutral-700 [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: p.promotion_message }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessPromotionsList;
