import HScroll from "@/components/HScroll";
import BusinessMap from "@/components/BusinessMap";
import { resolveShowcaseGroupLayout } from "./groupLayout";
import "./groupCards.css";

interface GroupMember {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
  logo_url: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export default function ShowcaseGroupCards({ members, title, layout, display, siteSlug }: {
  members: GroupMember[];
  title: string;
  layout?: string;
  display?: string;
  siteSlug: string;
}) {
  if (display === "map") {
    const pins = members.filter((m) => m.latitude != null && m.longitude != null)
      .map((m) => ({ id: m.id, name: m.name, city: m.city || "", latitude: m.latitude!, longitude: m.longitude!, images: m.images, logo_url: m.logo_url, slug: m.slug }));
    return (
      <div className="mt-10 overflow-hidden rounded-lg" aria-label={title}>
        <BusinessMap businesses={pins} height="480px"
          onBusinessClick={(b: any) => window.open(`/fiche/${b.slug}`, "_blank", "noopener")} />
      </div>
    );
  }
  const stacked = resolveShowcaseGroupLayout(layout) === "stacking_cards";
  const cards = members.map((member) => {
    const image = member.images?.[0] || member.logo_url;
    return (
      <a key={member.id} href={`/site/${siteSlug}/${member.slug}`}
        className={stacked ? "showcase-group-stack-card" : "w-64 shrink-0 text-left md:w-80"}>
        <div className={stacked ? "showcase-group-stack-image" : "h-40 overflow-hidden rounded-lg bg-showcase-night md:h-48"}>
          {image && <img src={image} alt={member.name} loading="lazy" draggable={false} className="h-full w-full object-cover" />}
        </div>
        <p className={stacked ? "showcase-group-stack-name" : "mt-3 font-josefin text-lg font-semibold leading-snug line-clamp-2"}>{member.name}</p>
      </a>
    );
  });

  return stacked
    ? <div className="showcase-group-stack" aria-label={title}>{cards}</div>
    : <HScroll className="scrollbar-hide mt-10 flex gap-4 overflow-x-auto pb-3 cursor-grab md:gap-6" aria-label={title}>{cards}</HScroll>;
}