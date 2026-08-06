import SearchResultCard from "@/components/SearchResultCard";
import { useWheelHijackWhenCentered } from "@/hooks/useWheelHijackWhenCentered";

interface Cited {
  id: string;
}

interface Props {
  cited: Cited[];
  aiInlineBusinessPool: any[];
  businessLabelLogos: Record<string, string[]>;
  getDistanceKm: (b: any) => number | undefined;
  onOpen: (full: any) => void;
  onHover: (id: string | null) => void;
  keyPrefix?: string;
  wrapperClassName?: string;
}

export default function CitedBusinessesCarousel({
  cited,
  aiInlineBusinessPool,
  businessLabelLogos,
  getDistanceKm,
  onOpen,
  onHover,
  keyPrefix = "",
  wrapperClassName = "mt-6 -mx-4 sm:mx-0",
}: Props) {
  const ref = useWheelHijackWhenCentered<HTMLDivElement>();

  return (
    <div className={wrapperClassName}>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto px-4 sm:px-0 pb-3 scrollbar-hide"
      >
        {cited.map((b, idx) => {
          const full = aiInlineBusinessPool.find((x: any) => x.id === b.id);
          if (!full) return null;
          return (
            <div key={`${keyPrefix}${b.id}`} className="shrink-0 w-64 sm:w-72">
              <SearchResultCard
                business={{ ...(full as any), engagements: [] }}
                index={idx}
                labelLogos={businessLabelLogos[b.id] || []}
                distanceKm={getDistanceKm(full)}
                onClick={() => onOpen(full)}
                onMouseEnter={() => onHover(b.id)}
                onMouseLeave={() => onHover(null)}
                impressionSurface="carousel"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
