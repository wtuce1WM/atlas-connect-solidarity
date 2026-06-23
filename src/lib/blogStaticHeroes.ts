// Override images for static blog articles whose hero is NOT a business photo.
// Articles absent from this map fall back to `businesses[0].images[0]` via their bizId.
import ratedHeroAsset from "@/assets/rated-businesses-hero.webp.asset.json";
import essaouiraSunsetAsset from "@/assets/essaouira-sunset-roof.jpg.asset.json";
import essaouiraLobsterAsset from "@/assets/essaouira-lobster-hero.jpg.asset.json";
import ideeCadeauHeroAsset from "@/assets/idee-cadeau-marrakech-hero.jpg.asset.json";

export const STATIC_BLOG_HERO_OVERRIDES: Record<string, string> = {
  "etablissements-notes": ratedHeroAsset.url,
  "hotels-riads-vue-mer-essaouira": essaouiraSunsetAsset.url,
  "manger-fruits-de-mer-essaouira": essaouiraLobsterAsset.url,
  "idee-cadeau-marrakech": ideeCadeauHeroAsset.url,
};
