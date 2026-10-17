import "./groupCards.css";

export default function ShowcaseMapFrame({ slug, language, title, memberIds }: {
  slug: string;
  language: string;
  title: string;
  memberIds?: string[];
}) {
  const params = new URLSearchParams({ lang: language, bg: "F7F1E8", fit: "w" });
  if (memberIds) params.set("members", memberIds.join(","));
  return (
    <div className="showcase-map-frame">
      <iframe
        src={`/embed/nearby/${slug}?${params}`}
        className="showcase-map-iframe"
        title={title}
        loading="lazy"
        allow="geolocation"
      />
    </div>
  );
}