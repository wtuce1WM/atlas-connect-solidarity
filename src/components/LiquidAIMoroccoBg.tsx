import zelligeAsset from "@/assets/zellige2.webp.asset.json";

/**
 * Fond zellige statique — IA × Maroc.
 */
export default function LiquidAIMoroccoBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
    >
      <div
        className="absolute inset-0 bg-center bg-cover opacity-30"
        style={{ backgroundImage: `url(${zelligeAsset.url})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/75 via-background/45 to-background/75" />
    </div>
  );
}
