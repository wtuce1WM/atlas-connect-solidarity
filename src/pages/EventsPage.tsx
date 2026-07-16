import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  hook: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  images: string[] | null;
  logo_url: string | null;
  city_id: string | null;
  url: string | null;
  url_cta: string | null;
  url_force_external: boolean | null;
  recurrence: string | null;
  days_of_week: string[] | null;
  type: string | null;
  default_business_id: string | null;
}

interface CityRow { id: string; name_fr: string | null }

const DAY_LABELS: Record<string, string> = {
  mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim",
  monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche",
};

function formatEventDate(ev: EventRow): string {
  if (ev.recurrence || (ev.days_of_week && ev.days_of_week.length)) {
    const days = (ev.days_of_week || []).map((d) => DAY_LABELS[d.toLowerCase()] || d).join(", ");
    return days ? `Récurrent · ${days}` : "Récurrent";
  }
  if (!ev.start_date) return "";
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (ev.end_date && ev.end_date !== ev.start_date) {
    return `${fmt(ev.start_date)} → ${fmt(ev.end_date)}`;
  }
  const time = ev.start_time ? ` · ${ev.start_time}` : "";
  return `${fmt(ev.start_date)}${time}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [cityById, setCityById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: evData } = await supabase
        .from("events")
        .select("id, name, hook, description, start_date, end_date, start_time, end_time, images, logo_url, city_id, url, url_cta, url_force_external, recurrence, days_of_week, type, default_business_id")
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("sort_order", { ascending: true })
        .order("start_date", { ascending: true, nullsFirst: false })
        .limit(200);
      const evs = (evData || []) as EventRow[];
      setEvents(evs);

      const cityIds = [...new Set(evs.map((e) => e.city_id).filter(Boolean) as string[])];
      if (cityIds.length) {
        const { data: cityData } = await supabase.from("destinations").select("id, name_fr").in("id", cityIds);
        setCityById(new Map(((cityData || []) as CityRow[]).map((c) => [c.id, c.name_fr || ""])));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Helmet>
        <title>Événements & sorties au Maroc | ONE WORLD MOROCCO</title>
        <meta name="description" content="Concerts, festivals, marchés et sorties récurrentes sélectionnés à Marrakech, Essaouira et partout au Maroc." />
        <link rel="canonical" href="https://oneworldmorocco.com/events" />
        <meta property="og:title" content="Événements & sorties au Maroc | ONE WORLD MOROCCO" />
        <meta property="og:url" content="https://oneworldmorocco.com/events" />
      </Helmet>

      <header className="px-6 pt-10 pb-6 max-w-6xl mx-auto">
        <h1 className="font-[Montserrat] text-3xl md:text-4xl font-bold text-[#1a1a1a]">
          Événements & sorties au Maroc
        </h1>
        <p className="mt-3 text-[#5a5a5a] font-[Avenir,Nunito_Sans,sans-serif] max-w-2xl">
          Concerts, festivals, marchés et rendez-vous récurrents sélectionnés par ONE WORLD MOROCCO — à Marrakech, Essaouira et au-delà.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-black/5 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-[#5a5a5a]">Aucun événement à venir pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => {
              const image = ev.images?.[0] || ev.logo_url || "/images/og-image.jpg";
              const city = ev.city_id ? cityById.get(ev.city_id) : null;
              const dateLabel = formatEventDate(ev);
              const isExternal = ev.url_force_external && ev.url;
              const href = isExternal
                ? ev.url!
                : ev.default_business_id
                  ? `/search?openBusiness=${ev.default_business_id}`
                  : `/search?q=${encodeURIComponent(ev.name)}`;
              const linkProps = isExternal
                ? { href, target: "_blank" as const, rel: "noopener noreferrer" }
                : null;

              const Card = (
                <article className="group block overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-black/5">
                    <img
                      src={image}
                      alt={ev.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h2 className="font-[Montserrat] text-lg font-semibold text-[#1a1a1a] line-clamp-2">
                      {ev.name}
                    </h2>
                    {ev.hook && (
                      <p className="mt-1 text-sm text-[#5a5a5a] line-clamp-2 font-[Avenir,Nunito_Sans,sans-serif]">
                        {ev.hook}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-1.5 text-xs text-[#5a5a5a]">
                      {dateLabel && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {dateLabel}
                        </span>
                      )}
                      {city && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> {city}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );

              return linkProps ? (
                <a key={ev.id} {...linkProps} className="block">{Card}</a>
              ) : (
                <Link key={ev.id} to={href} className="block">{Card}</Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
