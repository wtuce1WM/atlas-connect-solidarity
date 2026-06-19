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

const ROTATE_MS = 5000;

const BusinessPromotionsList = ({ businessId }: Props) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [index, setIndex] = useState(0);

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
      if (!cancelled) {
        setPromotions((data as Promotion[]) ?? []);
        setIndex(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    if (promotions.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % promotions.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [promotions.length]);

  if (promotions.length === 0) return null;

  const multiple = promotions.length > 1;

  return (
    <div className="w-full mt-3 mb-2">
      <div className="relative w-full">
        {promotions.map((p, i) => {
          const active = i === index;
          return (
            <div
              key={p.id}
              aria-hidden={!active}
              className={`${
                i === 0 ? "relative" : "absolute inset-0"
              } rounded-xl border border-[#C04F17]/40 bg-white/70 backdrop-blur-sm p-3 text-left shadow-sm transition-opacity duration-700 ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
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
          );
        })}
      </div>
      {multiple && (
        <div className="mt-2 flex justify-center gap-1.5">
          {promotions.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Offre ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-[#C04F17]" : "w-1.5 bg-neutral-400/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessPromotionsList;
