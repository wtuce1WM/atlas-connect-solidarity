import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type Promotion = {
  id: string;
  title: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_ar: string | null;
  promotion_message: string | null;
  promotion_message_fr: string | null;
  promotion_message_en: string | null;
  promotion_message_ar: string | null;
  savings_amount: number | null;
  promotion_currency: string | null;
  promotion_type: string | null;
  promotion_value: number | null;
};

interface Props {
  businessId: string | null | undefined;
  cardsHidden?: boolean;
}

const ROTATE_MS = 10000;

const pickLocalized = (p: Promotion, lang: string, field: "title" | "promotion_message") => {
  const key = `${field}_${lang}` as keyof Promotion;
  const val = (p[key] as string | null) ?? null;
  return val || (p[`${field}_fr` as keyof Promotion] as string | null) || (p[field] as string | null) || "";
};

const BusinessPromotionsList = ({ businessId, cardsHidden }: Props) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [index, setIndex] = useState(0);
  const { language } = useLanguage();
  const lang = (language || "fr").toLowerCase();

  useEffect(() => {
    if (!businessId) {
      setPromotions([]);
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

  if (promotions.length === 0 || cardsHidden) return null;

  const multiple = promotions.length > 1;

  return (
    <div className="w-full mx-auto mt-3 mb-2 flex flex-col items-center">
      <div className="relative w-full">
        {promotions.map((p, i) => {
          const active = i === index;
          const localizedTitle = pickLocalized(p, lang, "title");
          const localizedMessage = pickLocalized(p, lang, "promotion_message");
          const maxWClass = localizedMessage ? "max-w-[90%]" : "max-w-[60%]";
          const positionClass = i === 0 ? "relative" : "absolute inset-0";
          return (
            <div className={`${positionClass} w-full flex justify-center`} key={p.id}>
            <div
              aria-hidden={!active}
              key={active ? `active-${index}` : `inactive-${p.id}`}
              className={`w-fit ${maxWClass} rounded-xl border border-white/40 p-3 text-left transition-all duration-700 ease-out overflow-hidden ${active ? "btn-flash-auto" : ""} ${
                active ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-[0.97] pointer-events-none"
              }`}
              style={{
                gridArea: "1 / 1",
                background: "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 100%)",
                backdropFilter: "blur(18px) saturate(180%)",
                WebkitBackdropFilter: "blur(18px) saturate(180%)",
                boxShadow:
                  "inset 0 1px 0 0 rgba(255,255,255,0.6), inset 0 -1px 0 0 rgba(255,255,255,0.15), 0 8px 24px -8px rgba(0,0,0,0.25), 0 2px 6px -2px rgba(192,79,23,0.15)",
              }}
            >
              {/* Liquid glass highlight */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0))" }}
              />
              {(() => {
                const promoAmount = (() => {
                  if (p.promotion_type === "percentage" && p.promotion_value != null) {
                    return `-${p.promotion_value}%`;
                  }
                  if (p.promotion_type === "fixed" && p.promotion_value != null) {
                    return `-${p.promotion_value} ${p.promotion_currency || "MAD"}`;
                  }
                  if (p.savings_amount != null) {
                    return `-${p.savings_amount} ${p.promotion_currency || "MAD"}`;
                  }
                  return null;
                })();

                return (
                  <div className="relative flex items-center justify-between gap-3">
                    <div
                      className="text-[14px] font-bold text-neutral-900 leading-snug"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {p.title}
                    </div>
                    {promoAmount && (
                      <div
                        className="shrink-0 text-[22px] font-black text-[#C04F17] whitespace-nowrap leading-none"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {promoAmount}
                      </div>
                    )}
                  </div>
                );
              })()}
              {p.promotion_message && (
                <div
                  className="relative mt-1.5 prose prose-sm max-w-none text-[13px] leading-relaxed text-neutral-700 prose-headings:text-neutral-900 prose-headings:font-bold prose-strong:text-neutral-900 prose-a:text-[#C04F17] prose-a:underline [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_img]:rounded-md [&_img]:max-w-full [&_h2]:text-[14px] [&_h3]:text-[13px] [&_blockquote]:border-l-2 [&_blockquote]:border-[#C04F17]/40 [&_blockquote]:pl-3 [&_blockquote]:italic"
                  dangerouslySetInnerHTML={{ __html: p.promotion_message }}
                />
              )}
            </div>
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
