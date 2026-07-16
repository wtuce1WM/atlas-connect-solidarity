import { defineMcp } from "@lovable.dev/mcp-js";
import searchBusinesses from "./tools/search-businesses";
import getBusiness from "./tools/get-business";
import getBusinessRelations from "./tools/get-business-relations";
import listBusinessesNearPoi from "./tools/list-businesses-near-poi";

export default defineMcp({
  name: "one-world-morocco",
  title: "One World Morocco",
  version: "0.2.0",
  instructions:
    "Public read-only access to the One World Morocco catalog: curated restaurants, hotels, riads, activities and boutiques in Marrakech, Essaouira and across Morocco. Tools: `search_businesses` (free-text search), `get_business` (full details by slug), `get_business_relations` (linked POIs, destinations, events for a business), `list_businesses_near_poi` (businesses tied to a landmark like Jemaa el-Fna or Jardin Majorelle). All data is public — no personal or member data is exposed.",
  tools: [searchBusinesses, getBusiness, getBusinessRelations, listBusinessesNearPoi],
});
